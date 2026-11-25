import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ConfiguracionSistema,
  DelegacionPolicial,
  FolioAsignado,
  MemoNota,
  PdfExportOptions,
  SerieNumerario,
  UsuarioSistema,
} from '../../types/police';
import {
  buildUnifiedTiposMemosOptions,
  findFolioForMemo,
  isMemoVisibleForUser,
  isTipoMemoHiddenForUser,
  normalizeTipoKey,
} from '../../utils/memosCatalogUtils';
import {
  formatFileSizeBytes,
  triggerSafeFileDownload,
} from '../../utils/documentExtractUtils';
import {
  requestPdfExport,
  resolveJsPdfFormat,
  resolveJsPdfOrientation,
} from '../../services/pdfExportBus';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { ConfirmModal } from '../common/ConfirmModal';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import { MemoNotaModal } from './MemoNotaModal';
import { MemosTiposVisibilidadModal } from './MemosTiposVisibilidadModal';
import { MemosReporteModal } from './MemosReporteModal';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Download,
  Edit2,
  Trash2,
  Printer,
  Sliders,
  Paperclip,
  BookmarkCheck,
  FileSearch,
  Lock,
  ShieldAlert,
  FileBarChart2,
  BarChart3,
} from 'lucide-react';
import { ModuleStatsPanel, StatChartConfig, StatKpiItem } from '../common/ModuleStatsPanel';
import {
  drawExecutiveKpiStrip,
  drawChartSectionGrid,
  renderBarChartPng,
  renderDonutChartPng,
} from '../../utils/pdfChartUtils';

interface MemosNotasViewProps {
  memosList: MemoNota[];
  seriesList: SerieNumerario[];
  foliosList: FolioAsignado[];
  usuariosList: UsuarioSistema[];
  delegacionesList: DelegacionPolicial[];
  activeDelegacionId: string;
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema | null;
  onSaveMemo: (
    memo: MemoNota,
    options?: { syncControlFolios?: boolean }
  ) => Promise<void> | void;
  onDeleteMemo: (id: string) => Promise<void> | void;
  onSaveConfig: (cfg: ConfiguracionSistema) => Promise<void> | void;
  onSaveUsuario?: (user: UsuarioSistema) => Promise<void> | void;
  onSaveSerie?: (serie: SerieNumerario) => Promise<void> | void;
}

const ESTADO_BADGE_MAP: Record<string, string> = {
  Borrador: 'bg-slate-100 text-slate-700 border-slate-300',
  Emitido: 'bg-blue-50 text-blue-800 border-blue-200',
  Enviado: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Recepcionado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Archivado: 'bg-amber-50 text-amber-800 border-amber-200',
};

function formatFechaAr(ymd?: string): string {
  if (!ymd) return '-';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildContentMatchSnippet(text: string | undefined, query: string): string | null {
  if (!text || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return null;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 70);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ')}${suffix}`;
}

export const MemosNotasView: React.FC<MemosNotasViewProps> = ({
  memosList,
  seriesList,
  foliosList,
  usuariosList,
  delegacionesList,
  activeDelegacionId,
  config,
  currentUser,
  onSaveMemo,
  onDeleteMemo,
  onSaveConfig,
  onSaveUsuario,
  onSaveSerie,
}) => {
  // Permisos granulares verificados en UI (complementados con seguridad en backend)
  const isSuperUser = currentUser?.rol === 'superusuario';
  const hasModuleAccess =
    !currentUser ||
    isSuperUser ||
    (Array.isArray(currentUser.modulosPermitidos) && currentUser.modulosPermitidos.length > 0
      ? currentUser.modulosPermitidos.includes('memos-notas')
      : currentUser.rol === 'Administrador');

  const isSoloLectura = Boolean(
    currentUser?.esSoloLectura ||
      currentUser?.rol === 'Solo Lectura (Auditor / Consulta)'
  );
  const canCreate = !isSoloLectura && (isSuperUser || currentUser?.puedeCrear !== false);
  const canEdit = !isSoloLectura && (isSuperUser || currentUser?.puedeModificar !== false);
  const canDelete = !isSoloLectura && (isSuperUser || currentUser?.puedeEliminar !== false);
  const canExportPdf =
    isSuperUser || currentUser?.accionesPersonalizadas?.puedeExportarPdf !== false;
  const canManageVisibility =
    !isSoloLectura &&
    (isSuperUser ||
      currentUser?.rol === 'Administrador' ||
      Boolean(currentUser?.puedeAdministrarModulos) ||
      Boolean(currentUser?.accionesPersonalizadas?.puedeGestionarUsuarios));

  // Filtros
  const [filtroContenido, setFiltroContenido] = useState('');
  const [filtroNroFolio, setFiltroNroFolio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroAnio, setFiltroAnio] = useState('todos');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroSoloConAdjunto, setFiltroSoloConAdjunto] = useState(false);

  // Modales
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoNota | null>(null);
  const [isTiposModalOpen, setIsTiposModalOpen] = useState(false);
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [mostrarStats, setMostrarStats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemoNota | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
  }>({ isOpen: false, files: [] });

  // Opciones de tipos visibles para el usuario conectado
  const visibleTiposOptions = useMemo(() => {
    const all = buildUnifiedTiposMemosOptions(config, seriesList);
    return all.filter((opt) => !isTipoMemoHiddenForUser(opt, currentUser, undefined, seriesList, config));
  }, [config, seriesList, currentUser]);

  // Registros visibles para el usuario conectado (filtra perfil, tiposMemosOcultos + ocultoParaUsuariosIds)
  const visibleMemos = useMemo(() => {
    return [...memosList]
      .filter((m) => isMemoVisibleForUser(m, currentUser, seriesList, config))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [memosList, currentUser, seriesList, config]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const m of visibleMemos) {
      const y = m.anio || Number((m.fecha || '').slice(0, 4));
      if (Number.isFinite(y) && y > 1900) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [visibleMemos]);

  const filteredMemos = useMemo(() => {
    const qContenido = filtroContenido.trim().toLowerCase();
    const qFolio = filtroNroFolio.trim().toLowerCase();

    return visibleMemos.filter((m) => {
      const mAnio = String(m.anio || (m.fecha || '').slice(0, 4) || '');
      if (qFolio && !(m.nroFolioMemo || '').toLowerCase().includes(qFolio)) {
        return false;
      }
      if (filtroTipo !== 'todos' && normalizeTipoKey(m.tipo) !== normalizeTipoKey(filtroTipo)) {
        return false;
      }
      if (filtroAnio !== 'todos' && mAnio !== filtroAnio) {
        return false;
      }
      if (filtroEstado !== 'todos' && m.estado !== filtroEstado) {
        return false;
      }
      if (filtroFechaDesde && (m.fecha || '') < filtroFechaDesde) {
        return false;
      }
      if (filtroFechaHasta && (m.fecha || '') > filtroFechaHasta) {
        return false;
      }
      const hasAttachment = Boolean(m.archivoDataUrl || (m.adjuntos && m.adjuntos.length > 0));
      if (filtroSoloConAdjunto && !hasAttachment) {
        return false;
      }
      if (qContenido) {
        const extraNames = (m.adjuntos || []).map((a) => `${a.nombre || ''} ${a.contenidoExtraido || ''}`).join(' ');
        const haystack = [
          m.tipo,
          m.nroFolioMemo,
          mAnio,
          m.asunto,
          m.destino,
          m.remitenteArea,
          m.observaciones,
          m.archivoNombre,
          m.contenidoExtraido,
          extraNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(qContenido)) return false;
      }
      return true;
    });
  }, [
    visibleMemos,
    filtroContenido,
    filtroNroFolio,
    filtroTipo,
    filtroAnio,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroEstado,
    filtroSoloConAdjunto,
  ]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filtroContenido.trim()) c++;
    if (filtroNroFolio.trim()) c++;
    if (filtroTipo !== 'todos') c++;
    if (filtroAnio !== 'todos') c++;
    if (filtroFechaDesde) c++;
    if (filtroFechaHasta) c++;
    if (filtroEstado !== 'todos') c++;
    if (filtroSoloConAdjunto) c++;
    return c;
  }, [
    filtroContenido,
    filtroNroFolio,
    filtroTipo,
    filtroAnio,
    filtroFechaDesde,
    filtroFechaHasta,
    filtroEstado,
    filtroSoloConAdjunto,
  ]);

  const handleClearFilters = () => {
    setFiltroContenido('');
    setFiltroNroFolio('');
    setFiltroTipo('todos');
    setFiltroAnio('todos');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroEstado('todos');
    setFiltroSoloConAdjunto(false);
  };

  const buildGalleryForMemo = (m: MemoNota): PreviewAttachmentItem[] => {
    const list: PreviewAttachmentItem[] = [];
    if (m.archivoDataUrl && m.archivoNombre) {
      list.push({
        id: `${m.id}-primary`,
        nombre: m.archivoNombre,
        tipo: m.archivoMimeType,
        dataUrl: m.archivoDataUrl,
      });
    }
    if (Array.isArray(m.adjuntos)) {
      m.adjuntos.forEach((adj, idx) => {
        if (!adj?.dataUrl) return;
        list.push({
          id: adj.id || `${m.id}-extra-${idx}`,
          nombre: adj.nombre,
          tipo: adj.tipo,
          dataUrl: adj.dataUrl,
        });
      });
    }
    return list;
  };

  const handleExportListadoPdf = () => {
    if (!canExportPdf) return;
    requestPdfExport({
      title: 'Registro General de Memos y Notas',
      fileName: `Memos_y_Notas_${new Date().toISOString().split('T')[0]}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: (opts: PdfExportOptions) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(opts.orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(opts.paperSize),
        });
        let y = drawPoliceHeader(doc, config, 'REGISTRO OFICIAL DE MEMOS Y NOTAS');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `Total de documentos incluidos: ${filteredMemos.length}   |   Fecha de emisión: ${formatFechaAr(
            new Date().toISOString().split('T')[0]
          )}`,
          14,
          y
        );
        y += 4;

        const conAnexoFilt = filteredMemos.filter((m) =>
          Boolean(m.archivoDataUrl || (m.adjuntos && m.adjuntos.length > 0))
        ).length;
        const emitidosFilt = filteredMemos.filter(
          (m) => m.estado === 'Emitido' || m.estado === 'Enviado' || m.estado === 'Recepcionado'
        ).length;
        const urgentesFilt = filteredMemos.filter(
          (m) => m.prioridad === 'Urgente' || m.prioridad === 'Alta'
        ).length;

        y = drawExecutiveKpiStrip(doc, y, [
          { label: 'Documentos', value: filteredMemos.length, subtitle: 'Registros visibles filtrados', accentColor: [17, 38, 77] },
          { label: 'Emitidos / Trámite', value: emitidosFilt, subtitle: 'En gestión oficial', accentColor: [29, 78, 216] },
          { label: 'Con Anexo', value: conAnexoFilt, subtitle: 'Word / PDF adjunto', accentColor: [15, 118, 110] },
          { label: 'Prioridad Alta', value: urgentesFilt, subtitle: 'Alta o Urgente', accentColor: [217, 119, 6] },
        ]);

        const byTipoPdf = new Map<string, number>();
        const byEstadoPdf = new Map<string, number>();
        filteredMemos.forEach((m) => {
          const t = m.tipo || 'Otro';
          byTipoPdf.set(t, (byTipoPdf.get(t) || 0) + 1);
          const e = m.estado || 'Sin Estado';
          byEstadoPdf.set(e, (byEstadoPdf.get(e) || 0) + 1);
        });
        const imgTipo = renderBarChartPng(
          Array.from(byTipoPdf.entries()).map(([label, value]) => ({ label, value })),
          { barColor: '#11264d' }
        );
        const imgEstado = renderDonutChartPng(
          Array.from(byEstadoPdf.entries()).map(([label, value]) => ({ label, value })),
          { centerLabel: 'MEMOS' }
        );
        y = drawChartSectionGrid(doc, y, [
          { title: 'Documentos por Tipo / Serie', subtitle: 'Series habilitadas', imageDataUrl: imgTipo },
          { title: 'Distribución por Estado', subtitle: 'Ciclo de tramitación', imageDataUrl: imgEstado },
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Año', 'Tipo / Serie', 'N° Folio / Memo', 'Asunto', 'Destino', 'Estado', 'Anexo']],
          body: filteredMemos.map((m) => [
            formatFechaAr(m.fecha),
            String(m.anio || (m.fecha || '').slice(0, 4) || '-'),
            m.tipo,
            m.nroFolioMemo,
            m.asunto,
            m.destino,
            m.estado,
            m.archivoNombre || (m.adjuntos && m.adjuntos.length > 0 ? `${m.adjuntos.length} adjunto(s)` : 'Sin anexo'),
          ]),
          styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [15, 23, 42] },
          headStyles: { fillColor: [17, 38, 77], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14, bottom: 20 },
        });

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
  };

  const handleExportFichaMemoPdf = (memo: MemoNota) => {
    if (!canExportPdf) return;
    const safeFolio = (memo.nroFolioMemo || memo.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    requestPdfExport({
      title: `Ficha ${memo.tipo} — ${memo.nroFolioMemo}`,
      fileName: `${safeFolio}.pdf`,
      defaultOrientation: 'portrait',
      defaultPaperSize: 'a4',
      buildDoc: (opts: PdfExportOptions) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(opts.orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(opts.paperSize),
        });
        let y = drawPoliceHeader(
          doc,
          config,
          `FICHA DE REGISTRO: ${(memo.tipo || 'MEMO / NOTA').toUpperCase()}`
        );

        const extraAdjCount = memo.adjuntos?.length || 0;
        const anexoResumen = memo.archivoNombre
          ? `${memo.archivoNombre}${extraAdjCount > 0 ? ` (+${extraAdjCount} más)` : ''}`
          : 'Sin archivo adjunto';

        autoTable(doc, {
          startY: y + 2,
          theme: 'grid',
          body: [
            ['Tipo de Documento', memo.tipo || '-', 'N° Folio / Memo', memo.nroFolioMemo || '-'],
            ['Fecha', formatFechaAr(memo.fecha), 'Estado / Prioridad', `${memo.estado} (${memo.prioridad || 'Normal'})`],
            ['Remitente / Área', memo.remitenteArea || config.dependencia || '-', 'Destino', memo.destino || '-'],
            ['Asunto', { content: memo.asunto || '-', colSpan: 3 }],
            ['Archivo(s) Anexo(s)', { content: anexoResumen, colSpan: 3 }],
            ['Observaciones', { content: memo.observaciones || 'Sin observaciones registradas.', colSpan: 3 }],
          ],
          styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42] },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 38 },
            2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 34 },
          },
          margin: { left: 14, right: 14, bottom: 25 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Registrado por: ${memo.usuarioRegistroNombre || 'Sistema'}   |   Delegación: ${memo.delegacionNombre || config.dependencia}`,
          14,
          Math.min(finalY + 8, doc.internal.pageSize.getHeight() - 25)
        );
        doc.setDrawColor(71, 85, 105);
        doc.line(pageWidth - 78, finalY + 26, pageWidth - 16, finalY + 26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Firma y Sello Oficial', pageWidth - 47, finalY + 30.5, { align: 'center' });

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
  };

  if (!hasModuleAccess) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-xl mx-auto mt-8 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-xs text-slate-600">
          Su usuario no posee autorización para acceder al módulo <strong>Memos y Notas</strong>. Solicite habilitación a un Administrador o Superusuario.
        </p>
      </div>
    );
  }

  const conAdjuntosCount = visibleMemos.filter(
    (m) => Boolean(m.archivoDataUrl || (m.adjuntos && m.adjuntos.length > 0))
  ).length;

  const memosStats = useMemo(() => {
    const total = visibleMemos.length;
    const tramitados = visibleMemos.filter(
      (m) => m.estado === 'Emitido' || m.estado === 'Enviado' || m.estado === 'Recepcionado'
    ).length;
    const prioritarios = visibleMemos.filter(
      (m) => m.prioridad === 'Urgente' || m.prioridad === 'Alta'
    ).length;

    const kpis: StatKpiItem[] = [
      {
        label: 'Documentos Visibles',
        value: total,
        detail: `${filteredMemos.length} según filtros`,
        tone: 'navy',
      },
      {
        label: 'Emitidos / Recepcionados',
        value: tramitados,
        detail: 'Documentación cursada',
        tone: 'blue',
      },
      {
        label: 'Con Archivo Anexo',
        value: conAdjuntosCount,
        detail: `${total > 0 ? Math.round((conAdjuntosCount / total) * 100) : 0}% digitalizados`,
        tone: 'emerald',
      },
      {
        label: 'Prioridad Alta / Urgente',
        value: prioritarios,
        detail: 'Atención preferente',
        tone: 'amber',
      },
    ];

    const byTipo = new Map<string, number>();
    const byEstado = new Map<string, number>();
    visibleMemos.forEach((m) => {
      const t = m.tipo || 'Sin Tipo';
      byTipo.set(t, (byTipo.get(t) || 0) + 1);
      const e = m.estado || 'Sin Estado';
      byEstado.set(e, (byEstado.get(e) || 0) + 1);
    });

    const charts: StatChartConfig[] = [
      {
        id: 'memos-tipo',
        title: 'Volumen por Tipo / Serie',
        subtitle: 'Solo series autorizadas para su usuario',
        type: 'bar',
        data: Array.from(byTipo.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        valueLabel: 'Documentos',
        primaryColor: '#11264d',
      },
      {
        id: 'memos-estado',
        title: 'Estado Documental',
        subtitle: 'Proporción por etapa de trámite',
        type: 'donut',
        data: Array.from(byEstado.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      },
    ];

    return { kpis, charts };
  }, [visibleMemos, filteredMemos.length, conAdjuntosCount]);

  return (
    <div className="space-y-4">
      {/* Cabecera Institucional */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-900" />
              <span>Memos y Notas</span>
            </h1>
            {isSoloLectura && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>Solo Lectura</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro, vinculación con Control de Folios, archivo y búsqueda por contenido de Memorándums, Nota V, Notas y anexos (.doc, .docx, .pdf).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarStats((prev) => !prev)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              mostrarStats
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Estadísticas</span>
          </button>

          {canManageVisibility && (
            <button
              type="button"
              onClick={() => setIsTiposModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-800" />
              <span>Tipos y Visibilidad</span>
            </button>
          )}

          {canExportPdf && (
            <>
              <button
                type="button"
                onClick={() => setIsReporteModalOpen(true)}
                className="px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              >
                <FileBarChart2 className="w-3.5 h-3.5 text-indigo-700" />
                <span>Reportes</span>
              </button>

              <button
                type="button"
                onClick={handleExportListadoPdf}
                disabled={filteredMemos.length === 0}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-45 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Exportar PDF</span>
              </button>
            </>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingMemo(null);
                setIsMemoModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Memo / Nota</span>
            </button>
          )}
        </div>
      </div>

      {mostrarStats && (
        <ModuleStatsPanel
          title="Estadísticas de Memos y Notas"
          subtitle="Resumen gráfico sobre tipos y estados habilitados para su perfil"
          kpis={memosStats.kpis}
          charts={memosStats.charts}
          onExportPdf={canExportPdf ? () => setIsReporteModalOpen(true) : undefined}
          exportPdfLabel="Reporte Gráfico (PDF)"
          onClose={() => setMostrarStats(false)}
        />
      )}

      {/* KPIs Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Documentos Visibles</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {visibleMemos.length}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Con Archivo Anexo</div>
            <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              {conAdjuntosCount}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <Paperclip className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Tipos / Series Habilitadas</div>
            <div className="text-xl font-bold text-indigo-800 font-mono tabular-nums mt-0.5">
              {visibleTiposOptions.length}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-800">
            <BookmarkCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Colapsable */}
      <CollapsibleFilterBar
        title="Buscar por Contenido, N° Folio, Año, Fecha o Tipo"
        activeFiltersCount={activeFiltersCount}
        onClear={handleClearFilters}
        summaryRight={
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
            Mostrando {filteredMemos.length} de {visibleMemos.length}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">
              Contenido / Asunto / Destino / Texto del Anexo
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filtroContenido}
                onChange={(e) => setFiltroContenido(e.target.value)}
                placeholder="Buscar palabras dentro del asunto, observaciones o texto del .docx / .pdf..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">N° de Folio / Memo</label>
            <input
              type="text"
              value={filtroNroFolio}
              onChange={(e) => setFiltroNroFolio(e.target.value)}
              placeholder="Ej: 015/2026, Nota V..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tipo / Serie de Folio</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los tipos visibles</option>
              {visibleTiposOptions.map((opt) => (
                <option key={opt.key} value={opt.nombre}>
                  {opt.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Año</label>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los años</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="todos">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Emitido">Emitido</option>
              <option value="Enviado">Enviado</option>
              <option value="Recepcionado">Recepcionado</option>
              <option value="Archivado">Archivado</option>
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 w-full">
              <input
                type="checkbox"
                checked={filtroSoloConAdjunto}
                onChange={(e) => setFiltroSoloConAdjunto(e.target.checked)}
                className="w-4 h-4 accent-blue-900"
              />
              <span className="font-bold text-slate-700">Solo con archivo anexo</span>
            </label>
          </div>
        </div>
      </CollapsibleFilterBar>

      {/* Tabla / Estados vacíos */}
      {visibleMemos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Aún no hay Memos o Notas registrados en esta delegación
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Registre Memorándums, Nota V, Notas u oficios vinculados con Control de Folios y anexe archivos Word (.doc/.docx) o PDF para consultarlos y descargarlos.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingMemo(null);
                setIsMemoModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primer Memo / Nota</span>
            </button>
          )}
        </div>
      ) : filteredMemos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <p className="text-sm font-bold text-slate-800">
            No se encontraron documentos que coincidan con los filtros aplicados
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wide">
                  <th className="px-3.5 py-3 font-bold">Fecha</th>
                  <th className="px-3.5 py-3 font-bold">Tipo</th>
                  <th className="px-3.5 py-3 font-bold">N° Folio / Memo</th>
                  <th className="px-3.5 py-3 font-bold">Asunto & Observaciones</th>
                  <th className="px-3.5 py-3 font-bold">Destino</th>
                  <th className="px-3.5 py-3 font-bold">Anexo</th>
                  <th className="px-3.5 py-3 font-bold">Estado</th>
                  <th className="px-3.5 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMemos.map((memo) => {
                  const gallery = buildGalleryForMemo(memo);
                  const primaryFile = gallery[0] || null;
                  const contentSnippet = filtroContenido.trim()
                    ? buildContentMatchSnippet(memo.contenidoExtraido, filtroContenido)
                    : null;

                  return (
                    <tr key={memo.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="px-3.5 py-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatFechaAr(memo.fecha)}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800 text-[11px]">
                          {memo.serieFolioId && (
                            <BookmarkCheck className="w-3 h-3 text-blue-700" />
                          )}
                          <span>{memo.tipo}</span>
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-mono tabular-nums font-bold text-blue-950 whitespace-nowrap">
                        <div>{memo.nroFolioMemo}</div>
                        <div className="text-[10px] font-medium text-slate-500">
                          Año {memo.anio || (memo.fecha || '').slice(0, 4) || '-'}
                        </div>
                        {(() => {
                          const linkedFolio = findFolioForMemo(memo, foliosList, seriesList);
                          if (!linkedFolio) return null;
                          return (
                            <span
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans text-[10px] font-bold"
                              title={`Ocupando Folio #${linkedFolio.numero} en Control de Folios`}
                            >
                              <BookmarkCheck className="w-3 h-3" />
                              <span>Folio #{linkedFolio.numero} · Control de Folios</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3.5 py-3 min-w-[230px] max-w-sm">
                        <div className="font-bold text-slate-900">{memo.asunto}</div>
                        {memo.remitenteArea && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Origen: {memo.remitenteArea}
                          </div>
                        )}
                        {memo.observaciones && (
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                            {memo.observaciones}
                          </div>
                        )}
                        {contentSnippet && (
                          <div className="mt-1.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-950 flex items-start gap-1">
                            <FileSearch className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>En anexo:</strong> {contentSnippet}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-slate-800 min-w-[140px]">
                        {memo.destino}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {primaryFile ? (
                          <div className="space-y-1">
                            <div
                              className="text-[11px] font-semibold text-slate-800 max-w-[160px] truncate"
                              title={primaryFile.nombre}
                            >
                              {primaryFile.nombre}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {memo.archivoTamanoBytes
                                ? formatFileSizeBytes(memo.archivoTamanoBytes)
                                : ''}
                              {gallery.length > 1 ? ` · +${gallery.length - 1} más` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin anexo</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${
                            ESTADO_BADGE_MAP[memo.estado] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {memo.estado}
                        </span>
                        {memo.prioridad && memo.prioridad !== 'Normal' && (
                          <div
                            className={`text-[10px] font-bold mt-1 ${
                              memo.prioridad === 'Urgente' ? 'text-red-700' : 'text-amber-800'
                            }`}
                          >
                            {memo.prioridad}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {primaryFile && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewGallery({ isOpen: true, files: gallery })
                                }
                                className="p-1.5 rounded-lg text-blue-800 hover:bg-blue-50 cursor-pointer"
                                title="Visualizar archivo anexo"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  triggerSafeFileDownload(
                                    primaryFile.dataUrl,
                                    primaryFile.nombre
                                  )
                                }
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                title="Descargar archivo anexo"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canExportPdf && (
                            <button
                              type="button"
                              onClick={() => handleExportFichaMemoPdf(memo)}
                              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="Imprimir / Vista Previa Ficha PDF"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemo(memo);
                                setIsMemoModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                              title="Editar Memo / Nota"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(memo)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <MemoNotaModal
        isOpen={isMemoModalOpen}
        editingItem={editingMemo}
        currentUser={currentUser}
        config={config}
        seriesList={seriesList}
        foliosList={foliosList}
        memosList={visibleMemos}
        usuariosList={usuariosList}
        activeDelegacionId={activeDelegacionId}
        delegacionesList={delegacionesList}
        onSave={onSaveMemo}
        onSaveConfig={onSaveConfig}
        onSaveUsuario={onSaveUsuario}
        onSaveSerie={onSaveSerie}
        onClose={() => {
          setIsMemoModalOpen(false);
          setEditingMemo(null);
        }}
      />

      <MemosTiposVisibilidadModal
        isOpen={isTiposModalOpen}
        config={config}
        seriesList={seriesList}
        usuariosList={usuariosList}
        currentUser={currentUser}
        activeDelegacionId={activeDelegacionId}
        onSaveConfig={onSaveConfig}
        onSaveUsuario={onSaveUsuario}
        onSaveSerie={onSaveSerie}
        onClose={() => setIsTiposModalOpen(false)}
      />

      <MemosReporteModal
        isOpen={isReporteModalOpen}
        memosList={visibleMemos}
        visibleTiposOptions={visibleTiposOptions}
        config={config}
        onClose={() => setIsReporteModalOpen(false)}
      />

      <FilePreviewModal
        isOpen={previewGallery.isOpen}
        file={previewGallery.files[0] || null}
        files={previewGallery.files}
        initialIndex={0}
        onClose={() => setPreviewGallery({ isOpen: false, files: [] })}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar Memo / Nota"
        message={`¿Confirma eliminar definitivamente "${deleteTarget?.tipo || ''} ${deleteTarget?.nroFolioMemo || ''}" (${deleteTarget?.asunto || ''})?`}
        confirmLabel="Eliminar"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteMemo(deleteTarget.id);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

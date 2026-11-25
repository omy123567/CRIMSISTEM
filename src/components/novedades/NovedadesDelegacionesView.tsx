import React, { useState, useMemo } from 'react';
import {
  AvisoNovedad,
  PrioridadNovedad,
  DelegacionPolicial,
  UsuarioSistema,
  ConfiguracionSistema,
  AdjuntoArchivo,
} from '../../types/police';
import {
  Bell,
  Send,
  AlertTriangle,
  Info,
  Flame,
  CheckCircle2,
  Trash2,
  Building2,
  Search,
  ArrowRight,
  MessageSquare,
  Clock,
  Paperclip,
  Upload,
  Eye,
  FileText,
  X,
  BarChart3,
  Download,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import { ModuleStatsPanel, StatKpiItem, StatChartConfig } from '../common/ModuleStatsPanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import {
  drawExecutiveKpiStrip,
  drawChartSectionGrid,
  renderBarChartPng,
  renderDonutChartPng,
} from '../../utils/pdfChartUtils';

interface NovedadesDelegacionesViewProps {
  novedadesList: AvisoNovedad[];
  delegacionesList: DelegacionPolicial[];
  currentUser?: UsuarioSistema;
  activeDelegacionId: string;
  config: ConfiguracionSistema;
  onCrearNovedad: (novedad: Omit<AvisoNovedad, 'id' | 'createdAt'>) => Promise<void> | void;
  onMarcarLeido?: (id: string) => Promise<void> | void;
  onEliminarNovedad?: (id: string) => Promise<void> | void;
}

export const NovedadesDelegacionesView: React.FC<NovedadesDelegacionesViewProps> = ({
  novedadesList,
  delegacionesList,
  currentUser,
  activeDelegacionId,
  config,
  onCrearNovedad,
  onEliminarNovedad,
}) => {
  // Formulario único según requerimiento estricto:
  // "únicamente debe tener: Mensaje, a quien ira dirigido (Delegacion) o a todos. Prioridad."
  const [mensaje, setMensaje] = useState('');
  const [destinoDelegacionId, setDestinoDelegacionId] = useState<string>('TODAS');
  const [prioridad, setPrioridad] = useState<PrioridadNovedad>('Normal');
  const [adjuntos, setAdjuntos] = useState<AdjuntoArchivo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros de visualización
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('todas');
  const [filtroDestino, setFiltroDestino] = useState<string>('todas');
  const [filtroTipoAviso, setFiltroTipoAviso] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showStats, setShowStats] = useState(false);

  // Confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  // Visor preliminar universal con zoom
  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
    index: number;
  }>({ isOpen: false, files: [], index: 0 });

  const delegacionActual =
    delegacionesList.find((d) => d.id === (currentUser?.delegacionId || activeDelegacionId)) ||
    delegacionesList[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const nuevo: AdjuntoArchivo = {
          id: `nov-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          nombre: file.name,
          tipo: file.type || 'application/octet-stream',
          dataUrl,
          tamanoBytes: file.size,
          fecha: new Date().toISOString().slice(0, 10),
        };
        setAdjuntos((prev) => [...prev, nuevo]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAdjunto = (id: string) => {
    setAdjuntos((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    setIsSubmitting(true);
    try {
      const destinoObj = delegacionesList.find((d) => d.id === destinoDelegacionId);
      const destinoNombre =
        destinoDelegacionId === 'TODAS'
          ? 'Todas las Delegaciones'
          : destinoObj?.nombre || 'Delegación Seleccionada';

      await onCrearNovedad({
        mensaje: mensaje.trim(),
        origenDelegacionId: delegacionActual?.id || 'del-laguna-blanca',
        origenDelegacionNombre: delegacionActual?.nombre || config.dependencia,
        destinatarioDelegacionId: destinoDelegacionId,
        destinoDelegacionId,
        destinoDelegacionNombre: destinoNombre,
        prioridad,
        emisorNombre: currentUser?.apellidoYNombre || currentUser?.username || 'Oficial de Guardia',
        emisorUsername: currentUser?.username || 'usuario',
        fechaHora: new Date().toISOString(),
        tipo: 'comunicado',
        adjuntos: adjuntos.length > 0 ? adjuntos : undefined,
        leidoPor: currentUser?.id ? [currentUser.id] : [],
      });

      setMensaje('');
      setPrioridad('Normal');
      setDestinoDelegacionId('TODAS');
      setAdjuntos([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNovedades = useMemo(() => {
    return novedadesList
      .filter((n) => {
        // Búsqueda por texto
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const match =
            n.mensaje.toLowerCase().includes(term) ||
            (n.origenDelegacionNombre || '').toLowerCase().includes(term) ||
            (n.destinoDelegacionNombre || n.destinatarioDelegacionNombre || '').toLowerCase().includes(term) ||
            (n.emisorNombre || n.usuarioEmisorNombre || n.remitenteUsuarioNombre || '').toLowerCase().includes(term);
          if (!match) return false;
        }

        // Prioridad
        if (filtroPrioridad !== 'todas' && n.prioridad !== filtroPrioridad) return false;

        // Origen
        if (filtroOrigen !== 'todas' && n.origenDelegacionId !== filtroOrigen) return false;

        // Destino
        const targetId = n.destinoDelegacionId || n.destinatarioDelegacionId;
        if (filtroDestino !== 'todas' && targetId !== filtroDestino) return false;

        // Tipo de aviso
        if (filtroTipoAviso !== 'todos' && (n.tipo || 'comunicado') !== filtroTipoAviso) return false;

        // Rango de fechas
        const fechaYmd = (n.fechaHora || n.createdAt || '').slice(0, 10);
        if (fechaDesde && (!fechaYmd || fechaYmd < fechaDesde)) return false;
        if (fechaHasta && (!fechaYmd || fechaYmd > fechaHasta)) return false;

        return true;
      })
      .sort((a, b) =>
        (b.fechaHora || b.createdAt || '').localeCompare(a.fechaHora || a.createdAt || '')
      );
  }, [novedadesList, searchTerm, filtroPrioridad, filtroOrigen, filtroDestino, filtroTipoAviso, fechaDesde, fechaHasta]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filtroPrioridad !== 'todas') count++;
    if (filtroOrigen !== 'todas') count++;
    if (filtroDestino !== 'todas') count++;
    if (filtroTipoAviso !== 'todos') count++;
    if (fechaDesde) count++;
    if (fechaHasta) count++;
    return count;
  }, [searchTerm, filtroPrioridad, filtroOrigen, filtroDestino, filtroTipoAviso, fechaDesde, fechaHasta]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFiltroPrioridad('todas');
    setFiltroOrigen('todas');
    setFiltroDestino('todas');
    setFiltroTipoAviso('todos');
    setFechaDesde('');
    setFechaHasta('');
  };

  const novedadesStats = useMemo(() => {
    const total = filteredNovedades.length;
    const urgentesAltas = filteredNovedades.filter(
      (n) => n.prioridad === 'Urgente' || n.prioridad === 'Alta'
    ).length;
    const conAdjuntos = filteredNovedades.filter((n) => (n.adjuntos?.length || 0) > 0).length;
    const traslados = filteredNovedades.filter((n) => n.tipo === 'traslado_personal').length;

    const prioOrder: PrioridadNovedad[] = ['Urgente', 'Alta', 'Normal', 'Informativa'];
    const porPrioridad = prioOrder
      .map((p) => ({
        name: p,
        value: filteredNovedades.filter((n) => n.prioridad === p).length,
      }))
      .filter((d) => d.value > 0);

    const origenMap = new Map<string, number>();
    filteredNovedades.forEach((n) => {
      const org = n.origenDelegacionNombre?.trim() || 'Delegación Central';
      origenMap.set(org, (origenMap.get(org) || 0) + 1);
    });
    const porOrigen = Array.from(origenMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const kpis: StatKpiItem[] = [
      { label: 'Avisos (Vista)', value: total, detail: `${novedadesList.length} totales`, tone: 'navy' },
      { label: 'Urgentes / Alta', value: urgentesAltas, detail: 'Prioridad elevada', tone: 'rose' },
      { label: 'Con Adjuntos', value: conAdjuntos, detail: 'Documentos o imágenes', tone: 'blue' },
      { label: 'Traslados Personal', value: traslados, detail: 'Notificaciones de pase', tone: 'emerald' },
    ];

    const charts: StatChartConfig[] = [
      {
        id: 'novedades-prioridad',
        title: 'Avisos por Nivel de Prioridad',
        subtitle: 'Clasificación operativa de comunicados',
        type: 'donut',
        data: porPrioridad,
      },
      {
        id: 'novedades-origen',
        title: 'Emisiones por Delegación de Origen',
        subtitle: 'Actividad de comunicación inter-delegaciones',
        type: 'bar',
        data: porOrigen,
        valueLabel: 'Avisos',
        primaryColor: '#11264d',
      },
    ];

    return { total, urgentesAltas, conAdjuntos, traslados, porPrioridad, porOrigen, kpis, charts };
  }, [filteredNovedades, novedadesList.length]);

  const handleExportPdf = () => {
    const fileName = `Novedades_Delegaciones_${new Date().toISOString().slice(0, 10)}.pdf`;
    requestPdfExport({
      title: 'Registro Oficial de Novedades Inter-Delegaciones',
      fileName,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: (opts) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(opts.orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(opts.paperSize),
        });

        let currentY = drawPoliceHeader(
          doc,
          config,
          'REGISTRO OFICIAL DE NOVEDADES Y COMUNICACIONES INTER-DELEGACIONES',
          10
        );

        currentY = drawExecutiveKpiStrip(
          doc,
          currentY + 2,
          [
            { label: 'Total Avisos', value: novedadesStats.total, subtitle: 'Comunicados en vista', accentColor: [17, 38, 77] },
            { label: 'Urgentes / Alta', value: novedadesStats.urgentesAltas, subtitle: 'Atención prioritaria', accentColor: [220, 38, 38] },
            { label: 'Con Adjuntos', value: novedadesStats.conAdjuntos, subtitle: 'Documentación anexa', accentColor: [29, 78, 216] },
            { label: 'Traslados', value: novedadesStats.traslados, subtitle: 'Avisos de pase', accentColor: [15, 118, 110] },
          ],
          14
        );

        currentY = drawChartSectionGrid(
          doc,
          currentY,
          [
            {
              title: 'Distribución por Prioridad',
              subtitle: 'Urgente, Alta, Normal e Informativa',
              imageDataUrl: renderDonutChartPng(
                novedadesStats.porPrioridad.map((d) => ({ label: d.name, value: d.value })),
                { centerLabel: 'AVISOS' }
              ),
            },
            {
              title: 'Comunicados por Delegación Emisora',
              subtitle: 'Volumen emitido por dependencia',
              imageDataUrl: renderBarChartPng(
                novedadesStats.porOrigen.map((d) => ({ label: d.name, value: d.value })),
                { barColor: '#11264d' }
              ),
            },
          ],
          14
        );

        const rows = filteredNovedades.map((n, idx) => [
          idx + 1,
          new Date(n.fechaHora || n.createdAt || Date.now()).toLocaleString('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          n.prioridad,
          n.origenDelegacionNombre || 'Central',
          n.destinoDelegacionNombre || n.destinatarioDelegacionNombre || 'Todas',
          n.emisorNombre || n.remitenteUsuarioNombre || n.usuarioEmisorNombre || 'Sistema',
          n.mensaje,
        ]);

        autoTable(doc, {
          startY: currentY + 2,
          head: [['N°', 'Fecha / Hora', 'Prioridad', 'Origen', 'Destino', 'Emisor', 'Mensaje / Directiva']],
          body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-', '-', 'Sin comunicaciones registradas']],
          theme: 'grid',
          styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [17, 38, 77], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 34 },
            4: { cellWidth: 34 },
            5: { cellWidth: 34 },
            6: { cellWidth: 'auto' },
          },
          didDrawPage: () => {
            drawPoliceFooter(doc, config);
          },
        });

        return doc;
      },
    });
  };

  const getPrioridadBadge = (prio: PrioridadNovedad) => {
    switch (prio) {
      case 'Urgente':
        return {
          bg: 'bg-red-600 text-white border-red-700',
          icon: Flame,
          label: 'Urgente',
        };
      case 'Alta':
        return {
          bg: 'bg-amber-600 text-white border-amber-700',
          icon: AlertTriangle,
          label: 'Prioridad Alta',
        };
      case 'Informativa':
        return {
          bg: 'bg-blue-600 text-white border-blue-700',
          icon: Info,
          label: 'Informativa',
        };
      case 'Normal':
      default:
        return {
          bg: 'bg-slate-700 text-white border-slate-800',
          icon: Bell,
          label: 'Normal',
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-900" />
              <span>Novedades y Comunicaciones Inter-Delegaciones</span>
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono tabular-nums">
              {novedadesList.length} avisos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo oficial para emisión de avisos y directivas operativas entre delegaciones policiales y recepción de notificaciones de traslados de personal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowStats((prev) => !prev)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              showStats
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-slate-900 hover:bg-blue-950 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {showStats && (
        <ModuleStatsPanel
          title="Estadísticas de Novedades Inter-Delegaciones"
          subtitle="Distribución por nivel de prioridad y actividad por delegación emisora"
          kpis={novedadesStats.kpis}
          charts={novedadesStats.charts}
          onExportPdf={handleExportPdf}
          exportPdfLabel="Exportar Novedades + Gráficos (PDF)"
          onClose={() => setShowStats(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Formulario de Emisión (Requerimiento exacto: Mensaje, Dirigido a, Prioridad) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="p-2 bg-blue-900 rounded-lg text-white">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Emitir Nueva Novedad / Aviso</h2>
              <p className="text-[11px] text-slate-500">
                Origen: <strong>{delegacionActual?.nombre || 'Delegación Central'}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Destinatario */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-900" />
                <span>A quién irá dirigido: *</span>
              </label>
              <select
                required
                value={destinoDelegacionId}
                onChange={(e) => setDestinoDelegacionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="TODAS">📢 A todas las Delegaciones (General)</option>
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    🏢 {d.nombre} ({d.ciudad})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Prioridad */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>Prioridad del Aviso: *</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Normal', 'Alta', 'Urgente', 'Informativa'] as PrioridadNovedad[]).map((p) => {
                  const isSelected = prioridad === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridad(p)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? p === 'Urgente'
                            ? 'bg-red-600 text-white border-red-700 shadow-xs'
                            : p === 'Alta'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : p === 'Informativa'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-800 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Mensaje */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-900" />
                <span>Mensaje Oficial / Novedad: *</span>
              </label>
              <textarea
                required
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escriba aquí la novedad, requerimiento pericial, comunicación o directiva para las otras delegaciones..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white resize-y"
              />
            </div>

            {/* 4. Documentos e Imágenes Anexas */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Paperclip className="w-3.5 h-3.5 text-blue-900" />
                  <span>Anexar Documentos / Imágenes ({adjuntos.length})</span>
                </div>
                <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer inline-flex items-center gap-1 text-[11px] transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Adjuntar</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {adjuntos.length > 0 ? (
                <div className="space-y-1.5">
                  {adjuntos.map((adj, idx) => {
                    const isImg =
                      adj.tipo?.startsWith('image/') || adj.dataUrl.startsWith('data:image/');
                    return (
                      <div
                        key={adj.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isImg ? (
                            <img
                              src={adj.dataUrl}
                              alt={adj.nombre}
                              onClick={() =>
                                setPreviewGallery({
                                  isOpen: true,
                                  files: adjuntos.map((a) => ({
                                    id: a.id,
                                    nombre: a.nombre,
                                    tipo: a.tipo,
                                    dataUrl: a.dataUrl,
                                  })),
                                  index: idx,
                                })
                              }
                              className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0 cursor-pointer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                              <FileText className="w-4 h-4 text-rose-600" />
                            </div>
                          )}
                          <span className="truncate font-medium text-slate-700" title={adj.nombre}>
                            {adj.nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewGallery({
                                isOpen: true,
                                files: adjuntos.map((a) => ({
                                  id: a.id,
                                  nombre: a.nombre,
                                  tipo: a.tipo,
                                  dataUrl: a.dataUrl,
                                })),
                                index: idx,
                              })
                            }
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title="Vista preliminar con zoom"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdjunto(adj.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Quitar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Opcional: adjunte notas PDF, imágenes, oficios o circulares.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !mensaje.trim()}
              className="w-full bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Emitir y Notificar a Delegaciones</span>
            </button>
          </form>
        </div>

        {/* Tablero / Feed de Novedades */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barra de Filtros del Feed Plegable */}
          <CollapsibleFilterBar
            title="Filtros de Novedades y Comunicaciones"
            activeFiltersCount={activeFiltersCount}
            onClear={handleClearFilters}
            summaryRight={
              <span>
                Mostrando <strong>{filteredNovedades.length}</strong> de {novedadesList.length} avisos
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por mensaje, emisor o delegación..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 text-xs"
              >
                <option value="todas">Todas las Prioridades</option>
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
                <option value="Normal">Normal</option>
                <option value="Informativa">Informativa</option>
              </select>

              <select
                value={filtroOrigen}
                onChange={(e) => setFiltroOrigen(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
              >
                <option value="todas">Origen: Todas las Delegaciones</option>
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    De: {d.siglas || d.ciudad}
                  </option>
                ))}
              </select>

              <select
                value={filtroDestino}
                onChange={(e) => setFiltroDestino(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
              >
                <option value="todas">Destino: Todos</option>
                <option value="TODAS">General (Todas las Delegaciones)</option>
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    Para: {d.siglas || d.ciudad}
                  </option>
                ))}
              </select>

              <select
                value={filtroTipoAviso}
                onChange={(e) => setFiltroTipoAviso(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
              >
                <option value="todos">Tipo: Todos</option>
                <option value="comunicado">Comunicado Operativo</option>
                <option value="traslado_personal">Traslado de Personal</option>
              </select>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">Desde:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">Hasta:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </CollapsibleFilterBar>

          {/* Listado de Tarjetas */}
          {filteredNovedades.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 text-slate-500 text-xs">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No hay novedades registradas con estos filtros.</p>
              <p className="text-[11px] text-slate-400">
                Utilice el formulario de la izquierda para emitir comunicados a las otras delegaciones.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredNovedades.map((n) => {
                const prioBadge = getPrioridadBadge(n.prioridad);
                const PrioIcon = prioBadge.icon;
                const targetDelId = n.destinoDelegacionId || n.destinatarioDelegacionId;
                const esParaMi =
                  targetDelId === 'TODAS' ||
                  targetDelId === activeDelegacionId ||
                  targetDelId === currentUser?.delegacionId;

                const fechaFormateada = new Date(n.fechaHora || n.createdAt || Date.now()).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={n.id}
                    className={`bg-white rounded-xl border p-4 shadow-2xs space-y-2 transition-all hover:shadow-xs ${
                      n.prioridad === 'Urgente'
                        ? 'border-red-300 bg-red-50/20'
                        : n.tipo === 'traslado_personal'
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${prioBadge.bg}`}
                        >
                          <PrioIcon className="w-3 h-3" />
                          <span>{prioBadge.label}</span>
                        </span>

                        {n.tipo === 'traslado_personal' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            Traslado de Personal
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{fechaFormateada}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onEliminarNovedad && (currentUser?.rol === 'superusuario' || currentUser?.puedeEliminar) && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ isOpen: true, id: n.id })}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar novedad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Origen -> Destino */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-800">{n.origenDelegacionNombre}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span
                        className={`font-bold ${
                          (n.destinoDelegacionId || n.destinatarioDelegacionId) === 'TODAS'
                            ? 'text-blue-900'
                            : 'text-amber-800'
                        }`}
                      >
                        {n.destinoDelegacionNombre || n.destinatarioDelegacionNombre || 'Todas las Delegaciones'}
                      </span>
                    </div>

                    {/* Contenido del mensaje */}
                    <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      {n.mensaje}
                    </p>

                    {/* Documentos e Imágenes Anexas con Vista Previa Zoom */}
                    {n.adjuntos && n.adjuntos.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {n.adjuntos.map((adj, idx) => {
                          const isImg =
                            adj.tipo?.startsWith('image/') ||
                            adj.dataUrl.startsWith('data:image/');
                          const openPreview = () =>
                            setPreviewGallery({
                              isOpen: true,
                              files: (n.adjuntos || []).map((a) => ({
                                id: a.id,
                                nombre: a.nombre,
                                tipo: a.tipo,
                                dataUrl: a.dataUrl,
                              })),
                              index: idx,
                            });

                          return isImg ? (
                            <button
                              key={adj.id}
                              type="button"
                              onClick={openPreview}
                              className="group relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer shrink-0"
                              title={`Ver ${adj.nombre} con zoom`}
                            >
                              <img
                                src={adj.dataUrl}
                                alt={adj.nombre}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </button>
                          ) : (
                            <button
                              key={adj.id}
                              type="button"
                              onClick={openPreview}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold cursor-pointer transition-colors"
                              title="Abrir vista preliminar con zoom"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate max-w-[160px]">{adj.nombre}</span>
                              <Eye className="w-3 h-3 text-blue-700 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>
                        Emitido por: <strong>{n.emisorNombre || n.remitenteUsuarioNombre || n.usuarioEmisorNombre || 'Sistema'}</strong>
                      </span>
                      {esParaMi && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Notificado a su delegación</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmar Eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Aviso / Novedad"
        message="¿Confirma eliminar este comunicado oficial del registro de novedades entre delegaciones?"
        confirmLabel="Eliminar Aviso"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirm.id && onEliminarNovedad) {
            onEliminarNovedad(deleteConfirm.id);
          }
          setDeleteConfirm({ isOpen: false, id: null });
        }}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
      />

      {/* Vista Preliminar con Zoom */}
      <FilePreviewModal
        isOpen={previewGallery.isOpen}
        file={previewGallery.files[previewGallery.index] || null}
        files={previewGallery.files}
        initialIndex={previewGallery.index}
        onClose={() => setPreviewGallery({ isOpen: false, files: [], index: 0 })}
      />
    </div>
  );
};

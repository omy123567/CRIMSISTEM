import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ActaCambioJefe,
  CasoFaltaOficio,
  ConfiguracionSistema,
  DelegacionPolicial,
  ExpedienteJudicial,
  InventarioBien,
  MovilPolicial,
  PdfExportOptions,
  Personal,
  SerieNumerario,
  UsuarioSistema,
} from '../../types/police';
import {
  requestPdfExport,
  resolveJsPdfFormat,
  resolveJsPdfOrientation,
} from '../../services/pdfExportBus';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import {
  drawExecutiveKpiStrip,
  drawChartSectionGrid,
  drawReportFilterBanner,
  renderHorizontalBarChartPng,
  renderDonutChartPng,
} from '../../utils/pdfChartUtils';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { ConfirmModal } from '../common/ConfirmModal';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import { ModuleStatsPanel, StatChartConfig, StatKpiItem } from '../common/ModuleStatsPanel';
import {
  CATEGORIAS_INVENTARIO,
  ESTADOS_CONSERVACION,
  InventarioBienModal,
  SITUACIONES_PATRIMONIALES,
} from './InventarioBienModal';
import { ActaCambioJefeModal } from './ActaCambioJefeModal';
import { CargaMasivaPlanillaModal } from './CargaMasivaPlanillaModal';
import {
  PackageCheck,
  Plus,
  Search,
  BarChart3,
  Download,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  FileSignature,
  Printer,
  AlertTriangle,
  Archive,
  ClipboardList,
  FileText,
} from 'lucide-react';

interface InventarioViewProps {
  bienesList: InventarioBien[];
  actasList: ActaCambioJefe[];
  personalList: Personal[];
  movilesList: MovilPolicial[];
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  seriesNumerarioList: SerieNumerario[];
  delegacionesList: DelegacionPolicial[];
  activeDelegacionId: string;
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema | null;
  onSaveBien: (bien: InventarioBien) => Promise<void> | void;
  onBulkImportBienes: (bienes: InventarioBien[]) => Promise<void> | void;
  onDeleteBien: (id: string) => Promise<void> | void;
  onSaveActa: (acta: ActaCambioJefe) => Promise<void> | void;
  onDeleteActa: (id: string) => Promise<void> | void;
}

type InventarioSubTab = 'bienes' | 'actas';

function formatFechaAr(ymd?: string): string {
  if (!ymd) return '-';
  const parts = String(ymd).slice(0, 10).split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getEstadoConservacionBadge(estado: string): string {
  switch (estado) {
    case 'Muy Bueno':
    case 'Bueno':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Regular':
    case 'En Reparación':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Malo / Deteriorado':
    case 'Fuera de Servicio':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function getSituacionBadge(situacion: string): string {
  switch (situacion) {
    case 'En Uso / Operativo':
    case 'Asignado a Personal':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'En Depósito / Resguardo':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'En Reparación / Taller':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Baja Patrimonial':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function getActaEstadoBadge(estado: string): string {
  switch (estado) {
    case 'Cerrada y Firmada':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Borrador / En Preparación':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Anulada':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  bienesList,
  actasList,
  personalList,
  movilesList,
  expedientesList,
  casosFaltaOficioList,
  seriesNumerarioList,
  delegacionesList,
  activeDelegacionId,
  config,
  currentUser,
  onSaveBien,
  onBulkImportBienes,
  onDeleteBien,
  onSaveActa,
  onDeleteActa,
}) => {
  const isSuperUser = currentUser?.rol === 'superusuario';
  const isSoloLectura = Boolean(
    currentUser?.esSoloLectura || currentUser?.rol === 'Solo Lectura (Auditor / Consulta)'
  );
  const canCreate = !isSoloLectura && (isSuperUser || currentUser?.puedeCrear !== false);
  const canEdit = !isSoloLectura && (isSuperUser || currentUser?.puedeModificar !== false);
  const canDelete = !isSoloLectura && (isSuperUser || currentUser?.puedeEliminar !== false);
  const canExportPdf =
    isSuperUser || currentUser?.accionesPersonalizadas?.puedeExportarPdf !== false;

  const activeDelegacion = useMemo(
    () => delegacionesList.find((d) => d.id === activeDelegacionId),
    [delegacionesList, activeDelegacionId]
  );

  const [subTab, setSubTab] = useState<InventarioSubTab>('bienes');
  const [mostrarStats, setMostrarStats] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; tone: 'success' | 'info' } | null>(
    null
  );

  // Filtros Inventario General
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroConservacion, setFiltroConservacion] = useState('todos');
  const [filtroSituacion, setFiltroSituacion] = useState('todas');
  const [filtroSector, setFiltroSector] = useState('todos');

  // Filtros Actas
  const [actaSearch, setActaSearch] = useState('');
  const [actaEstadoFilter, setActaEstadoFilter] = useState('todos');

  // Modales
  const [isBienModalOpen, setIsBienModalOpen] = useState(false);
  const [editingBien, setEditingBien] = useState<InventarioBien | null>(null);
  const [isActaModalOpen, setIsActaModalOpen] = useState(false);
  const [editingActa, setEditingActa] = useState<ActaCambioJefe | null>(null);
  const [isPlanillaModalOpen, setIsPlanillaModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'bien' | 'acta';
    id: string;
    label: string;
  } | null>(null);

  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
  }>({ isOpen: false, files: [] });

  const sectoresUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const b of bienesList) {
      if (b.ubicacionSector && b.ubicacionSector.trim()) {
        set.add(b.ubicacionSector.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bienesList]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filtroCategoria !== 'todas') count++;
    if (filtroConservacion !== 'todos') count++;
    if (filtroSituacion !== 'todas') count++;
    if (filtroSector !== 'todos') count++;
    return count;
  }, [searchQuery, filtroCategoria, filtroConservacion, filtroSituacion, filtroSector]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFiltroCategoria('todas');
    setFiltroConservacion('todos');
    setFiltroSituacion('todas');
    setFiltroSector('todos');
  };

  // Listas filtradas (declaradas antes de cualquier estadístico derivado para evitar TDZ)
  const filteredBienes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...bienesList]
      .filter((b) => {
        if (filtroCategoria !== 'todas' && b.categoria !== filtroCategoria) return false;
        if (filtroConservacion !== 'todos' && b.estadoConservacion !== filtroConservacion)
          return false;
        if (filtroSituacion !== 'todas' && b.situacionPatrimonial !== filtroSituacion)
          return false;
        if (filtroSector !== 'todos' && b.ubicacionSector !== filtroSector) return false;
        if (!q) return true;
        return (
          (b.nroInventario || '').toLowerCase().includes(q) ||
          (b.denominacion || '').toLowerCase().includes(q) ||
          (b.marcaModelo || '').toLowerCase().includes(q) ||
          (b.nroSerie || '').toLowerCase().includes(q) ||
          (b.ubicacionSector || '').toLowerCase().includes(q) ||
          (b.responsableNombre || '').toLowerCase().includes(q) ||
          (b.observaciones || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.nroInventario || '').localeCompare(b.nroInventario || ''));
  }, [
    bienesList,
    searchQuery,
    filtroCategoria,
    filtroConservacion,
    filtroSituacion,
    filtroSector,
  ]);

  const filteredActas = useMemo(() => {
    const q = actaSearch.trim().toLowerCase();
    return [...actasList]
      .filter((a) => {
        if (actaEstadoFilter !== 'todos' && a.estado !== actaEstadoFilter) return false;
        if (!q) return true;
        return (
          (a.nroActa || '').toLowerCase().includes(q) ||
          (a.tipoCambio || '').toLowerCase().includes(q) ||
          (a.jefeSaliente?.apellidoYNombre || '').toLowerCase().includes(q) ||
          (a.jefeEntrante?.apellidoYNombre || '').toLowerCase().includes(q) ||
          (a.dependenciaNombre || '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          (b.fecha || '').localeCompare(a.fecha || '') ||
          (b.createdAt || '').localeCompare(a.createdAt || '')
      );
  }, [actasList, actaSearch, actaEstadoFilter]);

  // KPIs ejecutivos
  const inventarioStats = useMemo(() => {
    const totalRegistros = filteredBienes.length;
    const totalUnidades = filteredBienes.reduce((acc, b) => acc + (b.cantidad || 1), 0);
    const operativos = filteredBienes.filter(
      (b) =>
        b.situacionPatrimonial === 'En Uso / Operativo' ||
        b.situacionPatrimonial === 'Asignado a Personal'
    ).length;
    const conNovedad = filteredBienes.filter(
      (b) =>
        b.estadoConservacion === 'Malo / Deteriorado' ||
        b.estadoConservacion === 'Fuera de Servicio' ||
        b.estadoConservacion === 'En Reparación' ||
        b.situacionPatrimonial === 'En Reparación / Taller'
    ).length;
    const verificados = filteredBienes.filter((b) => b.verificadoOk).length;
    const bajas = filteredBienes.filter((b) => b.situacionPatrimonial === 'Baja Patrimonial').length;

    const porCategoriaMap = new Map<string, number>();
    const porConservacionMap = new Map<string, number>();
    for (const b of filteredBienes) {
      const cat = b.categoria || 'Otros Bienes';
      porCategoriaMap.set(cat, (porCategoriaMap.get(cat) || 0) + 1);
      const est = b.estadoConservacion || 'Bueno';
      porConservacionMap.set(est, (porConservacionMap.get(est) || 0) + 1);
    }

    const porCategoria = Array.from(porCategoriaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const porConservacion = Array.from(porConservacionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalRegistros,
      totalUnidades,
      operativos,
      conNovedad,
      verificados,
      bajas,
      porCategoria,
      porConservacion,
    };
  }, [filteredBienes]);

  const statsKpis: StatKpiItem[] = useMemo(
    () => [
      {
        label: 'Bienes Inventariados',
        value: inventarioStats.totalRegistros,
        detail: `${inventarioStats.totalUnidades} unidades totales`,
        tone: 'navy',
      },
      {
        label: 'En Uso / Asignados',
        value: inventarioStats.operativos,
        detail: 'Disponibles para servicio',
        tone: 'blue',
      },
      {
        label: 'Verificados Físicamente',
        value: inventarioStats.verificados,
        detail:
          inventarioStats.totalRegistros > 0
            ? `${Math.round((inventarioStats.verificados / inventarioStats.totalRegistros) * 100)}% constatado`
            : 'Sin registros',
        tone: 'emerald',
      },
      {
        label: 'Con Novedad / Taller',
        value: inventarioStats.conNovedad,
        detail: `${inventarioStats.bajas} bajas patrimoniales`,
        tone: inventarioStats.conNovedad > 0 ? 'amber' : 'slate',
      },
    ],
    [inventarioStats]
  );

  const statsCharts: StatChartConfig[] = useMemo(
    () => [
      {
        id: 'inv-categoria',
        title: 'Distribución por Categoría Patrimonial',
        subtitle: 'Cantidad de ítems registrados por rubro',
        type: 'horizontal-bar',
        data: inventarioStats.porCategoria,
        valueLabel: 'Bienes',
        primaryColor: '#11264d',
      },
      {
        id: 'inv-conservacion',
        title: 'Estado de Conservación Física',
        subtitle: 'Condición material declarada',
        type: 'donut',
        data: inventarioStats.porConservacion,
        valueLabel: 'Bienes',
      },
    ],
    [inventarioStats]
  );

  // Importación inteligente sin duplicados desde Móviles, Personal (Armas/Chalecos) y Control de Folios
  const handleImportarDesdeSistema = async () => {
    const existingKeys = new Set(
      bienesList
        .filter((b) => b.origenModulo && b.origenModuloRefId)
        .map((b) => `${b.origenModulo}::${b.origenModuloRefId}`)
    );

    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const year = new Date().getFullYear();

    let nextSeq = 0;
    for (const b of bienesList) {
      const m = String(b.nroInventario || '').match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > nextSeq) nextSeq = n;
      }
    }
    const allocCode = () => {
      nextSeq++;
      return `INV-${year}-${String(nextSeq).padStart(3, '0')}`;
    };

    const nuevos: InventarioBien[] = [];

    // 1. Móviles Policiales
    for (const mov of movilesList) {
      const refKey = `moviles::${mov.id}`;
      if (existingKeys.has(refKey)) continue;
      nuevos.push({
        id: `inv-mov-${mov.id}-${Date.now()}`,
        nroInventario: allocCode(),
        categoria: 'Vehículos y Movilidad',
        denominacion: `${mov.tipo || 'Móvil'} ${mov.nroMovilInterno ? `Interno ${mov.nroMovilInterno}` : ''}`.trim(),
        marcaModelo: `${mov.marca || ''} ${mov.modelo || ''} ${mov.anioModelo ? `(${mov.anioModelo})` : ''}`.trim(),
        nroSerie: mov.dominioPatente ? `Dominio ${mov.dominioPatente}` : undefined,
        cantidad: 1,
        unidad: 'Unidad',
        estadoConservacion:
          mov.condicionGeneral === 'Malo'
            ? 'Malo / Deteriorado'
            : mov.condicionGeneral === 'Regular'
              ? 'Regular'
              : mov.estadoOperativo === 'En Taller Mecánico'
                ? 'En Reparación'
                : mov.estadoOperativo === 'Fuera de Servicio' || mov.estadoOperativo === 'Baja definitiva'
                  ? 'Fuera de Servicio'
                  : 'Bueno',
        situacionPatrimonial:
          mov.estadoOperativo === 'En Taller Mecánico'
            ? 'En Reparación / Taller'
            : mov.estadoOperativo === 'Fuera de Servicio'
              ? 'En Depósito / Resguardo'
              : mov.estadoOperativo === 'Baja definitiva'
                ? 'Baja Patrimonial'
                : 'En Uso / Operativo',
        ubicacionSector: 'Parque Automotor / Cochera',
        responsableNombre: mov.dependenciaAsignada || activeDelegacion?.nombre,
        fechaAlta: today,
        ultimaVerificacionFecha: today,
        verificadoOk: true,
        origenModulo: 'moviles',
        origenModuloRefId: mov.id,
        observaciones: `Importado de Parque Automotor. Odómetro: ${mov.kilometrajeActual || 0} km.`,
        delegacionId: mov.delegacionId || activeDelegacionId,
        delegacionNombre: activeDelegacion?.nombre || config.dependencia,
        usuarioRegistro: currentUser?.apellidoYNombre || currentUser?.username,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    // 2. Armamento y Chalecos de Personal
    for (const pers of personalList) {
      const respLabel = `${pers.jerarquia ? `${pers.jerarquia} ` : ''}${pers.apellidoYNombre}`.trim();
      if (pers.armamento && (pers.armamento.marca || pers.armamento.serieNro || pers.armamento.modelo)) {
        const refKey = `personal_armamento::${pers.id}`;
        if (!existingKeys.has(refKey)) {
          nuevos.push({
            id: `inv-arm-${pers.id}-${Date.now()}`,
            nroInventario: allocCode(),
            categoria: 'Armamento y Protección',
            denominacion: `Arma Provista${pers.armamento.calibre ? ` Cal. ${pers.armamento.calibre}` : ''}`,
            marcaModelo: [pers.armamento.marca, pers.armamento.modelo].filter(Boolean).join(' ') || undefined,
            nroSerie: pers.armamento.serieNro || undefined,
            cantidad: 1,
            unidad: 'Unidad',
            estadoConservacion: pers.armamento.secuestradoORetenido ? 'Regular' : 'Bueno',
            situacionPatrimonial: pers.armamento.secuestradoORetenido ? 'En Depósito / Resguardo' : 'Asignado a Personal',
            ubicacionSector: pers.armamento.secuestradoORetenido ? 'Depósito General / Armería' : 'Cargo Individual de Personal',
            responsableId: pers.id,
            responsableNombre: respLabel,
            fechaAlta: today,
            ultimaVerificacionFecha: today,
            verificadoOk: true,
            origenModulo: 'personal_armamento',
            origenModuloRefId: pers.id,
            observaciones: pers.armamento.secuestradoORetenido
              ? `Arma retenida preventivamente${pers.armamento.causaSecuestro ? `: ${pers.armamento.causaSecuestro}` : ''}`
              : `Provista a ${respLabel}`,
            delegacionId: pers.delegacionId || activeDelegacionId,
            delegacionNombre: activeDelegacion?.nombre || config.dependencia,
            usuarioRegistro: currentUser?.apellidoYNombre || currentUser?.username,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }

      if (pers.chaleco && (pers.chaleco.serieNro || pers.chaleco.talla)) {
        const refKey = `personal_chalecos::${pers.id}`;
        if (!existingKeys.has(refKey)) {
          nuevos.push({
            id: `inv-chal-${pers.id}-${Date.now()}`,
            nroInventario: allocCode(),
            categoria: 'Armamento y Protección',
            denominacion: `Chaleco Antibalas${pers.chaleco.talla ? ` Talle ${pers.chaleco.talla}` : ''}`,
            marcaModelo: pers.chaleco.talla ? `Talle ${pers.chaleco.talla}` : undefined,
            nroSerie: pers.chaleco.serieNro || undefined,
            cantidad: 1,
            unidad: 'Unidad',
            estadoConservacion: pers.chaleco.secuestradoORetenido ? 'Regular' : 'Bueno',
            situacionPatrimonial: pers.chaleco.secuestradoORetenido ? 'En Depósito / Resguardo' : 'Asignado a Personal',
            ubicacionSector: pers.chaleco.secuestradoORetenido ? 'Depósito General / Armería' : 'Cargo Individual de Personal',
            responsableId: pers.id,
            responsableNombre: respLabel,
            fechaAlta: today,
            ultimaVerificacionFecha: today,
            verificadoOk: true,
            origenModulo: 'personal_chalecos',
            origenModuloRefId: pers.id,
            observaciones: pers.chaleco.secuestradoORetenido
              ? `Chaleco retenido${pers.chaleco.causaSecuestro ? `: ${pers.chaleco.causaSecuestro}` : ''}`
              : `Provisto a ${respLabel}`,
            delegacionId: pers.delegacionId || activeDelegacionId,
            delegacionNombre: activeDelegacion?.nombre || config.dependencia,
            usuarioRegistro: currentUser?.apellidoYNombre || currentUser?.username,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
    }

    // 3. Libros y Series de Control de Folios
    for (const ser of seriesNumerarioList) {
      const refKey = `control_folios::${ser.id}`;
      if (existingKeys.has(refKey)) continue;
      nuevos.push({
        id: `inv-ser-${ser.id}-${Date.now()}`,
        nroInventario: allocCode(),
        categoria: 'Documentación y Libros Oficiales',
        denominacion: `Libro / Serie "${ser.nombre}" (${ser.anio || year})`,
        marcaModelo: `Prefijo: ${ser.prefijo}`,
        nroSerie: `Folios 1 al ${ser.limiteFolios}`,
        cantidad: 1,
        unidad: 'Libro',
        estadoConservacion: 'Bueno',
        situacionPatrimonial: 'En Uso / Operativo',
        ubicacionSector: 'Mayoría / Judicial',
        responsableNombre: 'Jefatura / Mayoría de Dependencia',
        fechaAlta: today,
        ultimaVerificacionFecha: today,
        verificadoOk: true,
        origenModulo: 'control_folios',
        origenModuloRefId: ser.id,
        observaciones: `Control de folios oficial vinculado (${ser.descripcion || 'Serie activa'}).`,
        delegacionId: ser.delegacionId || activeDelegacionId,
        delegacionNombre: activeDelegacion?.nombre || config.dependencia,
        usuarioRegistro: currentUser?.apellidoYNombre || currentUser?.username,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    if (nuevos.length === 0) {
      setSyncNotice({
        text: 'El inventario ya se encuentra sincronizado con Móviles, Armamento/Chalecos y Control de Folios.',
        tone: 'info',
      });
    } else {
      await onBulkImportBienes(nuevos);
      setSyncNotice({
        text: `Se importaron ${nuevos.length} bien(es) patrimoniales nuevos desde los módulos del sistema sin duplicar registros existentes.`,
        tone: 'success',
      });
    }
    setTimeout(() => setSyncNotice(null), 5000);
  };

  const handleVerificacionRapida = async (bien: InventarioBien) => {
    const today = new Date().toISOString().slice(0, 10);
    await onSaveBien({
      ...bien,
      verificadoOk: true,
      ultimaVerificacionFecha: today,
      updatedAt: new Date().toISOString(),
    });
  };

  // Exportar CSV UTF-8 BOM
  const handleExportCsv = () => {
    const headers = [
      'Nro Inventario',
      'Categoria',
      'Denominacion',
      'Marca / Modelo',
      'Nro Serie',
      'Cantidad',
      'Unidad',
      'Estado Conservacion',
      'Situacion Patrimonial',
      'Ubicacion / Sector',
      'Responsable',
      'Verificado',
      'Observaciones',
    ];

    const escapeCell = (val: unknown) => {
      const s = String(val ?? '').replace(/\r?\n/g, ' ');
      if (s.includes(',') || s.includes('"') || s.includes(';')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [
      headers.map(escapeCell).join(','),
      ...filteredBienes.map((b) =>
        [
          b.nroInventario,
          b.categoria,
          b.denominacion,
          b.marcaModelo || '',
          b.nroSerie || '',
          b.cantidad,
          b.unidad || 'Unidad',
          b.estadoConservacion,
          b.situacionPatrimonial,
          b.ubicacionSector,
          b.responsableNombre || '',
          b.verificadoOk ? 'SI' : 'NO',
          b.observaciones || '',
        ]
          .map(escapeCell)
          .join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventario_Patrimonial_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar PDF del Inventario General (con KPIs, gráficos y tabla completa)
  const handleExportInventarioPdf = () => {
    const buildDoc = (opts: PdfExportOptions): jsPDF => {
      const orient = resolveJsPdfOrientation(opts.orientation || 'landscape');
      const paper = resolveJsPdfFormat(opts.paperSize || 'a4');
      const doc = new jsPDF(orient, 'mm', paper);

      let y = drawPoliceHeader(
        doc,
        config,
        'INVENTARIO GENERAL PATRIMONIAL Y CARGO DE DEPENDENCIA',
        10
      );

      const filtroDesc =
        activeFiltersCount > 0
          ? `Filtros aplicados — Categoría: ${filtroCategoria === 'todas' ? 'Todas' : filtroCategoria} | Conservación: ${filtroConservacion === 'todos' ? 'Todos' : filtroConservacion} | Situación: ${filtroSituacion === 'todas' ? 'Todas' : filtroSituacion} | Sector: ${filtroSector === 'todos' ? 'Todos' : filtroSector}`
          : `Inventario Completo de la Dependencia (${activeDelegacion?.nombre || config.dependencia}) — Fecha de emisión: ${formatFechaAr(new Date().toISOString().slice(0, 10))}`;

      y = drawReportFilterBanner(doc, y, filtroDesc);

      y = drawExecutiveKpiStrip(doc, y, [
        {
          label: 'Total Bienes',
          value: inventarioStats.totalRegistros,
          subtitle: `${inventarioStats.totalUnidades} unidades totales`,
          accentColor: [17, 38, 77],
        },
        {
          label: 'En Uso / Operativos',
          value: inventarioStats.operativos,
          subtitle: 'Cargo activo',
          accentColor: [29, 78, 216],
        },
        {
          label: 'Verificados',
          value: inventarioStats.verificados,
          subtitle: 'Constatados físicamente',
          accentColor: [15, 118, 110],
        },
        {
          label: 'Con Novedad / Taller',
          value: inventarioStats.conNovedad,
          subtitle: `${inventarioStats.bajas} bajas patrimoniales`,
          accentColor: [217, 119, 6],
        },
      ]);

      const chart1 = renderHorizontalBarChartPng(
        inventarioStats.porCategoria.map((d) => ({ label: d.name, value: d.value })),
        { width: 520, height: 220, barColor: '#11264d' }
      );
      const chart2 = renderDonutChartPng(
        inventarioStats.porConservacion.map((d) => ({ label: d.name, value: d.value })),
        { width: 520, height: 220, centerLabel: 'Bienes' }
      );

      y = drawChartSectionGrid(doc, y, [
        {
          title: 'Bienes por Categoría Patrimonial',
          subtitle: 'Distribución por rubro',
          imageDataUrl: chart1,
        },
        {
          title: 'Estado de Conservación Física',
          subtitle: 'Condición material declarada',
          imageDataUrl: chart2,
        },
      ]);

      autoTable(doc, {
        startY: y,
        head: [
          [
            'N° Inv.',
            'Categoría',
            'Denominación / Marca / Serie',
            'Cant.',
            'Conservación',
            'Situación',
            'Sector / Responsable',
            'Verif.',
          ],
        ],
        body: filteredBienes.map((b) => [
          b.nroInventario,
          b.categoria,
          [
            b.denominacion,
            b.marcaModelo ? `Marca/Mod: ${b.marcaModelo}` : '',
            b.nroSerie ? `Serie: ${b.nroSerie}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          `${b.cantidad} ${b.unidad || 'Un.'}`,
          b.estadoConservacion,
          b.situacionPatrimonial,
          `${b.ubicacionSector}${b.responsableNombre ? `\nResp: ${b.responsableNombre}` : ''}`,
          b.verificadoOk ? 'Verificado' : 'Pendiente',
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [17, 38, 77],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        margin: { left: 14, right: 14, bottom: 18 },
      });

      drawPoliceFooter(doc, config);
      return doc;
    };

    requestPdfExport({
      title: 'Inventario General Patrimonial',
      fileName: `Inventario_Patrimonial_${new Date().toISOString().slice(0, 10)}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc,
    });
  };

  // Exportar Planilla en Blanco para completar a mano en campo
  const handleExportPlanillaManualPdf = () => {
    const buildDoc = (opts: PdfExportOptions): jsPDF => {
      const orient = resolveJsPdfOrientation(opts.orientation || 'landscape');
      const paper = resolveJsPdfFormat(opts.paperSize || 'a4');
      const doc = new jsPDF(orient, 'mm', paper);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = drawPoliceHeader(
        doc,
        config,
        'PLANILLA DE RELEVAMIENTO MANUAL DE BIENES PATRIMONIALES',
        8
      );

      // Bloque de encabezado manuscrito
      doc.setDrawColor(148, 163, 184);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, y, pageWidth - 24, 15, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text('Dependencia / Sector Relevado: ______________________________________________________', 15, y + 5.5);
      doc.text('Fecha: _____ / _____ / 20_____', pageWidth - 62, y + 5.5);
      doc.text('Personal Relevador: ________________________________________________________________', 15, y + 11.5);
      doc.text('Hoja N°: _______', pageWidth - 62, y + 11.5);

      y += 17.5;

      // Guía de códigos abreviados para escritura rápida
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        'Referencias para completar a mano — Conservación: MB (Muy Bueno) · B (Bueno) · R (Regular) · M (Malo) · FS (Fuera de Serv.) · REP (En Reparación)   |   Luego cargue los datos en "Cargar desde Planilla".',
        12,
        y
      );
      y += 3;

      const blankRows = Array.from({ length: 14 }, (_, idx) => [
        String(idx + 1).padStart(2, '0'),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);

      autoTable(doc, {
        startY: y,
        head: [
          [
            'N°',
            'N° Inv. / Cód.',
            'Categoría',
            'Denominación / Descripción del Bien',
            'Marca / Modelo',
            'N° de Serie',
            'Cant.',
            'Cons.',
            'Sector / Ubicación',
            'Responsable',
            'Observaciones',
          ],
        ],
        body: blankRows,
        theme: 'grid',
        headStyles: {
          fillColor: [17, 38, 77],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center',
          valign: 'middle',
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 1.8,
          minCellHeight: 8.6,
          lineColor: [100, 116, 139],
          lineWidth: 0.25,
          textColor: [15, 23, 42],
          valign: 'middle',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8, fontStyle: 'bold' },
          1: { cellWidth: 22 },
          2: { cellWidth: 26 },
          3: { cellWidth: 50 },
          4: { cellWidth: 28 },
          5: { cellWidth: 24 },
          6: { halign: 'center', cellWidth: 11 },
          7: { halign: 'center', cellWidth: 13 },
          8: { cellWidth: 30 },
          9: { cellWidth: 28 },
          10: { cellWidth: 'auto' },
        },
        margin: { left: 12, right: 12, bottom: 26 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || pageHeight - 28;
      const sigY = Math.min(pageHeight - 16, finalY + 12);

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.3);
      doc.line(35, sigY, 105, sigY);
      doc.line(pageWidth - 105, sigY, pageWidth - 35, sigY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      doc.text('Firma y Aclaración del Relevador', 70, sigY + 4, { align: 'center' });
      doc.text('V° B° Jefatura / Control Patrimonial', pageWidth - 70, sigY + 4, { align: 'center' });

      drawPoliceFooter(doc, config);
      return doc;
    };

    requestPdfExport({
      title: 'Planilla de Relevamiento Manual de Bienes',
      fileName: `Planilla_Relevamiento_Manual_Bienes_${new Date().toISOString().slice(0, 10)}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc,
    });
  };

  // Exportar Acta Oficial de Entrega y Recepción de Jefatura (PDF con doble firma)
  const handleExportActaOficialPdf = (acta: ActaCambioJefe) => {
    const buildDoc = (opts: PdfExportOptions): jsPDF => {
      const orient = resolveJsPdfOrientation(opts.orientation || 'portrait');
      const paper = resolveJsPdfFormat(opts.paperSize || 'a4');
      const doc = new jsPDF(orient, 'mm', paper);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = drawPoliceHeader(
        doc,
        config,
        `ACTA DE ENTREGA Y RECEPCIÓN DE JEFATURA — ${acta.nroActa}`,
        10
      );

      // Cláusula formal de apertura
      const fechaFmt = formatFechaAr(acta.fecha);
      const salienteStr = `${acta.jefeSaliente.jerarquia ? `${acta.jefeSaliente.jerarquia} ` : ''}${acta.jefeSaliente.apellidoYNombre}${acta.jefeSaliente.dni ? ` (D.N.I. N° ${acta.jefeSaliente.dni})` : ''}`;
      const entranteStr = `${acta.jefeEntrante.jerarquia ? `${acta.jefeEntrante.jerarquia} ` : ''}${acta.jefeEntrante.apellidoYNombre}${acta.jefeEntrante.dni ? ` (D.N.I. N° ${acta.jefeEntrante.dni})` : ''}`;

      const textoApertura = `En la sede de ${acta.dependenciaNombre || config.dependencia}, siendo las ${acta.hora || '08:00'} horas del día ${fechaFmt}, con motivo de "${acta.tipoCambio}", se reúnen por una parte el Sr./Sra. ${salienteStr} en carácter de Jefatura Saliente (quien hace entrega), y por otra parte el Sr./Sra. ${entranteStr} en carácter de Jefatura Entrante (quien recibe); a los efectos de formalizar el relevo de mando, verificar el estado operativo de la dependencia y realizar el contralor físico del patrimonio inventariado que a continuación se detalla:`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      const splitIntro = doc.splitTextToSize(textoApertura, pageWidth - 28);
      doc.text(splitIntro, 14, y);
      y += splitIntro.length * 4.2 + 3;

      // Cuadro 1: Situación Operativa y Administrativa al Relevo
      const sit = acta.situacionOperativa;
      autoTable(doc, {
        startY: y,
        head: [
          [
            {
              content: 'I. ESTADO OPERATIVO, PERSONAL, MÓVILES Y DOCUMENTACIÓN AL RELEVO',
              colSpan: 4,
              styles: {
                fillColor: [17, 38, 77],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left',
                fontSize: 8,
              },
            },
          ],
        ],
        body: [
          [
            { content: 'Efectivos Activos:', styles: { fontStyle: 'bold' } },
            String(sit.efectivosActivos ?? 0),
            { content: 'Personal de Licencia / Carp. Méd.:', styles: { fontStyle: 'bold' } },
            String(sit.efectivosLicencia ?? 0),
          ],
          [
            { content: 'Móviles en Servicio:', styles: { fontStyle: 'bold' } },
            String(sit.movilesOperativos ?? 0),
            { content: 'Móviles en Taller / F. Servicio:', styles: { fontStyle: 'bold' } },
            String(sit.movilesTallerFueraServicio ?? 0),
          ],
          [
            { content: 'Expedientes Pendientes:', styles: { fontStyle: 'bold' } },
            String(sit.expedientesPendientes ?? 0),
            { content: 'Casos Falta de Oficio Pend.:', styles: { fontStyle: 'bold' } },
            String(sit.casosFaltaOficioPendientes ?? 0),
          ],
          [
            { content: 'Series de Folios Activas:', styles: { fontStyle: 'bold' } },
            String(sit.librosFoliosActivos ?? 0),
            { content: 'Estado del Acta:', styles: { fontStyle: 'bold' } },
            acta.estado,
          ],
          [
            { content: 'Llaves, Sellos y Valores:', styles: { fontStyle: 'bold' } },
            { content: sit.llavesSellosYValores || 'Sin detalle adicional.', colSpan: 3 },
          ],
        ],
        theme: 'grid',
        styles: {
          fontSize: 7.8,
          cellPadding: 2,
          lineColor: [148, 163, 184],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 5;

      // Cuadro 2: Anexo de Bienes Inventariados
      autoTable(doc, {
        startY: y,
        head: [
          [
            {
              content: `II. DETALLE PATRIMONIAL DE BIENES VERIFICADOS (Total: ${acta.totalBienesActa} | Conformes: ${acta.totalConformes} | Con Obs.: ${acta.totalObservados} | Faltantes: ${acta.totalFaltantes})`,
              colSpan: 7,
              styles: {
                fillColor: [17, 38, 77],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left',
                fontSize: 8,
              },
            },
          ],
          [
            'N° Inv.',
            'Bien / Descripción / Serie',
            'Cant.',
            'Conserv.',
            'Sector',
            'Recepción',
            'Observación',
          ],
        ],
        body:
          acta.itemsVerificados.length > 0
            ? acta.itemsVerificados.map((it) => [
                it.nroInventario,
                `${it.denominacion}${it.marcaModeloSerie ? `\n(${it.marcaModeloSerie})` : ''}`,
                `${it.cantidad} ${it.unidad || 'Un.'}`,
                it.estadoConservacion,
                it.ubicacionSector,
                it.estadoRecepcion,
                it.observacion || '-',
              ])
            : [['-', 'Sin bienes patrimoniales incluidos en el presente anexo.', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 108],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.3,
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        margin: { left: 14, right: 14, bottom: 20 },
      });

      y = (doc as any).lastAutoTable.finalY + 5;

      // Observaciones generales
      if (acta.observacionesGenerales) {
        if (y + 20 > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(17, 38, 77);
        doc.text('III. OBSERVACIONES GENERALES Y CONSTANCIAS:', 14, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const obsLines = doc.splitTextToSize(acta.observacionesGenerales, pageWidth - 28);
        doc.text(obsLines, 14, y);
        y += obsLines.length * 4 + 4;
      }

      // Cláusula de cierre y Bloque Formal de Triple Firma
      if (y + 42 > pageHeight - 16) {
        doc.addPage();
        y = 24;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      const cierreTxt =
        'No siendo para más, previa lectura y ratificación de todo lo actuado, firman al pie de conformidad las partes intervinientes en prueba de entrega y recepción formal.';
      const cierreLines = doc.splitTextToSize(cierreTxt, pageWidth - 28);
      doc.text(cierreLines, 14, y);
      y += cierreLines.length * 4 + 14;

      const availW = pageWidth - 28;
      const sigCols = 2;
      const colW = availW / sigCols;

      const drawSig = (colIdx: number, line1: string, line2: string, roleLabel: string) => {
        const cx = 14 + colIdx * colW + colW / 2;
        const lineHalf = Math.min(36, colW * 0.42);
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.35);
        doc.line(cx - lineHalf, y, cx + lineHalf, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(15, 23, 42);
        doc.text(line1, cx, y + 4.2, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        if (line2) {
          doc.text(line2, cx, y + 8, { align: 'center' });
          doc.text(roleLabel, cx, y + 11.6, { align: 'center' });
        } else {
          doc.text(roleLabel, cx, y + 8, { align: 'center' });
        }
      };

      drawSig(
        0,
        salienteStr,
        'ENTREGA CONFORME',
        'Jefe / Responsable Saliente'
      );
      drawSig(
        1,
        entranteStr,
        'RECIBE CONFORME',
        'Jefe / Responsable Entrante'
      );

      drawPoliceFooter(doc, config);
      return doc;
    };

    requestPdfExport({
      title: `Acta de Entrega y Recepción ${acta.nroActa}`,
      fileName: `${acta.nroActa.replace(/[^\w-]+/g, '_')}_${acta.fecha}.pdf`,
      defaultOrientation: 'portrait',
      defaultPaperSize: 'a4',
      buildDoc,
    });
  };

  return (
    <div className="space-y-4">
      {/* Encabezado del Módulo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Inventario Patrimonial y Actas de Cambio de Jefe
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Control integral de bienes de la dependencia y confección formal de actas de entrega y recepción de jefatura
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMostrarStats((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              mostrarStats
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{mostrarStats ? 'Ocultar Estadísticas' : 'Estadísticas'}</span>
          </button>

          {subTab === 'bienes' && canExportPdf && (
            <button
              type="button"
              onClick={handleExportPlanillaManualPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Generar planilla en blanco para imprimir y completar a mano"
            >
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              <span>Planilla Manual (PDF)</span>
            </button>
          )}

          {subTab === 'bienes' && canCreate && (
            <button
              type="button"
              onClick={() => setIsPlanillaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Cargar rápidamente múltiples bienes relevados desde la planilla manual"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-800" />
              <span>Cargar desde Planilla</span>
            </button>
          )}

          {subTab === 'bienes' && canCreate && (
            <button
              type="button"
              onClick={handleImportarDesdeSistema}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Importa Móviles, Armamento/Chalecos del Personal y Libros de Folios sin duplicar"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-800" />
              <span>Importar desde Sistema</span>
            </button>
          )}

          {subTab === 'bienes' && canExportPdf && (
            <button
              type="button"
              onClick={handleExportInventarioPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span>Exportar PDF</span>
            </button>
          )}

          {subTab === 'bienes' && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>CSV</span>
            </button>
          )}

          {canCreate && subTab === 'bienes' && (
            <button
              type="button"
              onClick={() => {
                setEditingBien(null);
                setIsBienModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Bien</span>
            </button>
          )}

          {canCreate && subTab === 'actas' && (
            <button
              type="button"
              onClick={() => {
                setEditingActa(null);
                setIsActaModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Nueva Acta de Cambio de Jefe</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso de sincronización desde otros módulos */}
      {syncNotice && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            syncNotice.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncNotice.text}</span>
        </div>
      )}

      {/* Estadísticas Colapsables */}
      {mostrarStats && (
        <ModuleStatsPanel
          title="Estadísticas de Inventario Patrimonial"
          subtitle={`Análisis de ${inventarioStats.totalRegistros} ítems registrados en la dependencia`}
          kpis={statsKpis}
          charts={statsCharts}
          onExportPdf={canExportPdf ? handleExportInventarioPdf : undefined}
          exportPdfLabel="Exportar Inventario con Gráficos (PDF)"
          onClose={() => setMostrarStats(false)}
        />
      )}

      {/* Pestañas principales del módulo */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('bienes')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
              subTab === 'bienes'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Inventario General de Bienes</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">({bienesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('actas')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
              subTab === 'actas'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Actas de Cambio de Jefe / Entrega y Recepción</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">({actasList.length})</span>
          </button>
        </div>

        {subTab === 'bienes' && bienesList.length > 0 && canCreate && (
          <button
            type="button"
            onClick={() => {
              setSubTab('actas');
              setEditingActa(null);
              setIsActaModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Preparar Acta de Relevo con este Inventario</span>
          </button>
        )}
      </div>

      {/* TAB 1: INVENTARIO GENERAL DE BIENES */}
      {subTab === 'bienes' && (
        <div className="space-y-4">
          {/* KPI Strip de Estado Limpio */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                Total Ítems / Unidades
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {inventarioStats.totalRegistros}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ({inventarioStats.totalUnidades} unid.)
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                En Uso / Cargo Activo
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-blue-900">
                  {inventarioStats.operativos}
                </span>
                <span className="text-xs text-slate-500">operativos</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                Verificados Físicamente
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono tabular-nums text-emerald-700">
                  {inventarioStats.verificados}
                </span>
                <span className="text-xs text-slate-500">constatados</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                Con Novedad / Deterioro
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    inventarioStats.conNovedad > 0 ? 'text-amber-700' : 'text-slate-800'
                  }`}
                >
                  {inventarioStats.conNovedad}
                </span>
                <span className="text-xs text-slate-500">
                  {inventarioStats.bajas > 0 ? `· ${inventarioStats.bajas} bajas` : 'requieren atención'}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <CollapsibleFilterBar
            title="Filtros de Inventario"
            activeFiltersCount={activeFiltersCount}
            onClear={handleClearFilters}
            summaryRight={
              <span className="text-[11px] font-mono tabular-nums text-slate-600">
                Mostrando {filteredBienes.length} de {bienesList.length}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por N° inventario, bien, marca, serie, sector o responsable..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="todas">Todas las Categorías</option>
                {CATEGORIAS_INVENTARIO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filtroConservacion}
                onChange={(e) => setFiltroConservacion(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="todos">Estado Conservación (Todos)</option>
                {ESTADOS_CONSERVACION.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filtroSituacion}
                  onChange={(e) => setFiltroSituacion(e.target.value)}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="todas">Situación (Todas)</option>
                  {SITUACIONES_PATRIMONIALES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroSector}
                  onChange={(e) => setFiltroSector(e.target.value)}
                  className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="todos">Sector (Todos)</option>
                  {sectoresUnicos.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CollapsibleFilterBar>

          {/* Tabla Principal / Estados Vacíos */}
          {bienesList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  No hay bienes patrimoniales cargados en el inventario
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
                  Registre el mobiliario, equipamiento pericial, informática y elementos de la dependencia, o importe automáticamente los móviles, armamento, chalecos y libros de folios existentes.
                </p>
              </div>
              {canCreate && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {canExportPdf && (
                    <button
                      type="button"
                      onClick={handleExportPlanillaManualPdf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-700" />
                      <span>Planilla Manual (PDF)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPlanillaModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-blue-800" />
                    <span>Cargar desde Planilla</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleImportarDesdeSistema}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-800" />
                    <span>Importar desde Sistema</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBien(null);
                      setIsBienModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cargar Primer Bien</span>
                  </button>
                </div>
              )}
            </div>
          ) : filteredBienes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2.5">
              <p className="text-sm font-bold text-slate-900">
                No se encontraron bienes con los filtros aplicados
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3.5 whitespace-nowrap">N° Inv.</th>
                      <th className="py-2.5 px-3.5">Bien / Marca / Serie</th>
                      <th className="py-2.5 px-3.5">Categoría y Sector</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Cant.</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Conservación</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Situación</th>
                      <th className="py-2.5 px-3.5">Responsable / Verif.</th>
                      <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBienes.map((bien) => (
                      <tr key={bien.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap align-top">
                          <div>{bien.nroInventario}</div>
                        </td>
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="font-semibold text-slate-900">{bien.denominacion}</div>
                          {(bien.marcaModelo || bien.nroSerie) && (
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {bien.marcaModelo || ''}
                              {bien.marcaModelo && bien.nroSerie ? ' · ' : ''}
                              {bien.nroSerie && (
                                <span className="font-mono text-slate-700">S/N: {bien.nroSerie}</span>
                              )}
                            </div>
                          )}
                          {bien.observaciones && (
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                              {bien.observaciones}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="font-medium text-slate-800">{bien.categoria}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{bien.ubicacionSector}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap align-top">
                          {bien.cantidad} <span className="font-sans font-normal text-[10px] text-slate-500">{bien.unidad || 'Un.'}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-medium ${getEstadoConservacionBadge(
                              bien.estadoConservacion
                            )}`}
                          >
                            {bien.estadoConservacion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-medium ${getSituacionBadge(
                              bien.situacionPatrimonial
                            )}`}
                          >
                            {bien.situacionPatrimonial}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="text-slate-800 font-medium">
                            {bien.responsableNombre || 'Jefatura / Dependencia'}
                          </div>
                          <div className="text-[10px] mt-0.5 font-mono tabular-nums text-slate-500">
                            {bien.verificadoOk ? 'Verificado' : 'Pendiente verificación'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap align-top">
                          <div className="inline-flex items-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleVerificacionRapida(bien)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                                title="Confirmar verificación física hoy"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {bien.adjuntos && bien.adjuntos.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewGallery({
                                    isOpen: true,
                                    files: (bien.adjuntos || []).map((a) => ({
                                      id: a.id,
                                      nombre: a.nombre,
                                      tipo: a.tipo,
                                      dataUrl: a.dataUrl,
                                    })),
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-800 cursor-pointer"
                                title={`Ver ${bien.adjuntos.length} adjunto(s)`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBien(bien);
                                  setIsBienModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                                title="Editar bien"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'bien',
                                    id: bien.id,
                                    label: `${bien.nroInventario} — ${bien.denominacion}`,
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                                title="Eliminar bien"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTAS DE CAMBIO DE JEFE / ENTREGA Y RECEPCIÓN */}
      {subTab === 'actas' && (
        <div className="space-y-4">
          {/* Filtro rápido de Actas */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actaSearch}
                onChange={(e) => setActaSearch(e.target.value)}
                placeholder="Buscar acta por número, jefe saliente, jefe entrante o motivo..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <select
              value={actaEstadoFilter}
              onChange={(e) => setActaEstadoFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="todos">Todos los estados de acta</option>
              <option value="Borrador / En Preparación">Borrador / En Preparación</option>
              <option value="Cerrada y Firmada">Cerrada y Firmada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>

          {actasList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  No hay Actas de Cambio de Jefe confeccionadas
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
                  Cuando se produzca un relevo o cambio de Jefatura (titular o interino), cree un Acta para capturar el estado operativo de la dependencia, verificar ítem por ítem el inventario físico y emitir el Acta Oficial con firmas para archivo.
                </p>
              </div>
              {canCreate && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActa(null);
                      setIsActaModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Primera Acta de Relevo</span>
                  </button>
                </div>
              )}
            </div>
          ) : filteredActas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-900">
                Sin actas que coincidan con el criterio de búsqueda
              </p>
              <button
                type="button"
                onClick={() => {
                  setActaSearch('');
                  setActaEstadoFilter('todos');
                }}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActas.map((acta) => (
                <div
                  key={acta.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {acta.nroActa}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getActaEstadoBadge(
                            acta.estado
                          )}`}
                        >
                          {acta.estado}
                        </span>
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          {formatFechaAr(acta.fecha)} · {acta.hora || '08:00'} hs
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                        {acta.tipoCambio} — {acta.dependenciaNombre}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canExportPdf && (
                        <button
                          type="button"
                          onClick={() => handleExportActaOficialPdf(acta)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Generar Acta Oficial PDF</span>
                        </button>
                      )}
                      {acta.adjuntos && acta.adjuntos.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewGallery({
                              isOpen: true,
                              files: (acta.adjuntos || []).map((a) => ({
                                id: a.id,
                                nombre: a.nombre,
                                tipo: a.tipo,
                                dataUrl: a.dataUrl,
                              })),
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-800" />
                          <span>Adjuntos ({acta.adjuntos.length})</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActa(acta);
                            setIsActaModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'acta',
                              id: acta.id,
                              label: `${acta.nroActa} (${formatFechaAr(acta.fecha)})`,
                            })
                          }
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 cursor-pointer"
                          title="Eliminar acta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle de partes y resumen de verificación */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Jefe Saliente (Entrega)
                      </span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {acta.jefeSaliente.jerarquia ? `${acta.jefeSaliente.jerarquia} ` : ''}
                        {acta.jefeSaliente.apellidoYNombre}
                      </div>
                      {acta.jefeSaliente.dni && (
                        <div className="text-[11px] font-mono text-slate-500">
                          DNI {acta.jefeSaliente.dni}
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Jefe Entrante (Recibe)
                      </span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {acta.jefeEntrante.jerarquia ? `${acta.jefeEntrante.jerarquia} ` : ''}
                        {acta.jefeEntrante.apellidoYNombre}
                      </div>
                      {acta.jefeEntrante.dni && (
                        <div className="text-[11px] font-mono text-slate-500">
                          DNI {acta.jefeEntrante.dni}
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Contralor de Inventario ({acta.totalBienesActa} ítems)
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-3 font-mono tabular-nums font-semibold">
                        <span className="text-emerald-700">Conformes: {acta.totalConformes}</span>
                        <span className={acta.totalObservados > 0 ? 'text-amber-700' : 'text-slate-500'}>
                          Obs: {acta.totalObservados}
                        </span>
                        <span className={acta.totalFaltantes > 0 ? 'text-red-700' : 'text-slate-500'}>
                          Faltantes: {acta.totalFaltantes}
                        </span>
                      </div>
                      {(acta.totalFaltantes > 0 || acta.totalObservados > 0) && (
                        <div className="text-[10px] text-amber-800 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Revisar observaciones consignadas en el anexo del acta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales CRUD */}
      <InventarioBienModal
        isOpen={isBienModalOpen}
        editingItem={editingBien}
        bienesExistentes={bienesList}
        personalList={personalList}
        activeDelegacionId={activeDelegacionId}
        delegacionNombre={activeDelegacion?.nombre || config.dependencia}
        usuarioRegistro={currentUser?.apellidoYNombre || currentUser?.username}
        onSave={onSaveBien}
        onClose={() => {
          setIsBienModalOpen(false);
          setEditingBien(null);
        }}
      />

      <ActaCambioJefeModal
        isOpen={isActaModalOpen}
        editingItem={editingActa}
        actasExistentes={actasList}
        bienesList={bienesList}
        personalList={personalList}
        movilesList={movilesList}
        expedientesList={expedientesList}
        casosFaltaOficioList={casosFaltaOficioList}
        seriesNumerarioList={seriesNumerarioList}
        config={config}
        activeDelegacionId={activeDelegacionId}
        delegacionNombre={activeDelegacion?.nombre || config.dependencia}
        usuarioRegistro={currentUser?.apellidoYNombre || currentUser?.username}
        onSave={onSaveActa}
        onClose={() => {
          setIsActaModalOpen(false);
          setEditingActa(null);
        }}
      />

      <CargaMasivaPlanillaModal
        isOpen={isPlanillaModalOpen}
        bienesExistentes={bienesList}
        personalList={personalList}
        activeDelegacionId={activeDelegacionId}
        delegacionNombre={activeDelegacion?.nombre || config.dependencia}
        usuarioRegistro={currentUser?.apellidoYNombre || currentUser?.username}
        onSaveBatch={async (nuevos) => {
          await onBulkImportBienes(nuevos);
          setSyncNotice({
            text: `Se incorporaron ${nuevos.length} bien(es) al inventario desde la planilla manual.`,
            tone: 'success',
          });
          setTimeout(() => setSyncNotice(null), 5000);
        }}
        onClose={() => setIsPlanillaModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'acta' ? 'Eliminar Acta de Relevo' : 'Eliminar Bien del Inventario'}
        message={`¿Confirma que desea eliminar permanentemente "${deleteTarget?.label || ''}"? Esta acción quedará registrada en auditoría.`}
        confirmText="Eliminar"
        isDestructive={true}
        closeOnBackdropClick={false}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'bien') {
            await onDeleteBien(deleteTarget.id);
          } else {
            await onDeleteActa(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <FilePreviewModal
        isOpen={previewGallery.isOpen}
        file={previewGallery.files[0] || null}
        files={previewGallery.files}
        initialIndex={0}
        onClose={() => setPreviewGallery({ isOpen: false, files: [] })}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  CharlaPrevencion,
  EstadoCharlaPrevencion,
  Personal,
  DelegacionPolicial,
  ConfiguracionSistema,
  UsuarioSistema,
} from '../../types/police';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Building2,
  UserCheck,
  Download,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Bell,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import { CharlaModal, formatFechaDDMMAAAA } from './CharlaModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';

interface CharlasPrevencionViewProps {
  charlasList: CharlaPrevencion[];
  personalList: Personal[];
  delegacionesList: DelegacionPolicial[];
  activeDelegacionId: string;
  currentUser?: UsuarioSistema;
  config: ConfiguracionSistema;
  onSaveCharla: (charla: CharlaPrevencion) => Promise<void> | void;
  onDeleteCharla: (id: string) => Promise<void> | void;
}

export function getDiasHastaCharla(fechaStr: string): number {
  if (!fechaStr) return 9999;
  const hoy = new Date();
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const parts = fechaStr.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return 9999;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  return Math.round((target.getTime() - hoyLocal.getTime()) / (1000 * 60 * 60 * 24));
}

export const CharlasPrevencionView: React.FC<CharlasPrevencionViewProps> = ({
  charlasList,
  personalList,
  delegacionesList,
  activeDelegacionId,
  currentUser,
  config,
  onSaveCharla,
  onDeleteCharla,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [filtroLocalidad, setFiltroLocalidad] = useState<string>('todas');
  const [filtroDisertante, setFiltroDisertante] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [soloProximas, setSoloProximas] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharla, setEditingCharla] = useState<CharlaPrevencion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    charla: CharlaPrevencion | null;
  }>({ isOpen: false, charla: null });

  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
    index: number;
  }>({ isOpen: false, files: [], index: 0 });

  const esSoloLectura = Boolean(currentUser?.esSoloLectura);
  const puedeCrear = currentUser?.rol === 'superusuario' || (!esSoloLectura && currentUser?.puedeCrear !== false);
  const puedeModificar = currentUser?.rol === 'superusuario' || (!esSoloLectura && currentUser?.puedeModificar !== false);
  const puedeEliminar = currentUser?.rol === 'superusuario' || (!esSoloLectura && Boolean(currentUser?.puedeEliminar));

  // Meses disponibles dinámicos (YYYY-MM)
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    charlasList.forEach((c) => {
      if (c.fecha && c.fecha.length >= 7) set.add(c.fecha.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [charlasList]);

  // Próximas charlas (hoy y próximos 7 días) que activan recordatorio
  const charlasProximas = useMemo(() => {
    return charlasList
      .filter((c) => {
        if (c.estado === 'Realizada' || c.estado === 'Suspendida') return false;
        const diff = getDiasHastaCharla(c.fecha);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  }, [charlasList]);

  const stats = useMemo(() => {
    const total = charlasList.length;
    const programadas = charlasList.filter(
      (c) => c.estado === 'Programada' || c.estado === 'Reprogramada'
    ).length;
    const realizadas = charlasList.filter((c) => c.estado === 'Realizada').length;
    const hoyCount = charlasProximas.filter((c) => getDiasHastaCharla(c.fecha) === 0).length;
    return { total, programadas, realizadas, proximas: charlasProximas.length, hoyCount };
  }, [charlasList, charlasProximas]);

  const localidadesDisponibles = useMemo(() => {
    const set = new Set<string>();
    charlasList.forEach((c) => {
      if (c.localidad?.trim()) set.add(c.localidad.trim());
    });
    return Array.from(set).sort();
  }, [charlasList]);

  const disertantesDisponibles = useMemo(() => {
    const set = new Set<string>();
    charlasList.forEach((c) => {
      if (c.disertanteNombre?.trim()) set.add(c.disertanteNombre.trim());
    });
    return Array.from(set).sort();
  }, [charlasList]);

  const filteredCharlas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return charlasList
      .filter((c) => {
        if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
        if (filtroMes !== 'todos' && !c.fecha.startsWith(filtroMes)) return false;
        if (filtroLocalidad !== 'todas' && c.localidad !== filtroLocalidad) return false;
        if (filtroDisertante !== 'todos' && c.disertanteNombre !== filtroDisertante) return false;
        if (fechaDesde && c.fecha < fechaDesde) return false;
        if (fechaHasta && c.fecha > fechaHasta) return false;
        if (soloProximas) {
          const diff = getDiasHastaCharla(c.fecha);
          if (diff < 0 || diff > 7 || c.estado === 'Realizada' || c.estado === 'Suspendida') {
            return false;
          }
        }
        if (q) {
          const match =
            c.tema.toLowerCase().includes(q) ||
            c.lugarInstitucion.toLowerCase().includes(q) ||
            c.localidad.toLowerCase().includes(q) ||
            c.disertanteNombre.toLowerCase().includes(q) ||
            (c.observaciones || '').toLowerCase().includes(q) ||
            formatFechaDDMMAAAA(c.fecha).includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
  }, [charlasList, filtroEstado, filtroMes, filtroLocalidad, filtroDisertante, fechaDesde, fechaHasta, soloProximas, searchTerm]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filtroEstado !== 'todos') count++;
    if (filtroMes !== 'todos') count++;
    if (filtroLocalidad !== 'todas') count++;
    if (filtroDisertante !== 'todos') count++;
    if (fechaDesde) count++;
    if (fechaHasta) count++;
    if (soloProximas) count++;
    return count;
  }, [searchTerm, filtroEstado, filtroMes, filtroLocalidad, filtroDisertante, fechaDesde, fechaHasta, soloProximas]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFiltroEstado('todos');
    setFiltroMes('todos');
    setFiltroLocalidad('todas');
    setFiltroDisertante('todos');
    setFechaDesde('');
    setFechaHasta('');
    setSoloProximas(false);
  };

  const handleExportPdf = () => {
    requestPdfExport({
      title: 'Registro de Charlas y Prevención Comunitaria',
      fileName: `Charlas_Prevencion_${new Date().toISOString().slice(0, 10)}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: ({ orientation, paperSize }) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(paperSize),
        });
        const startY = drawPoliceHeader(
          doc,
          config,
          'REGISTRO DE CHARLAS Y PREVENCIÓN COMUNITARIA',
          12
        );

        autoTable(doc, {
          startY: startY + 2,
          head: [
            [
              'Fecha',
              'Hora',
              'Localidad',
              'Lugar / Institución',
              'Tema',
              'Disertante Designado',
              'Estado',
              'Observaciones',
            ],
          ],
          body: filteredCharlas.map((c) => [
            formatFechaDDMMAAAA(c.fecha),
            `${c.hora} hs`,
            c.localidad,
            c.lugarInstitucion,
            c.tema,
            c.disertanteNombre,
            c.estado,
            c.observaciones || '—',
          ]),
          styles: { fontSize: 8, cellPadding: 2.2 },
          headStyles: { fillColor: [17, 38, 77], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
  };

  const getEstadoBadge = (estado: EstadoCharlaPrevencion) => {
    switch (estado) {
      case 'Realizada':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Reprogramada':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Suspendida':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Programada':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera Institucional */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            <span>Charlas y Prevención Comunitaria</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Planificación de jornadas preventivas en establecimientos educativos e instituciones con recordatorio en el Dashboard y barra de Notificaciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredCharlas.length === 0}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar PDF</span>
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={() => {
                setEditingCharla(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Charla</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs en 1 sola elevación plana */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Total Registradas
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Agenda Activa
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-blue-800 tabular-nums font-mono">
            {stats.programadas}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Próximos 7 Días / Hoy
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700 tabular-nums font-mono">
              {stats.proximas}
            </span>
            {stats.hoyCount > 0 && (
              <span className="text-[11px] font-semibold text-rose-700">
                ({stats.hoyCount} hoy)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Charlas Realizadas
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-700 tabular-nums font-mono">
            {stats.realizadas}
          </div>
        </div>
      </div>

      {/* Recordatorio inmediato de próximos eventos */}
      {charlasProximas.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-slate-900">
                Recordatorio de Agenda ({charlasProximas.length} próxima{charlasProximas.length === 1 ? '' : 's'}):
              </span>{' '}
              <span className="text-slate-700">
                {formatFechaDDMMAAAA(charlasProximas[0].fecha)} · {charlasProximas[0].hora} hs —{' '}
                <strong>{charlasProximas[0].tema}</strong> en {charlasProximas[0].lugarInstitucion} ({charlasProximas[0].localidad}) · Disertante: {charlasProximas[0].disertanteNombre}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoloProximas((prev) => !prev)}
            className="text-xs font-semibold text-amber-900 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
          >
            {soloProximas ? 'Ver todas' : 'Filtrar próximas'}
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros Plegable */}
      <CollapsibleFilterBar
        title="Filtros de Búsqueda de Charlas y Prevención"
        activeFiltersCount={activeFiltersCount}
        onClear={handleClearFilters}
        summaryRight={
          <span>
            Mostrando <strong>{filteredCharlas.length}</strong> de {charlasList.length} jornadas
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-center">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tema, institución, localidad, disertante o fecha (DD/MM/AAAA)..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
          >
            <option value="todos">Todos los estados</option>
            <option value="Programada">Programada</option>
            <option value="Reprogramada">Reprogramada</option>
            <option value="Realizada">Realizada</option>
            <option value="Suspendida">Suspendida</option>
          </select>

          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
          >
            <option value="todos">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {m.split('-').reverse().join('/')}
              </option>
            ))}
          </select>

          <select
            value={filtroLocalidad}
            onChange={(e) => setFiltroLocalidad(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
          >
            <option value="todas">Todas las localidades</option>
            {localidadesDisponibles.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={filtroDisertante}
            onChange={(e) => setFiltroDisertante(e.target.value)}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 text-xs"
          >
            <option value="todos">Todos los disertantes</option>
            {disertantesDisponibles.map((dis) => (
              <option key={dis} value={dis}>
                {dis}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 shrink-0">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 shrink-0">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer select-none lg:col-span-4">
            <input
              type="checkbox"
              checked={soloProximas}
              onChange={(e) => setSoloProximas(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>Solo próximos 7 días</span>
          </label>
        </div>
      </CollapsibleFilterBar>

      {/* Tabla / Listado Principal */}
      {filteredCharlas.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-2 text-xs text-slate-500">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">
            No hay charlas ni actividades de prevención comunitaria registradas con estos filtros.
          </p>
          {puedeCrear && (
            <button
              type="button"
              onClick={() => {
                setEditingCharla(null);
                setIsModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primera Charla</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Localidad / Institución</th>
                  <th className="px-4 py-3">Tema</th>
                  <th className="px-4 py-3">Disertante Designado</th>
                  <th className="px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3 text-center">Adjuntos</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCharlas.map((c) => {
                  const diffDias = getDiasHastaCharla(c.fecha);
                  const esProxima =
                    c.estado !== 'Realizada' &&
                    c.estado !== 'Suspendida' &&
                    diffDias >= 0 &&
                    diffDias <= 7;
                  const adjuntos = c.adjuntos || [];

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      {/* Fecha y Hora */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{formatFechaDDMMAAAA(c.fecha)}</span>
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.hora} hs</span>
                        </div>
                        {esProxima && (
                          <div className="mt-1 text-[10px] font-bold text-amber-800">
                            {diffDias === 0
                              ? 'Hoy'
                              : diffDias === 1
                              ? 'Mañana'
                              : `En ${diffDias} días`}
                          </div>
                        )}
                      </td>

                      {/* Localidad / Lugar */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="font-semibold text-slate-900 flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{c.lugarInstitucion}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.localidad}</span>
                        </div>
                      </td>

                      {/* Tema */}
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {c.tema}
                        </div>
                        {c.delegacionNombre && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {c.delegacionNombre}
                          </div>
                        )}
                      </td>

                      {/* Disertante */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="flex items-start gap-1.5 font-medium text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{c.disertanteNombre}</span>
                        </div>
                      </td>

                      {/* Observaciones */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-slate-600 line-clamp-2 whitespace-pre-line">
                          {c.observaciones || '—'}
                        </p>
                      </td>

                      {/* Adjuntos */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {adjuntos.length > 0 ? (
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
                                index: 0,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-semibold cursor-pointer"
                            title="Abrir vista preliminar con zoom"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Ver ({adjuntos.length})</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${getEstadoBadge(
                            c.estado
                          )}`}
                        >
                          {c.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {puedeModificar && c.estado !== 'Realizada' && (
                            <button
                              type="button"
                              onClick={() =>
                                onSaveCharla({
                                  ...c,
                                  estado: 'Realizada',
                                  updatedAt: new Date().toISOString(),
                                })
                              }
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Marcar como Realizada"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {puedeModificar && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCharla(c);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                              title="Editar charla"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {puedeEliminar && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ isOpen: true, charla: c })}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="Eliminar charla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Alta/Edición */}
      {isModalOpen && (
        <CharlaModal
          charla={editingCharla}
          personalList={personalList}
          delegacionesList={delegacionesList}
          activeDelegacionId={activeDelegacionId}
          currentUser={currentUser}
          config={config}
          onSave={async (data) => {
            await onSaveCharla(data);
            setIsModalOpen(false);
            setEditingCharla(null);
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCharla(null);
          }}
        />
      )}

      {/* Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Charla de Prevención"
        message={`¿Confirma eliminar el registro de "${deleteConfirm.charla?.tema || ''}" (${formatFechaDDMMAAAA(deleteConfirm.charla?.fecha)})?`}
        confirmLabel="Eliminar Registro"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirm.charla) {
            onDeleteCharla(deleteConfirm.charla.id);
          }
          setDeleteConfirm({ isOpen: false, charla: null });
        }}
        onClose={() => setDeleteConfirm({ isOpen: false, charla: null })}
      />

      {/* Visor Preliminar con Zoom */}
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

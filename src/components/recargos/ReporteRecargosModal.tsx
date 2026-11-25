import React, { useState, useMemo } from 'react';
import { RecargoOperativo, Personal, ConfiguracionSistema, DelegacionPolicial, UsuarioSistema, LicenciaPolicial } from '../../types/police';
import { getLicenciaActivaPersonal } from '../../services/licenciaService';
import { X, Clock, Download, Filter, CheckCircle2, Calendar, Shield, Users, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import { PdfPaperSize } from '../../types/police';
import {
  drawExecutiveKpiStrip,
  drawChartSectionGrid,
  drawReportFilterBanner,
  renderHorizontalBarChartPng,
  renderDonutChartPng,
} from '../../utils/pdfChartUtils';

interface ReporteRecargosModalProps {
  isOpen: boolean;
  onClose: () => void;
  recargosList: RecargoOperativo[];
  personalList?: Personal[];
  licenciasPoliciales?: LicenciaPolicial[];
  config: ConfiguracionSistema;
  delegacionesList?: DelegacionPolicial[];
  currentUser?: UsuarioSistema;
}

export const ReporteRecargosModal: React.FC<ReporteRecargosModalProps> = ({
  isOpen,
  onClose,
  recargosList,
  personalList = [],
  licenciasPoliciales = [],
  config,
  delegacionesList = [],
  currentUser,
}) => {
  // Filtros requeridos: Tipo, estado, personal designado, por sección, Delegación (si tiene privilegio), etc.
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPersonal, setFiltroPersonal] = useState<string>('todos');
  const [filtroSeccion, setFiltroSeccion] = useState<string>('todas');
  const [filtroDelegacion, setFiltroDelegacion] = useState<string>('todas');

  // Rango de fecha: año, mes, semanal, personalizado
  const [rangoTipo, setRangoTipo] = useState<'todo' | 'anio' | 'mes' | 'semana' | 'personalizado'>('todo');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Formato de papel
  const [orientacion, setOrientacion] = useState<'p' | 'l'>('l');
  const [tamanoPapel, setTamanoPapel] = useState<PdfPaperSize>('a4');

  const puedeVerOtras = Boolean(
    currentUser?.rol === 'superusuario' || currentUser?.puedeVerOtrasDelegaciones
  );

  // Tipos únicos de servicio (normalizando tipoRecargo || tipoServicio)
  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    recargosList.forEach((r) => {
      const t = r.tipoRecargo || r.tipoServicio;
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [recargosList]);

  // Secciones / oficinas únicas
  const seccionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    recargosList.forEach((r) => {
      const s = r.oficina || r.seccionGrupo || r.grupoUOficina;
      if (s) set.add(s);
    });
    personalList.forEach((p) => {
      if (p.seccionGrupo) set.add(p.seccionGrupo);
    });
    return Array.from(set).sort();
  }, [recargosList, personalList]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    const now = new Date();
    let limiteDesde = fechaDesde;
    let limiteHasta = fechaHasta;

    if (rangoTipo === 'anio') {
      const year = now.getFullYear();
      limiteDesde = `${year}-01-01`;
      limiteHasta = `${year}-12-31`;
    } else if (rangoTipo === 'mes') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      limiteDesde = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      limiteHasta = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (rangoTipo === 'semana') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const toYmd = (dt: Date) =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      limiteDesde = toYmd(start);
      limiteHasta = toYmd(end);
    }

    return recargosList.filter((r) => {
      // Tipo de servicio
      const tipoActual = r.tipoRecargo || r.tipoServicio || '';
      if (filtroTipo !== 'todos' && tipoActual !== filtroTipo) return false;

      // Estado
      if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;

      // Personal designado
      if (filtroPersonal !== 'todos') {
        const personObj = personalList.find((p) => p.id === filtroPersonal);
        const fullNom = personObj ? (personObj.apellidoYNombre || '').toLowerCase() : '';
        const tienePersonal =
          (r.personalIds || []).includes(filtroPersonal) ||
          (fullNom && (r.personalDesignado || '').toLowerCase().includes(fullNom)) ||
          (Array.isArray(r.personalAsignado) &&
            r.personalAsignado.some(
              (p: any) =>
                p?.personalId === filtroPersonal ||
                p?.id === filtroPersonal ||
                (fullNom && (p?.apellidoYNombre || p?.nombre || '').toLowerCase().includes(fullNom))
            ));
        if (!tienePersonal) return false;
      }

      // Sección / Grupo / Oficina
      const seccionActual = r.oficina || r.seccionGrupo || r.grupoUOficina || '';
      if (filtroSeccion !== 'todas' && seccionActual !== filtroSeccion) return false;

      // Delegación (si tiene privilegio de ver otras)
      if (puedeVerOtras && filtroDelegacion !== 'todas') {
        if (r.delegacionId && r.delegacionId !== filtroDelegacion) return false;
      }

      // Rango de fechas
      if (rangoTipo !== 'todo') {
        const fRec = (r.fecha || r.fechaServicio || '').slice(0, 10);
        if (limiteDesde && fRec && fRec < limiteDesde) return false;
        if (limiteHasta && fRec && fRec > limiteHasta) return false;
      }

      return true;
    });
  }, [
    recargosList,
    personalList,
    filtroTipo,
    filtroEstado,
    filtroPersonal,
    filtroSeccion,
    filtroDelegacion,
    rangoTipo,
    fechaDesde,
    fechaHasta,
    puedeVerOtras,
  ]);

  const handleDescargarPdf = () => {
    const fileName = `Reporte_Recargos_${new Date().toISOString().slice(0, 10)}.pdf`;
    requestPdfExport({
      title: 'Reporte Oficial de Recargos Policiales',
      fileName,
      defaultOrientation: orientacion === 'p' ? 'portrait' : 'landscape',
      defaultPaperSize: tamanoPapel,
      buildDoc: (opts) => {
        const doc = new jsPDF(resolveJsPdfOrientation(opts.orientation), 'mm', resolveJsPdfFormat(opts.paperSize));

        const titulo = `REPORTE OFICIAL DE RECARGOS Y SERVICIOS EXTRAORDINARIOS`;
        let currentY = drawPoliceHeader(doc, config, titulo, 10);

        const filtrosTxt = `Filtros: Tipo: ${filtroTipo} | Estado: ${filtroEstado} | Sección/Oficina: ${filtroSeccion} | Período: ${rangoTipo.toUpperCase()} | Total recargos: ${filteredList.length}`;
        currentY = drawReportFilterBanner(doc, currentY, filtrosTxt, 10);

        const totalEfectivos = filteredList.reduce((acc, r) => acc + Math.max(0, r.personalIds?.length || 0), 0);
        const totalHoras = filteredList.reduce((acc, r) => acc + (Number(r.horasCalculadas) || 0) * Math.max(1, r.personalIds?.length || 1), 0);
        const vigentes = filteredList.filter((r) => r.estado === 'Vigente').length;

        currentY = drawExecutiveKpiStrip(
          doc,
          currentY,
          [
            { label: 'Recargos Filtrados', value: filteredList.length, subtitle: 'Servicios extraordinarios', accentColor: [17, 38, 77] },
            { label: 'Efectivos Asignados', value: totalEfectivos, subtitle: 'Cobertura operativa total', accentColor: [29, 78, 216] },
            { label: 'Horas Computadas', value: `${Math.round(totalHoras * 10) / 10} hs`, subtitle: 'Carga horaria acumulada', accentColor: [15, 118, 110] },
            { label: 'Estado Vigente', value: vigentes, subtitle: `Finalizados/Susp.: ${filteredList.length - vigentes}`, accentColor: [217, 119, 6] },
          ],
          10
        );

        const tipoCounts: Record<string, number> = {};
        const estadoCounts: Record<string, number> = {};
        filteredList.forEach((r) => {
          const t = r.tipoRecargo || r.tipoServicio || 'Otro';
          tipoCounts[t] = (tipoCounts[t] || 0) + 1;
          const e = r.estado || 'Vigente';
          estadoCounts[e] = (estadoCounts[e] || 0) + 1;
        });

        const chartTipo = renderHorizontalBarChartPng(
          Object.entries(tipoCounts).map(([label, value]) => ({ label, value })),
          { width: 560, height: 235 }
        );
        const chartEstado = renderDonutChartPng(
          Object.entries(estadoCounts).map(([label, value]) => ({
            label,
            value,
            color: label === 'Vigente' ? '#0f766e' : label === 'Finalizado' ? '#1d4ed8' : '#d97706',
          })),
          { width: 560, height: 235, centerLabel: 'RECARGOS' }
        );
        currentY = drawChartSectionGrid(
          doc,
          currentY,
          [
            { title: 'Servicios por Tipo de Recargo', subtitle: 'Frecuencia según modalidad', imageDataUrl: chartTipo },
            { title: 'Estado de Cumplimiento', subtitle: 'Vigentes, Finalizados y Suspendidos', imageDataUrl: chartEstado },
          ],
          10
        );

        const personalById = new Map<string, Personal>();
        personalList.forEach((p) => personalById.set(p.id, p));

        const rows: (string | number)[][] = filteredList.map((r, i) => {
          const nombresDesdeIds = (r.personalIds || [])
            .map((id) => personalById.get(id))
            .filter(Boolean)
            .map((p) => `${p!.jerarquia} ${p!.apellidoYNombre}`)
            .join(', ');

          const baseNombres =
            nombresDesdeIds ||
            (Array.isArray(r.personalAsignado)
              ? r.personalAsignado
                  .map((p: any) => (typeof p === 'string' ? p : `${p.jerarquia || ''} ${p.apellidoYNombre || p.nombre || ''}`.trim()))
                  .filter(Boolean)
                  .join(', ')
              : '') ||
            r.personalDesignado ||
            '';
          const fechaRef = r.fecha || r.fechaServicio || new Date().toISOString().slice(0, 10);
          const personalNombres = baseNombres
            ? baseNombres
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((nom) => {
                  const cond = getLicenciaActivaPersonal(nom, fechaRef, licenciasPoliciales, personalList);
                  return cond ? `${nom} [DE LICENCIA: ${cond.tipoLicencia}]` : nom;
                })
                .join(', ')
            : 'Sin asignar';

          return [
            i + 1,
            r.fecha || r.fechaServicio || '---',
            `${r.horaDesde || r.horaInicio || r.hora || '00:00'} - ${r.horaHasta || r.horaFin || '00:00'}`,
            r.tipoRecargo || r.tipoServicio || '---',
            r.lugarCobertura || r.lugar || r.motivo || '---',
            r.oficina || r.seccionGrupo || r.grupoUOficina || 'General',
            r.estado || 'Vigente',
            personalNombres,
            r.observaciones || '---',
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [[
            'N°',
            'Fecha',
            'Horario',
            'Tipo de Servicio',
            'Lugar / Evento',
            'Sección',
            'Estado',
            'Personal Designado',
            'Observaciones',
          ]],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [17, 38, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          styles: { fontSize: 7, cellPadding: 1.6, lineColor: [200, 210, 225], lineWidth: 0.1 },
          margin: { left: 10, right: 10 },
        });

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Generador de Reportes de Recargos Policiales</h2>
              <p className="text-xs text-slate-400">
                Filtros por Tipo, Estado, Personal Designado, Sección, Delegación y Rango de Fechas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Categorías Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Tipo de Servicio:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Todos los Tipos</option>
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Servicio de Cancha / Estadio">Servicio de Cancha / Estadio</option>
                <option value="Custodia Judicial / Traslado">Custodia Judicial / Traslado</option>
                <option value="Operativo Prevención">Operativo Prevención</option>
                <option value="Recargo Pericial Extraordinario">Recargo Pericial Extraordinario</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Estado de Recargo:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Todos los Estados</option>
                <option value="Vigente">Vigente</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Personal Designado:</label>
              <select
                value={filtroPersonal}
                onChange={(e) => setFiltroPersonal(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Cualquier efectivo</option>
                {personalList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jerarquia} {p.apellidoYNombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Sección / Grupo:</label>
              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todas">Todas las Secciones</option>
                {seccionesDisponibles.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {puedeVerOtras && (
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">Delegación Policial:</label>
                <select
                  value={filtroDelegacion}
                  onChange={(e) => setFiltroDelegacion(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                >
                  <option value="todas">Todas las Delegaciones</option>
                  {delegacionesList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rango de Fechas */}
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span className="font-bold text-blue-950">Rango de Fecha:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'todo', label: 'Histórico' },
                { id: 'anio', label: 'Año Actual' },
                { id: 'mes', label: 'Mes Actual' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRangoTipo(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer text-center ${
                    rangoTipo === opt.id
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {rangoTipo === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opciones de Hoja */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Orientación:</label>
              <select
                value={orientacion}
                onChange={(e) => setOrientacion(e.target.value as any)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
              >
                <option value="l">Horizontal (Apaisada)</option>
                <option value="p">Vertical (Retrato)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tamaño:</label>
              <select
                value={tamanoPapel}
                onChange={(e) => setTamanoPapel(e.target.value as PdfPaperSize)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="oficio">Oficio (216 × 330 mm)</option>
                <option value="legal">Legal (216 × 356 mm)</option>
                <option value="letter">Carta (216 × 279 mm)</option>
              </select>
            </div>
          </div>

          {/* Resumen estadístico en vivo */}
          <div className="grid grid-cols-3 gap-2.5 border border-slate-200 rounded-xl bg-slate-50 p-3">
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-500">Servicios</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {filteredList.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-500">Asignaciones</div>
              <div className="text-lg font-bold font-mono tabular-nums text-blue-900">
                {filteredList.reduce((acc, r) => acc + (r.personalIds?.length || 0), 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-500">Vigentes</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                {filteredList.filter((r) => r.estado === 'Vigente').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={filteredList.length === 0}
            onClick={handleDescargarPdf}
            className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte PDF ({filteredList.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

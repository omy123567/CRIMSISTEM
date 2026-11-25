import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ConfiguracionSistema,
  MemoNota,
  PdfExportOptions,
} from '../../types/police';
import { MemoTipoOption, normalizeTipoKey } from '../../utils/memosCatalogUtils';
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
  renderBarChartPng,
  renderDonutChartPng,
} from '../../utils/pdfChartUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  X,
  FileBarChart2,
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckSquare,
} from 'lucide-react';

interface MemosReporteModalProps {
  isOpen: boolean;
  memosList: MemoNota[];
  visibleTiposOptions: MemoTipoOption[];
  config: ConfiguracionSistema;
  onClose: () => void;
}

type ModoPeriodo = 'todos' | 'mes' | 'anio' | 'personalizado';

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function getMemoYear(m: MemoNota): number {
  if (m.anio && Number.isFinite(Number(m.anio))) return Number(m.anio);
  const y = Number((m.fecha || '').slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : new Date().getFullYear();
}

function formatFechaAr(ymd?: string): string {
  if (!ymd) return '-';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const MemosReporteModal: React.FC<MemosReporteModalProps> = ({
  isOpen,
  memosList,
  visibleTiposOptions,
  config,
  onClose,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>('todos');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(currentMonth);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(currentYear);
  const [fechaDesde, setFechaDesde] = useState<string>(`${currentYear}-01-01`);
  const [fechaHasta, setFechaHasta] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [destinatarioFiltro, setDestinatarioFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [prioridadFiltro, setPrioridadFiltro] = useState<string>('todas');
  const [anexoFiltro, setAnexoFiltro] = useState<'todos' | 'con' | 'sin'>('todos');
  const [incluirResumen, setIncluirResumen] = useState<boolean>(true);
  const [tituloPersonalizado, setTituloPersonalizado] = useState<string>('');

  const availableYears = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const m of memosList) {
      set.add(getMemoYear(m));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [memosList, currentYear]);

  const availableDestinatarios = useMemo(() => {
    const set = new Set<string>();
    for (const m of memosList) {
      if (m.destino?.trim()) set.add(m.destino.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memosList]);

  const reportRecords = useMemo(() => {
    const destQ = destinatarioFiltro.trim().toLowerCase();
    return memosList.filter((m) => {
      const mYear = getMemoYear(m);
      const mMonth = (m.fecha || '').slice(5, 7);

      if (modoPeriodo === 'anio' && mYear !== anioSeleccionado) {
        return false;
      }
      if (modoPeriodo === 'mes') {
        if (mYear !== anioSeleccionado || mMonth !== mesSeleccionado) {
          return false;
        }
      }
      if (modoPeriodo === 'personalizado') {
        if (fechaDesde && (m.fecha || '') < fechaDesde) return false;
        if (fechaHasta && (m.fecha || '') > fechaHasta) return false;
      }

      if (tipoFiltro !== 'todos' && normalizeTipoKey(m.tipo) !== normalizeTipoKey(tipoFiltro)) {
        return false;
      }
      if (destQ && !(m.destino || '').toLowerCase().includes(destQ)) {
        return false;
      }
      if (estadoFiltro !== 'todos' && m.estado !== estadoFiltro) {
        return false;
      }
      if (prioridadFiltro !== 'todas' && (m.prioridad || 'Normal') !== prioridadFiltro) {
        return false;
      }
      const hasAdj = Boolean(m.archivoDataUrl || (m.adjuntos && m.adjuntos.length > 0));
      if (anexoFiltro === 'con' && !hasAdj) return false;
      if (anexoFiltro === 'sin' && hasAdj) return false;

      return true;
    });
  }, [
    memosList,
    modoPeriodo,
    mesSeleccionado,
    anioSeleccionado,
    fechaDesde,
    fechaHasta,
    tipoFiltro,
    destinatarioFiltro,
    estadoFiltro,
    prioridadFiltro,
    anexoFiltro,
  ]);

  const statsResumen = useMemo(() => {
    const porTipo: Record<string, number> = {};
    const porEstado: Record<string, number> = {};
    const porDestino: Record<string, number> = {};

    for (const m of reportRecords) {
      const t = m.tipo || 'Sin Tipo';
      porTipo[t] = (porTipo[t] || 0) + 1;

      const e = m.estado || 'Emitido';
      porEstado[e] = (porEstado[e] || 0) + 1;

      const d = m.destino || 'Sin Destino';
      porDestino[d] = (porDestino[d] || 0) + 1;
    }

    return {
      porTipo: Object.entries(porTipo).sort((a, b) => b[1] - a[1]),
      porEstado: Object.entries(porEstado).sort((a, b) => b[1] - a[1]),
      porDestino: Object.entries(porDestino).sort((a, b) => b[1] - a[1]),
    };
  }, [reportRecords]);

  if (!isOpen) return null;

  const describePeriodo = (): string => {
    if (modoPeriodo === 'anio') return `Año ${anioSeleccionado}`;
    if (modoPeriodo === 'mes') {
      const mesLbl = MESES.find((m) => m.value === mesSeleccionado)?.label || mesSeleccionado;
      return `${mesLbl} ${anioSeleccionado}`;
    }
    if (modoPeriodo === 'personalizado') {
      return `Desde ${formatFechaAr(fechaDesde)} hasta ${formatFechaAr(fechaHasta)}`;
    }
    return 'Todo el historial';
  };

  const resolvedTitle =
    tituloPersonalizado.trim() ||
    `REPORTE DE MEMOS Y NOTAS (${describePeriodo().toUpperCase()})`;

  const handleGenerarPdf = () => {
    requestPdfExport({
      title: resolvedTitle,
      fileName: `Reporte_Memos_Notas_${new Date().toISOString().split('T')[0]}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: (opts: PdfExportOptions) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(opts.orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(opts.paperSize),
        });

        let y = drawPoliceHeader(doc, config, resolvedTitle);

        const filtrosActivosTexto = [
          `Período: ${describePeriodo()}`,
          `Tipo/Serie: ${tipoFiltro === 'todos' ? 'Todos' : tipoFiltro}`,
          `Destinatario: ${destinatarioFiltro.trim() || 'Todos'}`,
          `Estado: ${estadoFiltro === 'todos' ? 'Todos' : estadoFiltro}`,
          `Prioridad: ${prioridadFiltro === 'todas' ? 'Todas' : prioridadFiltro}`,
          `Total: ${reportRecords.length} doc.`,
        ].join('   |   ');

        y = drawReportFilterBanner(doc, y, filtrosActivosTexto, 14);

        if (incluirResumen && reportRecords.length > 0) {
          const conAnexo = reportRecords.filter((m) => Boolean(m.archivoDataUrl || (m.adjuntos && m.adjuntos.length > 0))).length;
          const urgentes = reportRecords.filter((m) => m.prioridad === 'Urgente' || m.prioridad === 'Reservado').length;

          y = drawExecutiveKpiStrip(
            doc,
            y,
            [
              { label: 'Documentos Filtrados', value: reportRecords.length, subtitle: describePeriodo(), accentColor: [17, 38, 77] },
              { label: 'Tipos / Series', value: statsResumen.porTipo.length, subtitle: 'Categorías utilizadas', accentColor: [29, 78, 216] },
              { label: 'Con Anexo Digital', value: conAnexo, subtitle: `${Math.round((conAnexo / reportRecords.length) * 100)}% respaldados`, accentColor: [15, 118, 110] },
              { label: 'Urgentes / Reservados', value: urgentes, subtitle: 'Prioridad especial', accentColor: [217, 119, 6] },
            ],
            14
          );

          const chartTipos = renderBarChartPng(
            statsResumen.porTipo.map(([label, value]) => ({ label, value })),
            { width: 560, height: 235, barColor: '#11264d' }
          );
          const chartEstados = renderDonutChartPng(
            statsResumen.porEstado.map(([label, value]) => ({ label, value })),
            { width: 560, height: 235, centerLabel: 'MEMOS/NOTAS' }
          );
          y = drawChartSectionGrid(
            doc,
            y,
            [
              { title: 'Distribución por Tipo / Serie de Folio', subtitle: 'Volumen de despachos emitidos', imageDataUrl: chartTipos },
              { title: 'Estado de Tramitación', subtitle: 'Borradores, Emitidos, Enviados y Recepcionados', imageDataUrl: chartEstados },
            ],
            14
          );
        }

        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Tipo / Serie', 'N° Folio / Memo', 'Año', 'Asunto', 'Destinatario', 'Estado', 'Anexo']],
          body: reportRecords.map((m) => [
            formatFechaAr(m.fecha),
            m.tipo,
            m.nroFolioMemo,
            String(getMemoYear(m)),
            m.asunto,
            m.destino,
            m.estado,
            m.archivoNombre || (m.adjuntos && m.adjuntos.length > 0 ? `${m.adjuntos.length} adj.` : 'Sin anexo'),
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

  const handleExportCsv = () => {
    const BOM = '\uFEFF';
    const headers = ['Fecha', 'Año', 'Tipo / Serie', 'N° Folio / Memo', 'Asunto', 'Destinatario', 'Remitente', 'Estado', 'Prioridad', 'Anexo', 'Observaciones'];
    const esc = (v: unknown) => {
      const s = String(v ?? '').replace(/\r?\n/g, ' ');
      return s.includes(',') || s.includes('"') || s.includes(';')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      headers.map(esc).join(','),
      ...reportRecords.map((m) =>
        [
          formatFechaAr(m.fecha),
          getMemoYear(m),
          m.tipo,
          m.nroFolioMemo,
          m.asunto,
          m.destino,
          m.remitenteArea || '',
          m.estado,
          m.prioridad || 'Normal',
          m.archivoNombre || '',
          m.observaciones || '',
        ]
          .map(esc)
          .join(',')
      ),
    ];
    const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Memos_Notas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-400/30 text-blue-300">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Generador de Reportes de Memos y Notas
              </h2>
              <p className="text-[11px] text-slate-300">
                Filtre por Tipo/Serie, Mes, Año, Período personalizado, Destinatario, Estado y previsualice antes de generar el PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Selección de Período */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Calendar className="w-4 h-4 text-blue-800" />
              <span>1. Período del Reporte</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'todos', label: 'Todo el historial' },
                { id: 'mes', label: 'Por Mes y Año' },
                { id: 'anio', label: 'Por Año completo' },
                { id: 'personalizado', label: 'Personalizado (Fechas)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setModoPeriodo(opt.id as ModoPeriodo)}
                  className={`px-3 py-2 rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                    modoPeriodo === opt.id
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {modoPeriodo === 'mes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mes</label>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {MESES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Año</label>
                  <select
                    value={anioSeleccionado}
                    onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {modoPeriodo === 'anio' && (
              <div className="pt-1 max-w-xs">
                <label className="font-bold text-slate-700 block mb-1">Año</label>
                <select
                  value={anioSeleccionado}
                  onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modoPeriodo === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Criterios Específicos */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Filter className="w-4 h-4 text-blue-800" />
              <span>2. Filtros del Reporte (Tipo, Destinatario, Estado y más)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo / Serie de Folio</label>
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
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
                <label className="font-bold text-slate-700 block mb-1">Destinatario</label>
                <input
                  type="text"
                  list="memos-report-destinos"
                  value={destinatarioFiltro}
                  onChange={(e) => setDestinatarioFiltro(e.target.value)}
                  placeholder="Todos o escribir/seleccionar destinatario..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <datalist id="memos-report-destinos">
                  {availableDestinatarios.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estado</label>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Prioridad / Carácter</label>
                <select
                  value={prioridadFiltro}
                  onChange={(e) => setPrioridadFiltro(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="todas">Todas</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Reservado">Reservado</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Archivo Anexo</label>
                <select
                  value={anexoFiltro}
                  onChange={(e) => setAnexoFiltro(e.target.value as 'todos' | 'con' | 'sin')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="todos">Con y sin anexo</option>
                  <option value="con">Solo con archivo anexo</option>
                  <option value="sin">Solo sin archivo anexo</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Título del Reporte (opcional)</label>
                <input
                  type="text"
                  value={tituloPersonalizado}
                  onChange={(e) => setTituloPersonalizado(e.target.value)}
                  placeholder="Título automático según filtros..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={incluirResumen}
                onChange={(e) => setIncluirResumen(e.target.checked)}
                className="w-4 h-4 accent-blue-900"
              />
              <CheckSquare className="w-3.5 h-3.5 text-blue-800" />
              <span className="font-bold text-slate-800">
                Incluir cuadro resumen estadístico (por Tipo/Serie y Estado) al inicio del reporte PDF
              </span>
            </label>
          </div>

          {/* Vista Previa de Resultados del Reporte */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-950 text-sm">
                Vista Previa de Alcance: {reportRecords.length} documento(s) incluido(s)
              </span>
              <span className="text-[11px] font-mono text-blue-900">
                {describePeriodo()}
              </span>
            </div>

            {reportRecords.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-white rounded-lg border border-blue-200/80 p-3">
                  <div className="font-bold text-slate-800 mb-2 text-[11px] uppercase tracking-wide">
                    Gráfico Comparativo por Tipo / Serie de Folio
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statsResumen.porTipo.map(([name, value]) => ({ name, value }))}
                        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="value" name="Documentos" fill="#11264d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-white rounded-lg border border-blue-200/80 p-2.5">
                    <div className="font-bold text-slate-800 mb-1">Por Tipo / Serie</div>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {statsResumen.porTipo.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="truncate text-slate-600">{k}</span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-blue-200/80 p-2.5">
                    <div className="font-bold text-slate-800 mb-1">Por Estado</div>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {statsResumen.porEstado.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="truncate text-slate-600">{k}</span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-blue-200/80 p-2.5">
                    <div className="font-bold text-slate-800 mb-1">Principales Destinatarios</div>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {statsResumen.porDestino.slice(0, 6).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="truncate text-slate-600">{k}</span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-600">
                No existen documentos que coincidan con la combinación de filtros seleccionada.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={reportRecords.length === 0}
              className="px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-45 text-emerald-900 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerarPdf}
              disabled={reportRecords.length === 0}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-45 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Previsualizar y Generar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

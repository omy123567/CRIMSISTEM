import React, { useMemo } from 'react';
import { AccidentologiaRegistro, ConfiguracionSistema } from '../../types/police';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Download,
} from 'lucide-react';
import { generarPdfReporteAccidentologia } from '../../services/pdfService';

interface AccidentologiaReportesViewProps {
  registros: AccidentologiaRegistro[];
  config: ConfiguracionSistema;
}

const COLORS = ['#11264d', '#1d4ed8', '#0284c7', '#0f766e', '#d97706', '#dc2626', '#6d28d9'];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '11px',
  padding: '6px 10px',
};

export const AccidentologiaReportesView: React.FC<AccidentologiaReportesViewProps> = ({
  registros,
  config,
}) => {
  const totalSiniestros = registros.length;

  const kpis = useMemo(() => {
    let conCasco = 0;
    let embestido = 0;
    let embistente = 0;
    let enServicio = 0;
    let franco = 0;
    let lesionesGraves = 0;
    let alcohotestNegativo = 0;

    registros.forEach((r) => {
      if (r.cascoPolicial === 'Colocado') conCasco++;
      if (r.resultadoPolicial === 'EMBESTIDO') embestido++;
      if (r.resultadoPolicial === 'EMBISTENTE') embistente++;
      if (r.tipoServicio === 'ENTRANTE' || r.tipoServicio === 'SALIENTE') enServicio++;
      if (r.tipoServicio === 'FRANCO') franco++;
      if ((r.tipoLesiones || '').toLowerCase().includes('grave')) lesionesGraves++;
      if ((r.alcohotest || '').includes('0.00') || (r.alcohotest || '').toLowerCase().includes('negativo')) {
        alcohotestNegativo++;
      }
    });

    const pctCasco = totalSiniestros > 0 ? Math.round((conCasco / totalSiniestros) * 100) : 0;
    const pctNegativo = totalSiniestros > 0 ? Math.round((alcohotestNegativo / totalSiniestros) * 100) : 0;

    return {
      totalSiniestros,
      conCasco,
      pctCasco,
      embestido,
      embistente,
      enServicio,
      franco,
      lesionesGraves,
      alcohotestNegativo,
      pctNegativo,
    };
  }, [registros, totalSiniestros]);

  const dataPorMes = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const map = new Map<string, number>();
    meses.forEach((m) => map.set(m, 0));

    registros.forEach((r) => {
      const d = new Date(r.fecha + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        const m = meses[d.getMonth()];
        map.set(m, (map.get(m) || 0) + 1);
      }
    });

    return meses.map((mes) => ({
      mes,
      siniestros: map.get(mes) || 0,
    }));
  }, [registros]);

  const dataLesiones = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      const l = r.tipoLesiones?.split('(')[0]?.trim() || 'Sin especificar';
      map[l] = (map[l] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [registros]);

  const dataRodadosPol = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      let t = 'Otro';
      const prod = (r.tipoRodadoPolicial || '').toLowerCase();
      if (prod.includes('moto')) t = 'Motocicleta';
      else if (prod.includes('móvil') || prod.includes('movil') || prod.includes('patrullero') || prod.includes('hilux')) t = 'Móvil Patrullero';
      else if (prod.includes('auto') || prod.includes('corsa') || prod.includes('gol') || prod.includes('cronos')) t = 'Automóvil';
      else if (prod.includes('bici')) t = 'Bicicleta';
      else if (prod.includes('peatón') || prod.includes('peaton')) t = 'Peatón';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, cantidad]) => ({ name, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [registros]);

  const dataVias = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      const v = r.tipoVia || 'RECTA';
      map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map).map(([name, cantidad]) => ({ name, cantidad }));
  }, [registros]);

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Estadísticas y Reportes de Accidentología Vial
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Siniestralidad con personal policial, gravedad de lesiones, seguridad vial y dinámica de colisión.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => generarPdfReporteAccidentologia(registros, config)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start md:self-center"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Informe Pericial (PDF)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="px-4 py-3.5 bg-white">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Siniestros
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalSiniestros}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Servicio: {kpis.enServicio} · Franco: {kpis.franco}
            </div>
          </div>

          <div className="px-4 py-3.5 bg-white">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Uso de Casco Reglamentario
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {kpis.pctCasco}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {kpis.conCasco} de {totalSiniestros} con casco colocado
            </div>
          </div>

          <div className="px-4 py-3.5 bg-white">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Alcohotest Negativo (0.00)
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-900 font-mono tabular-nums">
              {kpis.pctNegativo}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {kpis.alcohotestNegativo} controles negativos
            </div>
          </div>

          <div className="px-4 py-3.5 bg-white">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Lesiones Graves / Dinámica
            </div>
            <div className="mt-1 text-2xl font-bold text-rose-700 font-mono tabular-nums">
              {kpis.lesionesGraves}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Embestido: {kpis.embestido} · Embistente: {kpis.embistente}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                Evolución Mensual de Siniestros
              </h3>
              <p className="text-[11px] text-slate-500">Curva mensual de ocurrencia anual</p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              Total: {totalSiniestros}
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPorMes} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <defs>
                  <linearGradient id="accMesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="siniestros"
                  name="Siniestros"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  fill="url(#accMesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                Tipo de Rodado del Personal Policial
              </h3>
              <p className="text-[11px] text-slate-500">Vehículos involucrados por categoría</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {dataRodadosPol.length} tipos
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataRodadosPol} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 10, fill: '#334155' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="cantidad" name="Efectivos" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                Distribución por Gravedad de Lesiones
              </h3>
              <p className="text-[11px] text-slate-500">Proporción clínica declarada en actuaciones</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {dataLesiones.length} categ.
            </span>
          </div>
          <div className="h-60 w-full flex flex-col sm:flex-row items-center gap-3">
            {dataLesiones.length > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-48 sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataLesiones}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {dataLesiones.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {dataLesiones.map((item, idx) => {
                    const pct = totalSiniestros > 0 ? Math.round((item.value / totalSiniestros) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-2 text-xs py-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="truncate text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                          {item.value} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 mx-auto">Sin datos de lesiones registrados</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                Configuración de Vía
              </h3>
              <p className="text-[11px] text-slate-500">Recta, intersección, rotonda y ruta</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {dataVias.length} vías
            </span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataVias} margin={{ top: 8, right: 10, left: -16, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="cantidad" name="Siniestros" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

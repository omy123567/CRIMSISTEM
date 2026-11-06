import React, { useMemo } from 'react';
import { AccidentologiaRegistro, ConfiguracionSistema } from '../../types/police';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  PieChart as PieIcon,
  Download,
  ShieldAlert,
  Car,
  Activity,
  Award,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { generarPdfReporteAccidentologia } from '../../services/pdfService';

interface AccidentologiaReportesViewProps {
  registros: AccidentologiaRegistro[];
  config: ConfiguracionSistema;
}

const COLORS = ['#1e3a8a', '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AccidentologiaReportesView: React.FC<AccidentologiaReportesViewProps> = ({
  registros,
  config,
}) => {
  // KPIs analíticos
  const totalSiniestros = registros.length;

  const kpis = useMemo(() => {
    let conCasco = 0;
    let embestido = 0;
    let embistente = 0;
    let enServicio = 0; // Entrante o Saliente
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

  // Datos para gráfico por Mes
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

  // Datos para gráfico de Lesiones
  const dataLesiones = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      const l = r.tipoLesiones?.split('(')[0]?.trim() || 'Sin especificar';
      map[l] = (map[l] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [registros]);

  // Datos para gráfico de Rol: Embestido vs Embistente
  const dataRol = useMemo(() => {
    return [
      { name: 'Embestido', value: kpis.embestido },
      { name: 'Embistente', value: kpis.embistente },
    ].filter((d) => d.value > 0);
  }, [kpis]);

  // Datos para gráfico de Rodados Policiales
  const dataRodadosPol = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      let t = 'Otro';
      const prod = (r.tipoRodadoPolicial || '').toLowerCase();
      if (prod.includes('moto')) t = 'Motocicleta Oficial/Part.';
      else if (prod.includes('móvil') || prod.includes('movil') || prod.includes('patrullero') || prod.includes('hilux')) t = 'Móvil Patrullero';
      else if (prod.includes('auto') || prod.includes('corsa') || prod.includes('gol') || prod.includes('cronos')) t = 'Automóvil';
      else if (prod.includes('bici')) t = 'Bicicleta';
      else if (prod.includes('peatón') || prod.includes('peaton')) t = 'Peatón';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, cantidad]) => ({ name, cantidad }));
  }, [registros]);

  // Datos para Tipo de Vía
  const dataVias = useMemo(() => {
    const map: Record<string, number> = {};
    registros.forEach((r) => {
      const v = r.tipoVia || 'RECTA';
      map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map).map(([name, cantidad]) => ({ name, cantidad }));
  }, [registros]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner Superior con KPIs y Botón Exportar PDF */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-blue-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold tracking-tight">
              Módulo de Reportes y Estadísticas de Accidentología Vial
            </h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Análisis cuantitativo de siniestralidad, gravedad de lesiones, dinámica de colisiones y cumplimiento de elementos de seguridad policial.
          </p>
        </div>

        <button
          onClick={() => generarPdfReporteAccidentologia(registros, config)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer self-start md:self-center"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Descargar Informe Pericial Completo (PDF)</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-slate-500 font-bold flex items-center justify-between">
            <span>Total Siniestros</span>
            <Car className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalSiniestros}</div>
          <span className="text-[10px] text-slate-500">Hechos con efectivos policiales</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-slate-500 font-bold flex items-center justify-between">
            <span>Uso de Casco</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{kpis.pctCasco}%</div>
          <span className="text-[10px] text-slate-500">{kpis.conCasco} de {totalSiniestros} con casco colocado</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-slate-500 font-bold flex items-center justify-between">
            <span>Alcohotest 0.00</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 font-mono">{kpis.pctNegativo}%</div>
          <span className="text-[10px] text-slate-500">{kpis.alcohotestNegativo} con resultado negativo</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-slate-500 font-bold flex items-center justify-between">
            <span>Lesiones Graves</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">{kpis.lesionesGraves}</div>
          <span className="text-[10px] text-slate-500">Derivados a nosocomios centrales</span>
        </div>
      </div>

      {/* Gráficos Recharts en Grilla */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Siniestros por Mes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-800" />
              <span>Siniestros Viales por Mes del Año</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Total: {totalSiniestros}</span>
          </div>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="siniestros" name="Siniestros" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Rodados del Personal Policial */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-700" />
              <span>Tipo de Rodado del Personal Policial</span>
            </span>
          </div>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataRodadosPol} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="cantidad" name="Efectivos" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Gravedad de Lesiones */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              <span>Distribución por Gravedad de Lesiones</span>
            </span>
          </div>
          <div className="h-60 w-full text-xs flex items-center justify-center">
            {dataLesiones.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataLesiones}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {dataLesiones.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400">Sin datos de lesiones</p>
            )}
          </div>
        </div>

        {/* Gráfico 4: Tipo de Vía del Siniestro */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-700" />
              <span>Configuración de Vía (Recta vs Intersección vs Rotonda)</span>
            </span>
          </div>
          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataVias}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="cantidad" name="Siniestros" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

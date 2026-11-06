import React, { useState, useMemo } from 'react';
import {
  Personal,
  ExpedienteJudicial,
  CasoFaltaOficio,
  MovilPolicial,
  ParteNovedadesGuardia,
  ConfiguracionSistema,
  InspeccionOcular,
} from '../../types/police';
import {
  Users,
  UserX,
  FileText,
  AlertTriangle,
  Car,
  Calendar,
  Download,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  Camera,
} from 'lucide-react';
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
} from 'recharts';
import {
  generarPdfReporteEjecutivo,
  generarPdfReporteInspeccionesOcularesPorTipo,
} from '../../services/pdfService';
import { BirthdayDashboardWidget } from './BirthdayDashboardWidget';


interface DashboardViewProps {
  personalList: Personal[];
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  movilesList: MovilPolicial[];
  partesGuardiaList: ParteNovedadesGuardia[];
  inspeccionesList?: InspeccionOcular[];
  config: ConfiguracionSistema;
  onNavigate: (tab: any) => void;
}

export type PeriodoTipo = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado';

const COLORS = ['#1d4ed8', '#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#7c3aed'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  personalList,
  expedientesList,
  casosFaltaOficioList,
  movilesList,
  partesGuardiaList,
  inspeccionesList = [],
  config,
  onNavigate,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes');
  const [anioFiltro, setAnioFiltro] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Filtrado reactivo por período y año seleccionado
  const expedientesFiltrados = useMemo(() => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);

    return expedientesList.filter((exp) => {
      const fStr = exp.fechaRegistro;
      if (!fStr) return true;

      // Filtro por año seleccionado
      if (anioFiltro !== 'todos') {
        if (!fStr.startsWith(anioFiltro)) return false;
      }

      if (periodo === 'hoy') {
        return fStr === hoyStr;
      }
      if (periodo === 'semana') {
        const d = new Date(fStr);
        const diffDias = (hoy.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDias >= 0 && diffDias <= 7;
      }
      if (periodo === 'mes') {
        const d = new Date(fStr);
        return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
      }
      if (periodo === 'año') {
        const d = new Date(fStr);
        return d.getFullYear() === hoy.getFullYear();
      }
      if (periodo === 'personalizado' && fechaDesde && fechaHasta) {
        return fStr >= fechaDesde && fStr <= fechaHasta;
      }
      return true;
    });
  }, [expedientesList, periodo, anioFiltro, fechaDesde, fechaHasta]);

  // Partes de guardia filtrados por año
  const partesFiltrados = useMemo(() => {
    if (anioFiltro === 'todos') return partesGuardiaList;
    return partesGuardiaList.filter((p) => p.fechaInicio && p.fechaInicio.startsWith(anioFiltro));
  }, [partesGuardiaList, anioFiltro]);

  // Cálculos de KPIs
  const totalPersonalActivo = personalList.filter((p) => p.estado === 'Activo').length;
  const personalLicencia = personalList.filter(
    (p) => p.estado === 'Licencia Médica' || p.estado === 'Licencia Anual'
  ).length;

  const casosFaltaOficioPendientes = casosFaltaOficioList.filter((c) => c.estado === 'Pendiente').length;
  const causasConPPI = expedientesFiltrados.filter((e) => e.ppi?.tienePPI).length;

  const movilesOperativos = movilesList.filter((m) => m.estadoOperativo === 'En Servicio').length;
  const movilesTaller = movilesList.filter(
    (m) => m.estadoOperativo === 'En Taller Mecánico' || m.estadoOperativo === 'Fuera de Servicio'
  ).length;

  // Vencimientos de RTO y Seguro próximos (dentro de 30 días o ya vencidos)
  const movilesConAlertaVencimiento = useMemo(() => {
    const hoy = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(hoy.getDate() + 30);

    return movilesList.filter((m) => {
      const rto = m.vencimientoRTO ? new Date(m.vencimientoRTO) : null;
      const seg = m.vencimientoSeguro ? new Date(m.vencimientoSeguro) : null;
      const rtoAlerta = rto ? rto <= en30Dias : false;
      const segAlerta = seg ? seg <= en30Dias : false;
      return rtoAlerta || segAlerta;
    });
  }, [movilesList]);

  // REGLA ESTRICTA DE CONTEO EN ESTADÍSTICAS:
  // "la cantidad del tipo de requerimiento 'Resguardo de Evidencia' se debe sumar por la cantidad de personas vinculadas, no simplemente por cantidad de expedientes registrados"
  const tareasStats = useMemo(() => {
    const map: Record<string, number> = {};
    let totalResguardoPersonas = 0;

    expedientesFiltrados.forEach((exp) => {
      const tipo = exp.tipoRequerimiento || 'Otro';
      if (tipo === 'Resguardo de Evidencia') {
        const cantPersonas = exp.personasVinculadas?.length || 1;
        map[tipo] = (map[tipo] || 0) + cantPersonas;
        totalResguardoPersonas += cantPersonas;
      } else {
        map[tipo] = (map[tipo] || 0) + 1;
      }
    });

    const data = Object.entries(map).map(([name, count]) => ({
      name,
      count,
    }));
    return { data, totalResguardoPersonas };
  }, [expedientesFiltrados]);

  // Distribución por dependencia solicitante
  const dependenciasStats = useMemo(() => {
    const map: Record<string, number> = {};
    expedientesFiltrados.forEach((exp) => {
      const dep = exp.dependenciaSolicitante || 'Otras Dependencias';
      map[dep] = (map[dep] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [expedientesFiltrados]);

  // Inspecciones Oculares por Tipo
  const inspeccionesStats = useMemo(() => {
    let criminalistica = 0;
    let accidentologia = 0;
    partesFiltrados.forEach((parte) => {
      parte.intervenciones.forEach((interv) => {
        if (interv.tipoIntervencion === 'Accidentológica') accidentologia++;
        else criminalistica++;
      });
    });
    return [
      { name: 'Criminalística', value: criminalistica },
      { name: 'Accidentología Vial', value: accidentologia },
    ];
  }, [partesFiltrados]);

  const handleExportPdf = () => {
    generarPdfReporteEjecutivo(
      {
        totalPersonalActivo,
        personalLicencia,
        expedientesPeriodo: expedientesFiltrados.length,
        faltaOficio: casosFaltaOficioPendientes,
        ppiCount: causasConPPI,
        movilesOperativos,
        movilesTaller,
        resguardoTotalPersonas: tareasStats.totalResguardoPersonas,
        periodoNombre:
          periodo === 'hoy'
            ? 'Día de la Fecha'
            : periodo === 'semana'
            ? 'Últimos 7 Días'
            : periodo === 'mes'
            ? 'Mes en Curso'
            : periodo === 'año'
            ? 'Año en Curso'
            : `Rango ${fechaDesde} al ${fechaHasta}`,
        tareasDistribucion: tareasStats.data,
        dependenciasDistribucion: dependenciasStats,
      },
      config
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Ejecutivo Policial
            </h1>
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
              Operativo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Métricas de gestión, causas en curso, parque automotor y regla estadística de resguardo aplicada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Año Solicitado */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-900" />
            <span className="font-semibold text-slate-700">Año:</span>
            <select
              value={anioFiltro}
              onChange={(e) => setAnioFiltro(e.target.value)}
              className="bg-transparent font-bold text-blue-900 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">2026 (Actual)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Selector de Período */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            {(['hoy', 'semana', 'mes', 'año', 'personalizado'] as PeriodoTipo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  periodo === p
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'año' ? 'Año' : p}
              </button>
            ))}
          </div>

          {periodo === 'personalizado' && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-xs"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-xs"
              />
            </div>
          )}

          {/* Botones Exportar PDF Oficial */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Exportar Reporte Ejecutivo de Gestión en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Reporte PDF</span>
          </button>

          <button
            onClick={() => generarPdfReporteInspeccionesOcularesPorTipo(inspeccionesList, config)}
            className="flex items-center gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Exportar Reporte de Inspecciones Oculares por Tipo con resumen"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Reporte I.O. por Tipo (PDF)</span>
          </button>
        </div>
      </div>

      {/* Regla Estadística Highlight Banner */}
      <div className="bg-linear-to-r from-blue-950 to-slate-900 text-white p-3.5 rounded-xl border border-blue-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-800/50 rounded-lg border border-blue-600/40">
            <FileCheck2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-200 uppercase tracking-wide">
              Regla Oficial de Conteo Estadístico de Resguardo
            </div>
            <div className="text-xs text-slate-300">
              En este período se contabilizan{' '}
              <strong className="text-white font-mono text-sm underline decoration-blue-400">
                {tareasStats.totalResguardoPersonas} personas vinculadas
              </strong>{' '}
              bajo custodia en Resguardo de Evidencia (no limitado a cantidad de oficios).
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de KPIs clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Activo */}
        <div
          onClick={() => onNavigate('personal')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Personal Activo
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalPersonalActivo}
            </span>
            <span className="text-xs text-slate-500">efectivos de guardia/planta</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium flex items-center gap-1">
            <UserX className="w-3 h-3" />
            <span>{personalLicencia} en uso de licencia médica/anual</span>
          </div>
        </div>

        {/* Expedientes del Período */}
        <div
          onClick={() => onNavigate('expedientes')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Expedientes Judiciales
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {expedientesFiltrados.length}
            </span>
            <span className="text-xs text-slate-500">tramitados en período</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-blue-700">
              {expedientesFiltrados.filter((e) => e.estadoEntrega === 'Entregado').length} elevados
            </span>
            <span>•</span>
            <span className="text-slate-600">
              {expedientesFiltrados.filter((e) => e.estadoEntrega === 'No entregado').length} en trámite
            </span>
          </div>
        </div>

        {/* Falta de Oficio y PPI */}
        <div
          onClick={() => onNavigate('falta-oficio')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-red-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Falta de Oficio & PPI
            </span>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-600 font-mono">
              {casosFaltaOficioPendientes}
            </span>
            <span className="text-xs text-slate-500">casos urgentes preliminares</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-purple-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            <span>{causasConPPI} causas con Personal Involucrado (PPI)</span>
          </div>
        </div>

        {/* Móviles & Mantenimiento */}
        <div
          onClick={() => onNavigate('moviles')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Parque Automotor
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700 group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {movilesOperativos}{' '}
              <span className="text-sm font-normal text-slate-400">/ {movilesList.length}</span>
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Operativos</span>
          </div>
          <div className="mt-2 text-[11px] text-orange-700 font-medium flex items-center gap-1">
            <span>{movilesTaller} en taller</span>
            <span>•</span>
            <span className="text-red-600">{movilesConAlertaVencimiento.length} alertas RTO/Seguro</span>
          </div>
        </div>
      </div>

      {/* Alerta de Cumpleaños con Calendario Interactivo */}
      <BirthdayDashboardWidget
        personalList={personalList}
        config={config}
        onNavigateToPersonnel={() => onNavigate('personal')}
      />

      {/* Gráficos Estadísticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Tareas Operativas con Regla de Conteo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Distribución por Tarea Operativa
              </h3>
              <p className="text-xs text-slate-500">
                Resguardo de Evidencia sumado por personas vinculadas
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tareasStats.data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} requerimientos / personas`, 'Volumen']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Dependencias Solicitantes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Dependencias Solicitantes
              </h3>
              <p className="text-xs text-slate-500">
                Distribución de requerimientos de comisarías y juzgados
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-400 font-mono">TOP REQUERIMIENTOS</div>
          </div>

          <div className="h-64 flex flex-col sm:flex-row items-center justify-center">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dependenciasStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {dependenciasStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full sm:w-1/2 space-y-1.5 pl-2">
              {dependenciasStats.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[160px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate text-slate-700" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intervenciones Oculares por Tipo e Historial de Guardia */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Inspecciones Oculares e Intervenciones de Guardia por Tipo
            </h3>
            <p className="text-xs text-slate-500">
              Criminalística Pericial vs. Accidentología Vial de acuerdo a los partes correlativos
            </p>
          </div>
          <button
            onClick={() => onNavigate('guardias')}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Libro de Guardia Completo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50/70 border border-blue-100">
            <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg font-mono">
              {inspeccionesStats[0].value}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Intervenciones Criminalísticas</div>
              <div className="text-xs text-slate-600">
                Secuestros, aprehensiones, armas de fuego, robos y dermotest
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50/70 border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-lg font-mono">
              {inspeccionesStats[1].value}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Intervenciones Accidentológicas</div>
              <div className="text-xs text-slate-600">
                Siniestros viales con relevamiento de móviles, circulación, impacto y lesiones
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

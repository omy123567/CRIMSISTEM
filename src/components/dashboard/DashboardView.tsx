import React, { useState, useMemo } from 'react';
import {
  Personal,
  ExpedienteJudicial,
  CasoFaltaOficio,
  MovilPolicial,
  ParteNovedadesGuardia,
  ConfiguracionSistema,
  InspeccionOcular,
  CharlaPrevencion,
  IntervencionParte,
  RecargoOperativo,
  MemoNota,
  FolioAsignado,
  SerieNumerario,
  AccidentologiaRegistro,
  LicenciaPolicial,
  SaldoLicenciaAnio,
  InformeTecnico,
  ReparacionMecanica,
  AvisoNovedad,
  GrupoPersonal,
  ForenseTurno,
  UsuarioSistema,
  InventarioBien,
  ActaCambioJefe,
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
  BookOpen,
  Clock,
  MapPin,
  UserCheck,
  BarChart3,
  Printer,
  Layers,
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
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  generarPdfReporteEjecutivo,
  generarPdfReporteInspeccionesOcularesPorTipo,
  generarPdfLibroExpedientes,
  generarPdfReporteIntervenciones,
  generarPdfReporteGuardias,
  generarPdfReporteInformesTecnicos,
  generarPdfReporteAccidentologia,
  generarPdfReporteLicencias,
} from '../../services/pdfService';
import { BirthdayDashboardWidget } from './BirthdayDashboardWidget';
import { formatFechaDDMMAAAA } from '../charlas/CharlaModal';
import { getDiasHastaCharla } from '../charlas/CharlasPrevencionView';
import { isSerieHiddenForUser } from '../../utils/memosCatalogUtils';
import { calcularAniosAntiguedad, getDiasEscalaArt7 } from '../../services/licenciaService';

interface DashboardViewProps {
  personalList: Personal[];
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  movilesList: MovilPolicial[];
  partesGuardiaList: ParteNovedadesGuardia[];
  inspeccionesList?: InspeccionOcular[];
  charlasList?: CharlaPrevencion[];
  intervencionesList?: IntervencionParte[];
  recargosList?: RecargoOperativo[];
  memosNotasList?: MemoNota[];
  foliosList?: FolioAsignado[];
  seriesNumerarioList?: SerieNumerario[];
  accidentologiaList?: AccidentologiaRegistro[];
  licenciasPolicialesList?: LicenciaPolicial[];
  saldosLicenciasList?: SaldoLicenciaAnio[];
  informesTecnicosList?: InformeTecnico[];
  reparacionesList?: ReparacionMecanica[];
  novedadesList?: AvisoNovedad[];
  gruposList?: GrupoPersonal[];
  forensesList?: ForenseTurno[];
  inventarioBienesList?: InventarioBien[];
  actasCambioJefeList?: ActaCambioJefe[];
  currentUser?: UsuarioSistema;
  config: ConfiguracionSistema;
  onNavigate: (tab: any) => void;
}

export type PeriodoTipo = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado';
type DashboardTab = 'resumen' | 'modulos' | 'reportes';

const COLORS = ['#11264d', '#1d4ed8', '#0284c7', '#0f766e', '#d97706', '#dc2626', '#6d28d9', '#475569'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '12px',
  padding: '8px 10px',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  personalList,
  expedientesList,
  casosFaltaOficioList,
  movilesList,
  partesGuardiaList,
  inspeccionesList = [],
  charlasList = [],
  intervencionesList = [],
  recargosList = [],
  memosNotasList = [],
  foliosList = [],
  seriesNumerarioList = [],
  accidentologiaList = [],
  licenciasPolicialesList = [],
  saldosLicenciasList = [],
  informesTecnicosList = [],
  reparacionesList = [],
  gruposList = [],
  forensesList = [],
  inventarioBienesList = [],
  actasCambioJefeList = [],
  currentUser,
  config,
  onNavigate,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes');
  const [anioFiltro, setAnioFiltro] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<DashboardTab>('resumen');

  // Series y Folios visibles respetando estrictamente restricciones por perfil (ej. Memorandum R)
  const visibleSeries = useMemo(() => {
    return (seriesNumerarioList || []).filter((s) => !isSerieHiddenForUser(s, currentUser));
  }, [seriesNumerarioList, currentUser]);

  const visibleSeriesIds = useMemo(() => new Set(visibleSeries.map((s) => s.id)), [visibleSeries]);

  const visibleFolios = useMemo(() => {
    return (foliosList || []).filter((f) => visibleSeriesIds.has(f.serieId));
  }, [foliosList, visibleSeriesIds]);

  const availableYears = useMemo(() => {
    const years = new Set<string>([String(new Date().getFullYear()), '2026', '2025', '2024']);
    expedientesList.forEach((e) => {
      if (e.fechaRegistro?.length >= 4) years.add(e.fechaRegistro.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [expedientesList]);

  // Filtrado reactivo por período y año seleccionado
  const expedientesFiltrados = useMemo(() => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);

    return expedientesList.filter((exp) => {
      const fStr = exp.fechaRegistro;
      if (!fStr) return true;

      if (anioFiltro !== 'todos' && !fStr.startsWith(anioFiltro)) {
        return false;
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

  // Intervenciones combinadas filtradas por año
  const intervencionesFiltradas = useMemo(() => {
    if (intervencionesList.length > 0) {
      return anioFiltro === 'todos'
        ? intervencionesList
        : intervencionesList.filter((i) => (i.inspeccionFecha || i.createdAt || '').startsWith(anioFiltro));
    }
    return partesFiltrados.flatMap((p) => p.intervenciones || []);
  }, [intervencionesList, partesFiltrados, anioFiltro]);

  // Cálculos de KPIs
  const totalPersonalActivo = personalList.filter((p) => p.estado === 'Activo').length;
  const personalLicencia = personalList.filter(
    (p) => p.estado === 'Licencia Médica' || p.estado === 'Licencia Anual'
  ).length;

  const casosFaltaOficioPendientes = casosFaltaOficioList.filter((c) => c.estado === 'Pendiente').length;
  const causasExpPPI = expedientesFiltrados.filter((e) => e.ppi?.tienePPI || e.involucraPersonalPolicial).length;

  const causasIntervencionesPoliciales = useMemo(() => {
    let count = 0;
    partesFiltrados.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        const tienePolicial =
          !!interv.involucraPersonalPolicial ||
          (interv.involucrados || []).some((inv) => !!inv.esPersonalPolicial);
        if (tienePolicial) count++;
      });
    });
    return count;
  }, [partesFiltrados]);

  const causasInspeccionesPoliciales = useMemo(() => {
    return (inspeccionesList || []).filter((io) => {
      if (anioFiltro !== 'todos' && io.fecha && !io.fecha.startsWith(anioFiltro)) {
        return false;
      }
      return !!io.involucraPersonalPolicial;
    }).length;
  }, [inspeccionesList, anioFiltro]);

  const causasConPPI = causasExpPPI + causasIntervencionesPoliciales + causasInspeccionesPoliciales;

  const totalFallecidosIntervenciones = useMemo(() => {
    let count = 0;
    partesFiltrados.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        (interv.involucrados || []).forEach((inv) => {
          if (inv.fallecido) count++;
        });
      });
    });
    return count;
  }, [partesFiltrados]);

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
  // 'Resguardo de Evidencia' suma cantidad de personas vinculadas (personasVinculadas?.length || 1)
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

    const data = Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
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

  // Evolución mensual multifuente (Expedientes, Intervenciones, Inspecciones Oculares)
  const actividadMensual = useMemo(() => {
    const targetYear = anioFiltro !== 'todos' ? anioFiltro : String(new Date().getFullYear());
    const rows = MESES_CORTOS.map((mes) => ({
      mes,
      expedientes: 0,
      intervenciones: 0,
      io: 0,
    }));

    const parseMonth = (dateStr?: string): number | null => {
      if (!dateStr) return null;
      if (anioFiltro !== 'todos' && !dateStr.startsWith(targetYear)) return null;
      if (anioFiltro === 'todos' && !dateStr.startsWith(targetYear)) {
        // Si es 'todos', acumulamos por mes del año calendario independientemente del año
        const m = Number(dateStr.slice(5, 7));
        return m >= 1 && m <= 12 ? m - 1 : null;
      }
      const m = Number(dateStr.slice(5, 7));
      return m >= 1 && m <= 12 ? m - 1 : null;
    };

    expedientesList.forEach((e) => {
      const idx = parseMonth(e.fechaRegistro);
      if (idx !== null) rows[idx].expedientes += 1;
    });
    intervencionesFiltradas.forEach((i) => {
      const idx = parseMonth(i.inspeccionFecha || i.createdAt);
      if (idx !== null) rows[idx].intervenciones += 1;
    });
    inspeccionesList.forEach((io) => {
      const idx = parseMonth(io.fecha);
      if (idx !== null) rows[idx].io += 1;
    });

    return rows;
  }, [expedientesList, intervencionesFiltradas, inspeccionesList, anioFiltro]);

  // Inspecciones Oculares por Tipo
  const inspeccionesStats = useMemo(() => {
    let criminalistica = 0;
    let accidentologia = 0;
    partesFiltrados.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        if (interv.tipoIntervencion === 'Accidentológica') accidentologia++;
        else criminalistica++;
      });
    });
    return [
      { name: 'Criminalística', value: criminalistica },
      { name: 'Accidentología Vial', value: accidentologia },
    ];
  }, [partesFiltrados]);

  // Estado operativo transversal (Móviles, Licencias, Folios, Memos, Recargos, Informes)
  const estadoTransversalData = useMemo(() => {
    return [
      { name: 'Móviles Serv.', value: movilesOperativos, secondary: movilesTaller },
      { name: 'Recargos Vig.', value: recargosList.filter((r) => r.estado === 'Vigente').length, secondary: recargosList.filter((r) => r.estado !== 'Vigente').length },
      { name: 'Informes Elev.', value: informesTecnicosList.filter((i) => i.estado !== 'En Confección').length, secondary: informesTecnicosList.filter((i) => i.estado === 'En Confección').length },
      { name: 'Memos Visibles', value: memosNotasList.length, secondary: 0 },
      { name: 'Folios Asig.', value: visibleFolios.length, secondary: 0 },
      { name: 'Licencias', value: licenciasPolicialesList.length, secondary: licenciasPolicialesList.filter((l) => l.fueInterrumpida).length },
    ];
  }, [movilesOperativos, movilesTaller, recargosList, informesTecnicosList, memosNotasList, visibleFolios, licenciasPolicialesList]);

  // Matriz completa de estadísticas por módulo
  const modulosMatrix = useMemo(() => {
    const aDeterminarInterv = intervencionesFiltradas.filter(
      (i) =>
        i.tipoLesionesLC === 'A Determinar' ||
        (i.involucrados || []).some((inv) => inv.tipoLesion === 'A Determinar')
    ).length;
    const accPendientes = accidentologiaList.filter(
      (a) => a.faltaDatos || (a.tipoLesiones || '').toLowerCase().includes('determinar')
    ).length;

    return [
      {
        id: 'expedientes',
        modulo: 'Expedientes Judiciales',
        total: expedientesList.length,
        detalle: `${expedientesList.filter((e) => e.estadoEntrega === 'Entregado').length} entregados · ${tareasStats.totalResguardoPersonas} pers. resguardo`,
        alerta: expedientesList.filter((e) => e.estadoEntrega === 'No entregado').length > 0 ? `${expedientesList.filter((e) => e.estadoEntrega === 'No entregado').length} pendientes` : 'Al día',
      },
      {
        id: 'falta-oficio',
        modulo: 'Falta de Oficio',
        total: casosFaltaOficioList.length,
        detalle: `${casosFaltaOficioPendientes} pendientes de recepción formal`,
        alerta: casosFaltaOficioPendientes > 0 ? `${casosFaltaOficioPendientes} urgentes` : 'Sin pendientes',
      },
      {
        id: 'guardias',
        modulo: 'Guardias y Novedades',
        total: partesGuardiaList.length,
        detalle: `${partesGuardiaList.filter((p) => p.cerrado).length} cerrados · ${gruposList.length} grupos activos`,
        alerta: `${partesGuardiaList.filter((p) => !p.cerrado).length} en turno`,
      },
      {
        id: 'intervenciones',
        modulo: 'Intervenciones Periciales',
        total: intervencionesFiltradas.length,
        detalle: `${inspeccionesStats[0].value} Criminalística · ${inspeccionesStats[1].value} Accidentología`,
        alerta: aDeterminarInterv > 0 ? `${aDeterminarInterv} lesiones a determinar` : 'Completas',
      },
      {
        id: 'inspecciones',
        modulo: 'Inspecciones Oculares (I.O.)',
        total: inspeccionesList.length,
        detalle: `${inspeccionesList.reduce((acc, i) => acc + (i.cantidadFotografias || 0), 0)} fotografías relevadas`,
        alerta: `${inspeccionesList.filter((i) => !i.fotosConfirmadas).length} fotos s/confirmar`,
      },
      {
        id: 'personal',
        modulo: 'Personal Policial',
        total: personalList.length,
        detalle: `${totalPersonalActivo} activos · ${personalLicencia} de licencia`,
        alerta: `${personalList.filter((p) => p.armamento?.secuestradoORetenido).length} armas retenidas`,
      },
      {
        id: 'moviles',
        modulo: 'Parque Automotor',
        total: movilesList.length,
        detalle: `${movilesOperativos} en servicio · ${reparacionesList.length} reparaciones`,
        alerta: movilesConAlertaVencimiento.length > 0 ? `${movilesConAlertaVencimiento.length} RTO/Seguro` : 'Al día',
      },
      {
        id: 'recargos',
        modulo: 'Recargos de Servicio',
        total: recargosList.length,
        detalle: `${recargosList.filter((r) => r.estado === 'Vigente').length} vigentes`,
        alerta: 'Operativo',
      },
      {
        id: 'informes-tecnicos',
        modulo: 'Informes Técnicos',
        total: informesTecnicosList.length,
        detalle: `${informesTecnicosList.filter((i) => i.estado === 'Recepcionado').length} recepcionados`,
        alerta: `${informesTecnicosList.filter((i) => i.estado === 'En Confección').length} en confección`,
      },
      {
        id: 'memos-notas',
        modulo: 'Memos y Notas',
        total: memosNotasList.length,
        detalle: `Despacho administrativo visible según perfil`,
        alerta: `${memosNotasList.filter((m) => m.prioridad === 'Urgente').length} urgentes`,
      },
      {
        id: 'numerario',
        modulo: 'Control de Folios',
        total: visibleFolios.length,
        detalle: `${visibleSeries.length} series habilitadas para su perfil`,
        alerta: 'Numeración controlada',
      },
      {
        id: 'licencias-policiales',
        modulo: 'Licencias Policiales',
        total: licenciasPolicialesList.length,
        detalle: `${licenciasPolicialesList.filter((l) => l.fueInterrumpida).length} interrumpidas Art. 15`,
        alerta: 'Régimen vigente',
      },
      {
        id: 'accidentologia',
        modulo: 'Accidentología Policial',
        total: accidentologiaList.length,
        detalle: `Siniestros viales con personal policial`,
        alerta: accPendientes > 0 ? `${accPendientes} datos pendientes` : 'Completo',
      },
      {
        id: 'charlas-prevencion',
        modulo: 'Charlas de Prevención',
        total: charlasList.length,
        detalle: `${charlasList.filter((c) => c.estado === 'Realizada').length} realizadas · ${charlasList.filter((c) => c.estado === 'Programada').length} programadas`,
        alerta: `${forensesList.length} forenses catálogo`,
      },
      {
        id: 'inventario',
        modulo: 'Inventario y Cambio de Jefe',
        total: inventarioBienesList.length,
        detalle: `${actasCambioJefeList.length} actas de relevo · ${inventarioBienesList.filter((b) => b.verificadoOk).length} bienes verificados`,
        alerta: `${inventarioBienesList.filter((b) => b.estadoConservacion === 'Malo / Deteriorado' || b.estadoConservacion === 'Fuera de Servicio' || b.estadoConservacion === 'En Reparación').length} con novedad`,
      },
    ];
  }, [
    expedientesList,
    tareasStats.totalResguardoPersonas,
    casosFaltaOficioList,
    casosFaltaOficioPendientes,
    partesGuardiaList,
    gruposList.length,
    intervencionesFiltradas,
    inspeccionesStats,
    inspeccionesList,
    personalList,
    totalPersonalActivo,
    personalLicencia,
    movilesList,
    movilesOperativos,
    reparacionesList.length,
    movilesConAlertaVencimiento.length,
    recargosList,
    informesTecnicosList,
    memosNotasList,
    visibleFolios.length,
    visibleSeries.length,
    licenciasPolicialesList,
    accidentologiaList,
    charlasList,
    forensesList.length,
    inventarioBienesList,
    actasCambioJefeList,
  ]);

  // Próximas Charlas y Prevención Comunitaria
  const charlasProximas = useMemo(() => {
    return (charlasList || [])
      .filter((c) => {
        if (c.estado === 'Realizada' || c.estado === 'Suspendida') return false;
        return getDiasHastaCharla(c.fecha) >= 0;
      })
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
      .slice(0, 5);
  }, [charlasList]);

  // Resumen de saldos de licencias para exportación directa desde Dashboard
  const resumenSaldosLicencias = useMemo(() => {
    return personalList.map((p) => {
      const ant = calcularAniosAntiguedad(p.fechaIngreso);
      const escala = getDiasEscalaArt7(ant);
      const saldosP = saldosLicenciasList.filter((s) => s.personalId === p.id);
      const totalDisp = saldosP.reduce((acc, s) => acc + Math.max(0, (s.diasCorrespondientes || 0) - (s.diasUsados || 0)), 0);
      const totalUsad = saldosP.reduce((acc, s) => acc + (s.diasUsados || 0), 0);
      const vencidos = saldosP.filter((s) => s.vencido).map((s) => String(s.anio)).join(', ');
      return {
        jerarquia: p.jerarquia,
        apellidoYNombre: p.apellidoYNombre,
        dni: p.dni,
        antiguedadAnios: ant,
        escalaArt7: escala,
        totalDisponibles: totalDisp,
        totalUsados: totalUsad,
        aniosVencidos: vencidos,
      };
    });
  }, [personalList, saldosLicenciasList]);

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
        mensualData: actividadMensual,
        intervencionesTotal: intervencionesFiltradas.length,
        ioTotal: inspeccionesList.length,
        foliosTotal: visibleFolios.length,
        memosTotal: memosNotasList.length,
        recargosTotal: recargosList.length,
        licenciasVigentes: licenciasPolicialesList.length,
      },
      config
    );
  };

  return (
    <div className="space-y-5">
      {/* Encabezado Ejecutivo Único con Controles en Línea */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Ejecutivo y Centro Estadístico
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Indicadores operativos, tendencias mensuales y reportes oficiales consolidados
              <span aria-hidden="true"> · </span>
              {config.siglasDependencia || 'DPC'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-700" />
              <span className="font-semibold text-slate-600">Año:</span>
              <select
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
                className="bg-transparent font-mono tabular-nums font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              {(['hoy', 'semana', 'mes', 'año', 'personalizado'] as PeriodoTipo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`px-2.5 py-1.5 rounded-md font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    periodo === p
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 'año' ? 'Año' : p}
                </button>
              ))}
            </div>

            {periodo === 'personalizado' && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-xs font-mono"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-xs font-mono"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Reporte Ejecutivo (PDF)</span>
            </button>
          </div>
        </div>

        {/* Sub-navegación del Centro Estadístico */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('resumen')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'resumen'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Resumen y Gráficos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('modulos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'modulos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Estadísticas por Módulo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('reportes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'reportes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Centro de Reportes PDF</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Resguardo de Evidencia:</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {tareasStats.totalResguardoPersonas} personas vinculadas
            </span>
          </div>
        </div>
      </div>

      {/* Regla Oficial de Conteo Estadístico */}
      <div className="bg-slate-900 text-white px-4 py-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-slate-800 rounded-lg text-blue-300 shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-blue-200">
              Regla Oficial de Conteo Estadístico — Resguardo de Evidencia
            </div>
            <div className="text-xs text-slate-300">
              Contabilizado por cantidad de personas vinculadas en el período:{' '}
              <strong className="text-white font-mono tabular-nums">
                {tareasStats.totalResguardoPersonas} personas
              </strong>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => generarPdfReporteInspeccionesOcularesPorTipo(inspeccionesList, config)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Reporte I.O. por Tipo (PDF)</span>
        </button>
      </div>

      {/* Tira Principal de KPIs (4 columnas, single elevation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('personal')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Personal Activo
            </span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalPersonalActivo}
            </span>
            <span className="text-xs text-slate-500">de {personalList.length} totales</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <UserX className="w-3 h-3 shrink-0" />
            <span>{personalLicencia} en uso de licencia</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('expedientes')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Expedientes Judiciales
            </span>
            <FileText className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {expedientesFiltrados.length}
            </span>
            <span className="text-xs text-slate-500">en el período</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 font-mono tabular-nums">
            <span className="font-semibold text-emerald-700">
              {expedientesFiltrados.filter((e) => e.estadoEntrega === 'Entregado').length} elevados
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {expedientesFiltrados.filter((e) => e.estadoEntrega === 'No entregado').length} pendientes
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('falta-oficio')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Falta de Oficio y PPI
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
              {casosFaltaOficioPendientes}
            </span>
            <span className="text-xs text-slate-500">casos pendientes</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="font-mono tabular-nums font-semibold text-slate-800">{causasConPPI}</span>
            <span>causas con PPI</span>
            {totalFallecidosIntervenciones > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-700 font-semibold font-mono tabular-nums">
                  {totalFallecidosIntervenciones} fallec.
                </span>
              </>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('moviles')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Parque Automotor
            </span>
            <Car className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {movilesOperativos}
              <span className="text-sm font-normal text-slate-400"> / {movilesList.length}</span>
            </span>
            <span className="text-xs text-emerald-700 font-semibold">en servicio</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
            <span className="font-mono tabular-nums">{movilesTaller} en taller</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-700 font-medium font-mono tabular-nums">
              {movilesConAlertaVencimiento.length} alertas RTO/Seg.
            </span>
          </div>
        </button>
      </div>

      {/* TAB 1: RESUMEN Y GRÁFICOS */}
      {activeSubTab === 'resumen' && (
        <div className="space-y-5">
          {/* Fila 1 de Gráficos: Evolución Mensual + Tareas Operativas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Evolución Mensual de Actuaciones
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparativa mensual de Expedientes, Intervenciones e I.O.
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-blue-700 shrink-0" />
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={actividadMensual} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashGradExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#11264d" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#11264d" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashGradInt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="expedientes"
                      name="Expedientes"
                      stroke="#11264d"
                      strokeWidth={2}
                      fill="url(#dashGradExp)"
                    />
                    <Area
                      type="monotone"
                      dataKey="intervenciones"
                      name="Intervenciones"
                      stroke="#0284c7"
                      strokeWidth={2}
                      fill="url(#dashGradInt)"
                    />
                    <Area
                      type="monotone"
                      dataKey="io"
                      name="Insp. Oculares"
                      stroke="#0f766e"
                      strokeWidth={2}
                      fillOpacity={0.06}
                      fill="#0f766e"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Distribución por Tarea Operativa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Resguardo de Evidencia ponderado por personas vinculadas
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {tareasStats.data.length} tipos
                </span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tareasStats.data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} requerimientos / personas`, 'Volumen']}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="count" name="Cantidad" fill="#11264d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2 de Gráficos: Dependencias Solicitantes + Estado Operativo Transversal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dependencias Solicitantes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Top dependencias y juzgados solicitantes en el período
                  </p>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  Top {dependenciasStats.length}
                </span>
              </div>

              <div className="h-60 flex flex-col sm:flex-row items-center justify-center">
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dependenciasStats}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={74}
                        innerRadius={42}
                        paddingAngle={2}
                      >
                        {dependenciasStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-1/2 space-y-1.5 pl-2">
                  {dependenciasStats.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin requerimientos en el período</p>
                  ) : (
                    dependenciasStats.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="truncate text-slate-700" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                          {item.count}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Panorama Operativo y Administrativo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Móviles, Recargos, Informes Técnicos, Memos, Folios visibles y Licencias
                  </p>
                </div>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estadoTransversalData} margin={{ top: 8, right: 10, left: -20, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="value" name="Activos / Registrados" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="secondary" name="Pendientes / Novedad" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Alerta de Cumpleaños con Calendario Interactivo */}
          <BirthdayDashboardWidget
            personalList={personalList}
            config={config}
            onNavigateToPersonnel={() => onNavigate('personal')}
          />

          {/* Agenda y Recordatorio de Charlas y Prevención Comunitaria */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-emerald-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Agenda de Charlas y Prevención Comunitaria
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recordatorio de próximas jornadas educativas y comunitarias programadas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('charlas-prevencion')}
                className="text-xs text-slate-800 hover:text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                <span>Gestionar Charlas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {charlasProximas.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between gap-3">
                <span>No hay charlas ni jornadas preventivas próximas en agenda.</span>
                <button
                  type="button"
                  onClick={() => onNavigate('charlas-prevencion')}
                  className="text-emerald-800 font-semibold hover:underline cursor-pointer shrink-0"
                >
                  + Programar charla
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {charlasProximas.map((charla) => {
                  const diff = getDiasHastaCharla(charla.fecha);
                  return (
                    <div
                      key={charla.id}
                      onClick={() => onNavigate('charlas-prevencion')}
                      className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-center shrink-0 min-w-[92px]">
                          <div className="font-mono tabular-nums font-bold text-[11px] text-slate-900">
                            {formatFechaDDMMAAAA(charla.fecha)}
                          </div>
                          <div className="font-mono tabular-nums text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{charla.hora} hs</span>
                          </div>
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900">
                            {charla.tema}
                            {diff <= 7 && (
                              <span className="ml-2 text-[11px] font-semibold text-amber-700">
                                · {diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>
                                {charla.lugarInstitucion} · {charla.localidad}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                              <UserCheck className="w-3 h-3" />
                              <span>Disertante: {charla.disertanteNombre}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {charla.observaciones && (
                        <div className="text-[11px] text-slate-500 md:max-w-[240px] truncate shrink-0">
                          {charla.observaciones}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inspecciones Oculares e Intervenciones de Guardia por Tipo */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Intervenciones de Guardia por Especialidad
                </h3>
                <p className="text-xs text-slate-500">
                  Criminalística Pericial vs. Accidentología Vial según partes correlativos
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('guardias')}
                className="text-xs text-blue-800 hover:text-blue-950 font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Ver Libro de Guardia Completo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg font-mono tabular-nums shrink-0">
                  {inspeccionesStats[0].value}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Intervenciones Criminalísticas</div>
                  <div className="text-xs text-slate-600">
                    Secuestros, aprehensiones, armas de fuego, robos y dermotest
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg font-mono tabular-nums shrink-0">
                  {inspeccionesStats[1].value}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Intervenciones Accidentológicas</div>
                  <div className="text-xs text-slate-600">
                    Siniestros viales con relevamiento de móviles, circulación y lesiones
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ESTADÍSTICAS POR MÓDULO */}
      {activeSubTab === 'modulos' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Comparativa de Volumen por Módulo del Sistema
                </h2>
                <p className="text-xs text-slate-500">
                  Registros activos y estado operativo en todos los módulos de la delegación
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {modulosMatrix.length} módulos
              </span>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...modulosMatrix].sort((a, b) => b.total - a.total).slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis
                    dataKey="modulo"
                    type="category"
                    width={165}
                    tick={{ fontSize: 11, fill: '#1e293b' }}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="total" name="Registros" fill="#11264d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900">
                Detalle Estadístico Integral por Módulo
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Módulo</th>
                    <th className="py-2.5 px-4 text-right">Registros</th>
                    <th className="py-2.5 px-4">Resumen Operativo</th>
                    <th className="py-2.5 px-4">Estado / Observación</th>
                    <th className="py-2.5 px-4 text-right">Acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modulosMatrix.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{row.modulo}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {row.total}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{row.detalle}</td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">{row.alerta}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate(row.id)}
                          className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-950 font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <span>Abrir</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CENTRO DE REPORTES PDF CON GRÁFICOS */}
      {activeSubTab === 'reportes' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Centro de Reportes Oficiales en PDF con Gráficos Estadísticos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada documento incluye cabecera institucional, indicadores KPI y gráficos estadísticos de alta resolución
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              {
                title: 'Reporte Ejecutivo de Gestión',
                desc: 'KPIs generales, evolución mensual y dependencias solicitantes.',
                count: `${expedientesFiltrados.length} exp. período`,
                action: handleExportPdf,
              },
              {
                title: 'Libro de Expedientes Judiciales',
                desc: 'Nómina completa con gráficos de requerimientos y elevación.',
                count: `${expedientesList.length} expedientes`,
                action: () => generarPdfLibroExpedientes(expedientesList, config),
              },
              {
                title: 'Inspecciones Oculares por Tipo',
                desc: 'Resumen estadístico, tomas fotográficas y nómina de actas.',
                count: `${inspeccionesList.length} actas I.O.`,
                action: () => generarPdfReporteInspeccionesOcularesPorTipo(inspeccionesList, config),
              },
              {
                title: 'Intervenciones Periciales',
                desc: 'LC vs Accidentología, principales hechos y lesiones pendientes.',
                count: `${intervencionesFiltradas.length} actuaciones`,
                action: () => generarPdfReporteIntervenciones(intervencionesFiltradas, config),
              },
              {
                title: 'Consolidado de Partes de Guardia',
                desc: 'Productividad por grupo de guardia y registros de cibercrimen.',
                count: `${partesGuardiaList.length} partes`,
                action: () => generarPdfReporteGuardias(partesGuardiaList, config),
              },
              {
                title: 'Informes Técnicos Periciales',
                desc: 'Estado de confección, elevación y recepción judicial.',
                count: `${informesTecnicosList.length} informes`,
                action: () => generarPdfReporteInformesTecnicos(informesTecnicosList, config),
              },
              {
                title: 'Accidentología Vial Policial',
                desc: 'Tipología de siniestros, lesiones, casco y alcohotest.',
                count: `${accidentologiaList.length} siniestros`,
                action: () => generarPdfReporteAccidentologia(accidentologiaList, config),
              },
              {
                title: 'Régimen de Licencias y Saldos',
                desc: 'Licencias otorgadas, Art. 15 y balance disponible Art. 7.',
                count: `${licenciasPolicialesList.length} licencias`,
                action: () =>
                  generarPdfReporteLicencias(licenciasPolicialesList, resumenSaldosLicencias, config),
              },
            ].map((rep) => (
              <div
                key={rep.title}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{rep.title}</h3>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                      {rep.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{rep.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={rep.action}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Previsualizar y Exportar PDF</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  IntervencionParte,
  TipoIntervencion,
  ConfiguracionSistema,
  Personal,
  GrupoPersonal,
  ParteNovedadesGuardia,
  UsuarioSistema,
} from '../../types/police';
import {
  Activity,
  Flame,
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  Clock,
  Car,
  Shield,
  ShieldAlert,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles,
  Hash,
  BarChart3,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { ModuleStatsPanel } from '../common/ModuleStatsPanel';
import { IntervencionModal } from '../guardias/IntervencionModal';
import { TipoLesionesCell } from '../guardias/TipoLesionesCell';
import { generarPdfReporteIntervenciones } from '../../services/pdfService';
import { getNextCorrelativoIntervencion } from '../../utils/numeracionUtils';
import { esTipoLesionADeterminar, getResumenLesionADeterminarIntervencion } from '../../utils/lesionesUtils';

interface IntervencionesViewProps {
  intervencionesList: IntervencionParte[];
  partesList: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
  personalList: Personal[];
  gruposList?: GrupoPersonal[];
  currentUser?: UsuarioSistema;
  onSaveIntervencion: (interv: IntervencionParte) => void;
  onDeleteIntervencion: (id: string) => void;
  onSaveConfig: (cfg: ConfiguracionSistema) => void;
}

export const IntervencionesView: React.FC<IntervencionesViewProps> = ({
  intervencionesList,
  partesList,
  config,
  personalList,
  gruposList = [],
  currentUser,
  onSaveIntervencion,
  onDeleteIntervencion,
  onSaveConfig,
}) => {
  // Tab activa: 'criminalistica' (LC) o 'accidentologia' (Siniestros y Hechos Viales)
  const [activeTab, setActiveTab] = useState<'criminalistica' | 'accidentologia'>('criminalistica');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroHecho, setFiltroHecho] = useState('todos');
  const [filtroTipoLesion, setFiltroTipoLesion] = useState('todas');
  const [soloFallecidos, setSoloFallecidos] = useState(false);
  const [soloPolicial, setSoloPolicial] = useState(false);
  const [mostrarControlContadores, setMostrarControlContadores] = useState(true);
  const [mostrarStats, setMostrarStats] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [confirmResetTipo, setConfirmResetTipo] = useState<'lc' | 'acc' | null>(null);

  // Estados locales para el Control de Contadores dentro de este módulo
  const [inicioLC, setInicioLC] = useState<number>(
    config.inicioNroIntervencionCriminalistica ?? 1
  );
  const [ultimoLC, setUltimoLC] = useState<number>(
    config.ultimoNroIntervencionCriminalistica ?? 0
  );
  const [inicioAcc, setInicioAcc] = useState<number>(
    config.inicioNroIntervencionAccidentologica ?? 1
  );
  const [ultimoAcc, setUltimoAcc] = useState<number>(
    config.ultimoNroIntervencionAccidentologica ?? 0
  );

  React.useEffect(() => {
    setInicioLC(config.inicioNroIntervencionCriminalistica ?? 1);
    setUltimoLC(config.ultimoNroIntervencionCriminalistica ?? 0);
    setInicioAcc(config.inicioNroIntervencionAccidentologica ?? 1);
    setUltimoAcc(config.ultimoNroIntervencionAccidentologica ?? 0);
  }, [
    config.inicioNroIntervencionCriminalistica,
    config.ultimoNroIntervencionCriminalistica,
    config.inicioNroIntervencionAccidentologica,
    config.ultimoNroIntervencionAccidentologica,
  ]);

  // Modal para Crear / Editar
  const [isIntervencionModalOpen, setIsIntervencionModalOpen] = useState(false);
  const [selectedIntervencion, setSelectedIntervencion] = useState<IntervencionParte | null>(null);
  const [tipoForzadoModal, setTipoForzadoModal] = useState<TipoIntervencion>('Criminalística');

  // Modal de Detalle
  const [detalleIntervencion, setDetalleIntervencion] = useState<IntervencionParte | null>(null);

  // Modal de Eliminación
  const [intervToDelete, setIntervToDelete] = useState<IntervencionParte | null>(null);

  // Filtrar intervenciones según la pestaña seleccionada
  const intervencionesLC = useMemo(() => {
    return intervencionesList.filter(
      (int) => int.tipoIntervencion === 'Criminalística'
    );
  }, [intervencionesList]);

  const intervencionesSiniestros = useMemo(() => {
    return intervencionesList.filter(
      (int) => int.tipoIntervencion === 'Accidentológica'
    );
  }, [intervencionesList]);

  const baseTabList = activeTab === 'criminalistica' ? intervencionesLC : intervencionesSiniestros;

  const dependenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    baseTabList.forEach((int) => {
      if (int.dependencia) set.add(int.dependencia);
    });
    return Array.from(set).sort();
  }, [baseTabList]);

  const hechosUnicos = useMemo(() => {
    const set = new Set<string>();
    baseTabList.forEach((int) => {
      if (int.hecho) set.add(int.hecho);
    });
    return Array.from(set).sort();
  }, [baseTabList]);

  const lesionesUnicas = useMemo(() => {
    const set = new Set<string>(['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas', 'A Determinar']);
    baseTabList.forEach((int) => {
      (int.involucrados || []).forEach((inv) => {
        if (inv.tipoLesion) set.add(inv.tipoLesion);
      });
      (int.vehiculosSiniestro || []).forEach((v) => {
        if (v.lesiones) set.add(v.lesiones);
      });
      if (int.tipoLesionesLC) set.add(int.tipoLesionesLC);
      if (int.personalPolicial?.tipoLesion) set.add(int.personalPolicial.tipoLesion);
    });
    return Array.from(set);
  }, [baseTabList]);

  const intervencionesConLesionPendiente = useMemo(() => {
    return baseTabList.filter((int) => getResumenLesionADeterminarIntervencion(int).tienePendiente);
  }, [baseTabList]);

  const pendientesLC = useMemo(() => {
    return intervencionesLC.filter((int) => getResumenLesionADeterminarIntervencion(int).tienePendiente);
  }, [intervencionesLC]);

  const pendientesAcc = useMemo(() => {
    return intervencionesSiniestros.filter((int) => getResumenLesionADeterminarIntervencion(int).tienePendiente);
  }, [intervencionesSiniestros]);

  const todasPendientesLesion = useMemo(() => {
    return [...pendientesLC, ...pendientesAcc];
  }, [pendientesLC, pendientesAcc]);

  const handleToggleFiltroPendientesGlobal = () => {
    if (filtroTipoLesion === 'A Determinar') {
      setFiltroTipoLesion('todas');
      return;
    }
    if (activeTab === 'criminalistica' && pendientesLC.length === 0 && pendientesAcc.length > 0) {
      setActiveTab('accidentologia');
    } else if (activeTab === 'accidentologia' && pendientesAcc.length === 0 && pendientesLC.length > 0) {
      setActiveTab('criminalistica');
    }
    setFiltroTipoLesion('A Determinar');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (fechaDesde) count++;
    if (fechaHasta) count++;
    if (filtroDependencia !== 'todas') count++;
    if (filtroHecho !== 'todos') count++;
    if (filtroTipoLesion !== 'todas') count++;
    if (soloFallecidos) count++;
    if (soloPolicial) count++;
    return count;
  }, [searchTerm, fechaDesde, fechaHasta, filtroDependencia, filtroHecho, filtroTipoLesion, soloFallecidos, soloPolicial]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFechaDesde('');
    setFechaHasta('');
    setFiltroDependencia('todas');
    setFiltroHecho('todos');
    setFiltroTipoLesion('todas');
    setSoloFallecidos(false);
    setSoloPolicial(false);
  };

  // Lista activa y filtrada
  const currentList = useMemo(() => {
    const list =
      activeTab === 'criminalistica' ? intervencionesLC : intervencionesSiniestros;
    return list.filter((int) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (int.codigoIntervencion || '').toLowerCase().includes(term) ||
        (int.hecho || '').toLowerCase().includes(term) ||
        (int.inspeccionLugar || '').toLowerCase().includes(term) ||
        (int.dependencia || '').toLowerCase().includes(term) ||
        (int.personalTecnico?.peritoAuxiliar || '').toLowerCase().includes(term) ||
        (int.personalTecnico?.choferFotografo || '').toLowerCase().includes(term) ||
        (int.involucrados || []).some((i) => (i.apellidoYNombre || '').toLowerCase().includes(term) || (i.dni || '').includes(term)) ||
        String(int.nroCorrelativo ?? '').includes(searchTerm);

      const matchDesde = !fechaDesde || (int.inspeccionFecha && int.inspeccionFecha >= fechaDesde);
      const matchHasta = !fechaHasta || (int.inspeccionFecha && int.inspeccionFecha <= fechaHasta);
      const matchDep = filtroDependencia === 'todas' || int.dependencia === filtroDependencia;
      const matchHecho = filtroHecho === 'todos' || int.hecho === filtroHecho;

      const matchLesion =
        filtroTipoLesion === 'todas' ||
        (esTipoLesionADeterminar(filtroTipoLesion)
          ? getResumenLesionADeterminarIntervencion(int).tienePendiente
          : (int.involucrados || []).some((i) =>
              (i.tipoLesion || 'Sin Lesiones').toLowerCase().includes(filtroTipoLesion.toLowerCase())
            ) ||
            (int.vehiculosSiniestro || []).some((v) =>
              (v.lesiones || '').toLowerCase().includes(filtroTipoLesion.toLowerCase())
            ) ||
            (int.tipoLesionesLC || '').toLowerCase().includes(filtroTipoLesion.toLowerCase()) ||
            (int.personalPolicial?.tipoLesion || '').toLowerCase().includes(filtroTipoLesion.toLowerCase()));

      const matchFallecido =
        !soloFallecidos ||
        (int.involucrados || []).some((i) => !!i.fallecido) ||
        (int.vehiculosSiniestro || []).some((v) => {
          const l = (v.lesiones || '').toLowerCase();
          return l.includes('fallec') || l.includes('óbito') || l.includes('muert');
        });

      const tienePolicial =
        !!int.involucraPersonalPolicial ||
        (int.involucrados || []).some((i) => !!i.esPersonalPolicial);
      const matchPolicial = !soloPolicial || tienePolicial;

      return (
        matchSearch &&
        matchDesde &&
        matchHasta &&
        matchDep &&
        matchHecho &&
        matchLesion &&
        matchFallecido &&
        matchPolicial
      );
    });
  }, [
    activeTab,
    intervencionesLC,
    intervencionesSiniestros,
    searchTerm,
    fechaDesde,
    fechaHasta,
    filtroDependencia,
    filtroHecho,
    filtroTipoLesion,
    soloFallecidos,
    soloPolicial,
  ]);

  const showNotice = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Manejo de Guardado de Contadores en la Configuración
  const handleGuardarContadorLC = () => {
    const updated = {
      ...config,
      inicioNroIntervencionCriminalistica: inicioLC,
      ultimoNroIntervencionCriminalistica: ultimoLC,
    };
    onSaveConfig(updated);
    showNotice('Contador de Labores Criminalísticas (LC) actualizado correctamente.');
  };

  const handleReiniciarContadorLC = () => {
    setConfirmResetTipo('lc');
  };

  const handleGuardarContadorAcc = () => {
    const updated = {
      ...config,
      inicioNroIntervencionAccidentologica: inicioAcc,
      ultimoNroIntervencionAccidentologica: ultimoAcc,
    };
    onSaveConfig(updated);
    showNotice('Contador de Siniestros y Hechos Viales actualizado correctamente.');
  };

  const handleReiniciarContadorAcc = () => {
    setConfirmResetTipo('acc');
  };

  const executeResetContador = () => {
    if (confirmResetTipo === 'lc') {
      setInicioLC(1);
      setUltimoLC(0);
      onSaveConfig({
        ...config,
        inicioNroIntervencionCriminalistica: 1,
        ultimoNroIntervencionCriminalistica: 0,
      });
      showNotice('Contador de Labores Criminalísticas (LC) reiniciado a 1.');
    } else if (confirmResetTipo === 'acc') {
      setInicioAcc(1);
      setUltimoAcc(0);
      onSaveConfig({
        ...config,
        inicioNroIntervencionAccidentologica: 1,
        ultimoNroIntervencionAccidentologica: 0,
      });
      showNotice('Contador de Siniestros y Hechos Viales reiniciado a 1.');
    }
    setConfirmResetTipo(null);
  };

  const handleAbrirCrear = (tipo: TipoIntervencion) => {
    setSelectedIntervencion(null);
    setTipoForzadoModal(tipo);
    setIsIntervencionModalOpen(true);
  };

  const handleAbrirEditar = (int: IntervencionParte) => {
    setSelectedIntervencion(int);
    setTipoForzadoModal(int.tipoIntervencion);
    setIsIntervencionModalOpen(true);
  };

  // Cálculo del siguiente correlativo independiente por tipo (LC y Seg. Vial pueden coincidir en N°)
  const siguienteCorrelativoLC = useMemo(() => {
    return getNextCorrelativoIntervencion({
      tipo: 'Criminalística',
      intervenciones: intervencionesList,
      partesGuardia: partesList,
      config,
    });
  }, [intervencionesList, partesList, config]);

  const siguienteCorrelativoAcc = useMemo(() => {
    return getNextCorrelativoIntervencion({
      tipo: 'Accidentológica',
      intervenciones: intervencionesList,
      partesGuardia: partesList,
      config,
    });
  }, [intervencionesList, partesList, config]);

  const siguienteCorrelativo =
    tipoForzadoModal === 'Accidentológica' ? siguienteCorrelativoAcc : siguienteCorrelativoLC;

  const intervStats = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mapMes = new Map<string, { lc: number; acc: number }>();
    meses.forEach((m) => mapMes.set(m, { lc: 0, acc: 0 }));

    intervencionesList.forEach((i) => {
      if (!i.inspeccionFecha) return;
      const d = new Date(i.inspeccionFecha + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        const cur = mapMes.get(meses[d.getMonth()])!;
        if (i.tipoIntervencion === 'Accidentológica') cur.acc += 1;
        else cur.lc += 1;
      }
    });

    const hechoMap = new Map<string, number>();
    baseTabList.forEach((i) => {
      const h = i.hecho || 'Sin especificar';
      hechoMap.set(h, (hechoMap.get(h) || 0) + 1);
    });

    return {
      kpis: [
        { label: 'Total Intervenciones', value: intervencionesList.length, detail: 'Actuaciones registradas', tone: 'navy' as const },
        { label: 'Criminalística (LC)', value: intervencionesLC.length, detail: 'Escenas no viales', tone: 'blue' as const },
        { label: 'Siniestros Viales', value: intervencionesSiniestros.length, detail: 'Accidentología vial', tone: 'emerald' as const },
        { label: 'Lesiones "A Determinar"', value: todasPendientesLesion.length, detail: 'Pendientes de clasificación', tone: 'amber' as const },
      ],
      charts: [
        {
          id: 'interv-mes',
          title: 'Evolución Mensual (LC vs Seg. Vial)',
          subtitle: 'Comparativa mensual entre áreas periciales',
          type: 'area' as const,
          data: meses.map((m) => ({
            name: m,
            value: mapMes.get(m)?.lc || 0,
            secondary: mapMes.get(m)?.acc || 0,
          })),
          valueLabel: 'Criminalística (LC)',
          secondaryLabel: 'Siniestros Viales',
        },
        {
          id: 'interv-hechos',
          title: `Principales Hechos (${activeTab === 'criminalistica' ? 'LC' : 'Vial'})`,
          subtitle: 'Tipologías con mayor frecuencia en la pestaña activa',
          type: 'horizontal-bar' as const,
          data: Array.from(hechoMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value),
          valueLabel: 'Intervenciones',
        },
      ],
    };
  }, [intervencionesList, intervencionesLC.length, intervencionesSiniestros.length, todasPendientesLesion.length, baseTabList, activeTab]);

  // Exportar Listado Oficial Estadístico a PDF con KPIs, gráficos y tabla completa
  const handleExportPdf = () => {
    const tituloExtra =
      activeTab === 'criminalistica'
        ? 'Labores Criminalísticas (LC)'
        : 'Siniestros y Hechos Viales';
    generarPdfReporteIntervenciones(currentList, config, tituloExtra);
  };

  return (
    <div className="space-y-5">
      {/* Header Principal */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Módulo de Intervenciones Policiales
                  </h1>
                  <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    Registros Separados
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seguimiento diferenciado de Labores Criminalísticas (LC) y Siniestros Viales, con control de contadores integrado.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            {/* Cartel Recordatorio en Parte Superior Derecha cuando faltan definir Tipos de Lesiones */}
            {todasPendientesLesion.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-100 border-2 border-amber-500 text-amber-950 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-amber-950">
                      Falta definir Tipo de Lesión ({todasPendientesLesion.length})
                    </div>
                    <div className="text-[10px] font-semibold text-amber-900">
                      Lesiones &ldquo;A Determinar&rdquo; — LC: {pendientesLC.length} • Seg. Vial: {pendientesAcc.length}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFiltroPendientesGlobal}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition-colors shrink-0 ${
                    filtroTipoLesion === 'A Determinar'
                      ? 'bg-amber-700 text-white border-amber-800'
                      : 'bg-white text-amber-950 border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  {filtroTipoLesion === 'A Determinar' ? '✓ Ver todas' : 'Ver pendientes'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarStats((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  mostrarStats
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Estadísticas</span>
              </button>

              <button
                onClick={() => setMostrarControlContadores(!mostrarControlContadores)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  mostrarControlContadores
                    ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold ring-2 ring-amber-300'
                    : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Control oficial de contadores y numeradores para Labor Criminalística (LC) y Siniestros Viales"
              >
                <Hash className="w-4 h-4" />
                <span>CONTADOR</span>
              </button>

              {currentList.length > 0 && (
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Reporte PDF</span>
                </button>
              )}

              {activeTab === 'criminalistica' ? (
                <button
                  onClick={() => handleAbrirCrear('Criminalística')}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cargar Labor Criminalística (LC)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleAbrirCrear('Accidentológica')}
                  className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cargar Siniestro Vial</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {mostrarStats && (
        <ModuleStatsPanel
          title="Estadísticas de Intervenciones Periciales"
          subtitle="Comparativa mensual de Labores Criminalísticas (LC) y Siniestros Viales"
          kpis={intervStats.kpis}
          charts={intervStats.charts}
          onExportPdf={handleExportPdf}
          exportPdfLabel="Exportar Reporte Estadístico (PDF)"
          onClose={() => setMostrarStats(false)}
        />
      )}

      {/* PANEL DE CONTROL DE CONTADORES (REQUERIMIENTO: "en este modulo permite controlar el contador de cada uno. NO en otra seccion.") */}
      {mostrarControlContadores && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Control Exclusivo de Contadores y Numeradores Oficiales
                </h3>
                <p className="text-[11px] text-slate-300">
                  Ajuste manual, correlatividad y reseteo de contadores para Labores Criminalísticas (LC) y Siniestros Viales.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
              Gestión Activa en Módulo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Contador LC */}
            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Contador Labores Criminalísticas (LC)</span>
                </span>
                <span className="text-[11px] font-mono bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded">
                  Próxima: Nº {Math.max((config.ultimoNroIntervencionCriminalistica ?? 0) + 1, config.inicioNroIntervencionCriminalistica ?? 1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Número Inicial:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inicioLC}
                    onChange={(e) => setInicioLC(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Último Número Emitido:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ultimoLC}
                    onChange={(e) => setUltimoLC(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleReiniciarContadorLC}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 hover:underline cursor-pointer"
                  title="Reiniciar contador de LC al número 1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetear a 1</span>
                </button>
                <button
                  type="button"
                  onClick={handleGuardarContadorLC}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                >
                  Guardar Contador LC
                </button>
              </div>
            </div>

            {/* Tarjeta Contador Siniestros y Hechos Viales */}
            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Contador Siniestros y Hechos Viales</span>
                </span>
                <span className="text-[11px] font-mono bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded">
                  Próxima: Nº {Math.max((config.ultimoNroIntervencionAccidentologica ?? 0) + 1, config.inicioNroIntervencionAccidentologica ?? 1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Número Inicial:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inicioAcc}
                    onChange={(e) => setInicioAcc(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Último Número Emitido:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ultimoAcc}
                    onChange={(e) => setUltimoAcc(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleReiniciarContadorAcc}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 hover:underline cursor-pointer"
                  title="Reiniciar contador de Siniestros al número 1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetear a 1</span>
                </button>
                <button
                  type="button"
                  onClick={handleGuardarContadorAcc}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                >
                  Guardar Contador Siniestros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas de Selección: Labores Criminalísticas (LC) vs Siniestros y Hechos Viales */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('criminalistica')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'criminalistica'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-700" />
            <span>Labores Criminalísticas (LC)</span>
            <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {intervencionesLC.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('accidentologia')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'accidentologia'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Car className="w-4 h-4 text-blue-700" />
            <span>Siniestros y Hechos Viales</span>
            <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {intervencionesSiniestros.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0 text-[11px] font-semibold text-slate-600">
          <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
            I.O. generadas (LC + Siniestros):{' '}
            <strong className="text-blue-950">{intervencionesLC.length + intervencionesSiniestros.length}</strong>
          </span>
        </div>
      </div>

      {/* Filtros de Búsqueda Colapsables */}
      <CollapsibleFilterBar
        title={`Filtros de ${activeTab === 'criminalistica' ? 'Labores Criminalísticas (LC)' : 'Siniestros y Hechos Viales'}`}
        activeFiltersCount={activeFiltersCount}
        onClear={handleClearFilters}
        summaryRight={
          <div className="text-xs text-slate-500 font-mono">
            Registros mostrados: <strong>{currentList.length}</strong> de {baseTabList.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Código, hecho, lugar, perito o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <select
            value={filtroDependencia}
            onChange={(e) => setFiltroDependencia(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Todas las Dependencias</option>
            {dependenciasUnicas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filtroHecho}
            onChange={(e) => setFiltroHecho(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todos">Todos los Hechos / Causas</option>
            {hechosUnicos.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          <select
            value={filtroTipoLesion}
            onChange={(e) => setFiltroTipoLesion(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Tipo de Lesiones: Todas</option>
            {lesionesUnicas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha Desde"
              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />
            <span className="text-slate-400 text-[11px]">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha Hasta"
              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={() => setSoloFallecidos(!soloFallecidos)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
              soloFallecidos
                ? 'bg-rose-700 text-white border-rose-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Solo con Fallecidos
          </button>

          <button
            type="button"
            onClick={() => setSoloPolicial(!soloPolicial)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
              soloPolicial
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Con Personal Policial
          </button>
        </div>
      </CollapsibleFilterBar>

      {/* Aviso Pericial si existen intervenciones con Tipo de Lesiones "A Determinar" */}
      {intervencionesConLesionPendiente.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="font-extrabold block">
                Atención: {intervencionesConLesionPendiente.length} intervención(es) con Tipo de Lesiones &ldquo;A Determinar&rdquo;
              </span>
              <span className="text-[11px] text-amber-900">
                Falta precisar el carácter definitivo de las lesiones en los registros remarcados en amarillo.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFiltroTipoLesion(filtroTipoLesion === 'A Determinar' ? 'todas' : 'A Determinar')
            }
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors cursor-pointer shrink-0 ${
              filtroTipoLesion === 'A Determinar'
                ? 'bg-amber-700 text-white border-amber-800'
                : 'bg-white text-amber-950 border-amber-400 hover:bg-amber-100'
            }`}
          >
            {filtroTipoLesion === 'A Determinar'
              ? '✓ Mostrando "A Determinar" (Ver todas)'
              : `Filtrar "A Determinar" (${intervencionesConLesionPendiente.length})`}
          </button>
        </div>
      )}

      {/* Tabla Principal de Intervenciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'criminalistica' ? (
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            ) : (
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            )}
            <h3 className="font-bold text-slate-800 text-sm">
              No hay {activeTab === 'criminalistica' ? 'Labores Criminalísticas (LC)' : 'Siniestros Viales'} registradas
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Haga clic en "+ Cargar {activeTab === 'criminalistica' ? 'Labor Criminalística' : 'Siniestro Vial'}" para agregar una nueva intervención.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">N° / Código</th>
                  <th className="py-2.5 px-3">Fecha & Hora</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Hecho / Causa</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Lugar de Ocurrido</th>
                  <th className="py-2.5 px-3">Dependencia</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Personal Técnico</th>
                  {activeTab === 'accidentologia' && (
                    <th className="py-2.5 px-3">Vehículos Siniestrados / Involucrados</th>
                  )}
                  {activeTab === 'criminalistica' && (
                    <th className="py-2.5 px-3">Involucrados</th>
                  )}
                  <th className="py-2.5 px-3 min-w-[165px]">Tipo de Lesiones</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentList.map((int) => {
                  const resumenLesion = getResumenLesionADeterminarIntervencion(int);

                  return (
                  <tr
                    key={int.id}
                    className={`transition-colors ${
                      resumenLesion.tienePendiente
                        ? 'bg-amber-100 hover:bg-amber-200/80 border-y border-amber-400 ring-1 ring-inset ring-amber-400'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            activeTab === 'criminalistica'
                              ? 'bg-slate-900 text-white'
                              : 'bg-blue-900 text-white'
                          }`}
                        >
                          #{int.nroCorrelativo}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 mt-0.5 max-w-[200px] truncate">
                        {int.codigoIntervencion}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{int.inspeccionFecha}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {int.inspeccionHora} hs.
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block uppercase">
                        {int.hecho}
                      </span>
                      <span className="text-[11px] text-slate-600 line-clamp-1">
                        {int.sintesisHecho}
                      </span>
                      {resumenLesion.tienePendiente && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-300 text-amber-950 border border-amber-600"
                            title={resumenLesion.motivos.join(' | ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-900 shrink-0" />
                            <span>Falta Tipo de Lesión (A Determinar)</span>
                          </span>
                        </div>
                      )}
                      {(int.involucraPersonalPolicial || (int.involucrados || []).some((i) => i.esPersonalPolicial)) && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>
                              Personal Policial:{' '}
                              {int.personalPolicial?.apellidoYNombre
                                ? `${int.personalPolicial.jerarquia} ${int.personalPolicial.apellidoYNombre} (Plaza ${int.personalPolicial.plaza})`
                                : (int.involucrados || [])
                                    .filter((i) => i.esPersonalPolicial)
                                    .map((i) => `${i.jerarquia || ''} ${i.apellidoYNombre}`.trim())
                                    .join(', ')}
                            </span>
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block">
                        {int.inspeccionLugar}
                      </span>
                      {int.direccion && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          {int.direccion}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-800 font-medium">{int.dependencia}</span>
                      <div className="text-[10px] text-slate-500">
                        Vía: {int.solicitudVia}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-[11px] font-medium text-slate-900">
                        {int.personalTecnico.peritoAuxiliar}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Chof: {int.personalTecnico.choferFotografo}
                      </div>
                    </td>

                    {activeTab === 'accidentologia' && (
                      <td className="py-2.5 px-3">
                        {int.vehiculosSiniestro && int.vehiculosSiniestro.length > 0 ? (
                          <div className="space-y-1">
                            {int.vehiculosSiniestro.map((v, i) => {
                              const esLesPend = esTipoLesionADeterminar(v.lesiones);
                              return (
                              <div
                                key={v.id || i}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  esLesPend
                                    ? 'bg-amber-200 text-amber-950 border-amber-500 font-bold'
                                    : 'bg-blue-50 text-blue-900 border-blue-100'
                                }`}
                              >
                                <strong>{v.identificador}:</strong> {v.marca || ''} {v.modelo || ''} ({v.dominio || 's/p'}) - {v.lesiones}
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin vehículos cargados</span>
                        )}
                        {int.involucrados && int.involucrados.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {int.involucrados.map((inv, idx) => (
                              <div key={inv.id || idx} className="text-[10px] text-slate-800">
                                <span className="font-semibold">{inv.apellidoYNombre}</span>{' '}
                                <span className="text-slate-500">({inv.condicion || inv.funcionEnHecho})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )}

                    {activeTab === 'criminalistica' && (
                      <td className="py-2.5 px-3">
                        {int.involucrados && int.involucrados.length > 0 ? (
                          <div className="space-y-1">
                            {int.involucrados.map((inv, idx) => (
                              <div key={inv.id || idx} className="text-[10px] flex flex-wrap items-center gap-1">
                                <span className="font-semibold text-slate-800">{inv.apellidoYNombre}</span>
                                <span className="text-slate-500">({inv.condicion || inv.funcionEnHecho})</span>
                                {inv.fallecido && (
                                  <span className="px-1 py-0.2 rounded bg-slate-900 text-rose-200 border border-rose-500 font-extrabold text-[9px]">
                                    FALLECIDO
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin involucrados</span>
                        )}
                      </td>
                    )}

                    {/* Columna dedicada: Tipo de Lesiones (editable y con carga rápida) */}
                    <td className="py-2.5 px-3">
                      <TipoLesionesCell
                        intervencion={int}
                        config={config}
                        readOnly={Boolean(
                          currentUser?.esSoloLectura ||
                            currentUser?.rol === 'Solo Lectura (Auditor / Consulta)'
                        )}
                        onUpdateIntervencion={(updated) => {
                          onSaveIntervencion(updated);
                          showNotice('Tipo de lesión actualizado correctamente.');
                        }}
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetalleIntervencion(int)}
                          className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAbrirEditar(int)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Editar intervención"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIntervToDelete(int)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle Completo de la Intervención */}
      {detalleIntervencion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  {detalleIntervencion.tipoIntervencion}
                </span>
                <h3 className="font-bold text-sm tracking-wide mt-1">
                  {detalleIntervencion.codigoIntervencion}
                </h3>
              </div>
              <button
                onClick={() => setDetalleIntervencion(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {(() => {
                const detPend = getResumenLesionADeterminarIntervencion(detalleIntervencion);
                if (!detPend.tienePendiente) return null;
                return (
                  <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block">
                        Aviso: Falta definir Tipo de Lesiones (&ldquo;A Determinar&rdquo;)
                      </span>
                      <span className="text-[11px] text-amber-900">
                        {detPend.motivos.join(' • ')}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hecho / Causa</span>
                  <span className="font-bold text-slate-900">{detalleIntervencion.hecho}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha y Hora</span>
                  <span className="font-semibold text-slate-800">
                    {detalleIntervencion.inspeccionFecha} a las {detalleIntervencion.inspeccionHora} hs.
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lugar del Hecho</span>
                  <span className="font-medium text-slate-800">{detalleIntervencion.inspeccionLugar}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Dependencia Solicitante</span>
                  <span className="font-medium text-slate-800">{detalleIntervencion.dependencia}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Personal Técnico Interviniente
                </span>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                  <div><strong>Perito Auxiliar:</strong> {detalleIntervencion.personalTecnico.peritoAuxiliar}</div>
                  <div><strong>Chofer - Fotógrafo:</strong> {detalleIntervencion.personalTecnico.choferFotografo}</div>
                  {detalleIntervencion.personalTecnico.auxiliar && (
                    <div><strong>Auxiliar:</strong> {detalleIntervencion.personalTecnico.auxiliar}</div>
                  )}
                </div>
              </div>

              {detalleIntervencion.sintesisHecho && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Síntesis del Hecho
                  </span>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-line">
                    {detalleIntervencion.sintesisHecho}
                  </div>
                </div>
              )}

              {detalleIntervencion.laborCriminalistica && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Labor Pericial / Criminalística Desarrollada
                  </span>
                  <div className="bg-indigo-50/50 p-3 rounded border border-indigo-100 text-indigo-950 whitespace-pre-line font-medium">
                    {detalleIntervencion.laborCriminalistica}
                  </div>
                </div>
              )}

              {detalleIntervencion.vehiculosSiniestro && detalleIntervencion.vehiculosSiniestro.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Vehículos del Siniestro Vial ({detalleIntervencion.vehiculosSiniestro.length})
                  </span>
                  <div className="space-y-2">
                    {detalleIntervencion.vehiculosSiniestro.map((v, i) => (
                      <div key={v.id || i} className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-slate-800">
                        <div className="font-bold text-blue-900">{v.identificador}: {v.tipo} {v.marca} {v.modelo} (Dominio: {v.dominio || 'S/D'})</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Conductor: <strong>{v.propietarioOConductor}</strong> • Circulación: {v.circulacion} • Impacto: {v.zonaContacto}
                        </div>
                        <div className="text-[11px] text-rose-800 font-semibold mt-0.5">
                          Lesiones: {v.lesiones}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalleIntervencion.involucrados && detalleIntervencion.involucrados.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Involucrados / Demorados ({detalleIntervencion.involucrados.length})
                  </span>
                  <div className="space-y-1">
                    {detalleIntervencion.involucrados.map((inv, i) => (
                      <div key={inv.id || i} className="p-2 bg-slate-50 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>{inv.apellidoYNombre}</strong> (DNI {inv.dni})
                          {inv.esPersonalPolicial && (
                            <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                              Personal Policial
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {inv.tipoLesion && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                esTipoLesionADeterminar(inv.tipoLesion)
                                  ? 'bg-amber-200 text-amber-950 border-amber-500'
                                  : inv.tipoLesion === 'Sin Lesiones'
                                  ? 'bg-white text-slate-600 border-slate-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {inv.tipoLesion}
                            </span>
                          )}
                          {inv.fallecido && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900 text-rose-200 border border-rose-500">
                              FALLECIDO
                            </span>
                          )}
                          <span className="text-slate-600 font-medium">{inv.condicion || inv.funcionEnHecho}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalleIntervencion.involucraPersonalPolicial && detalleIntervencion.personalPolicial && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Personal Policial Involucrado en el Hecho</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Efectivo Policial:</span>
                      <span className="font-bold text-slate-900">
                        {detalleIntervencion.personalPolicial.jerarquia} {detalleIntervencion.personalPolicial.apellidoYNombre}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Plaza Policial N°:</span>
                      <span className="font-mono font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {detalleIntervencion.personalPolicial.plaza}
                      </span>
                      {detalleIntervencion.personalPolicial.dni && (
                        <span className="text-slate-600 ml-2 font-mono">DNI: {detalleIntervencion.personalPolicial.dni}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rol / Condición en el Hecho:</span>
                      <span className="font-bold text-amber-800">
                        {detalleIntervencion.personalPolicial.rol || 'Involucrado'}
                      </span>
                    </div>
                    {detalleIntervencion.personalPolicial.dependenciaRevista && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dependencia de Revista:</span>
                        <span className="font-medium text-slate-800">
                          {detalleIntervencion.personalPolicial.dependenciaRevista}
                        </span>
                      </div>
                    )}
                  </div>
                  {detalleIntervencion.personalPolicial.observaciones && (
                    <div className="text-[11px] text-slate-600 italic">
                      Obs: {detalleIntervencion.personalPolicial.observaciones}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetalleIntervencion(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga / Edición de Intervención */}
      {isIntervencionModalOpen && (
        <IntervencionModal
          intervencion={selectedIntervencion}
          tipoForzado={tipoForzadoModal}
          siguienteCorrelativo={siguienteCorrelativo}
          siguienteCorrelativoLC={siguienteCorrelativoLC}
          siguienteCorrelativoAcc={siguienteCorrelativoAcc}
          añoActual={new Date().getFullYear()}
          parteId={partesList[0]?.id || 'parte-general'}
          config={config}
          funcionesGuardia={partesList[0]?.funcionesPersonal || []}
          personalList={personalList}
          gruposList={gruposList}
          partesList={partesList}
          currentUser={currentUser}
          onSave={(interv) => {
            onSaveIntervencion(interv);
            setIsIntervencionModalOpen(false);
          }}
          onSaveConfig={onSaveConfig}
          onClose={() => setIsIntervencionModalOpen(false)}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!intervToDelete}
        title="Eliminar Registro de Intervención"
        message={`¿Confirma eliminar la intervención ${intervToDelete?.codigoIntervencion || ''} correspondiente al hecho "${intervToDelete?.hecho || ''}"?`}
        confirmLabel="Eliminar Intervención"
        isDestructive={true}
        onConfirm={() => {
          if (intervToDelete) {
            onDeleteIntervencion(intervToDelete.id);
            setIntervToDelete(null);
          }
        }}
        onClose={() => setIntervToDelete(null)}
      />

      {/* Modal de Confirmación de Reseteo de Contadores */}
      <ConfirmModal
        isOpen={!!confirmResetTipo}
        title="Reiniciar Contador Oficial"
        message={
          confirmResetTipo === 'lc'
            ? '¿Confirma reiniciar el contador de Labores Criminalísticas (LC) al número inicial 1?'
            : '¿Confirma reiniciar el contador de Siniestros y Hechos Viales al número inicial 1?'
        }
        confirmLabel="Reiniciar a 1"
        isDestructive={true}
        onConfirm={executeResetContador}
        onClose={() => setConfirmResetTipo(null)}
      />
    </div>
  );
};

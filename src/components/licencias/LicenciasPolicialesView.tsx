import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  FileText,
  BarChart3,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Ban,
  RotateCcw,
  Clock,
  Layers,
  X,
  Users,
  UserCheck,
  ShieldAlert,
  User,
  Building2,
  Lock,
  Tags,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ConfiguracionSistema,
  DelegacionPolicial,
  FeriadoDiaNoLaborable,
  LicenciaPolicial,
  Personal,
  SaldoLicenciaAnio,
  TipoFeriado,
  TipoLicenciaConfig,
  UsuarioSistema,
} from '../../types/police';
import {
  calcularAniosAntiguedad,
  calcularBalancePorAnio,
  ESCALA_ART_7,
  formatFechaDisplay,
  getDiasEscalaArt7,
  getLicenciaActivaPersonal,
  normalizeTiposLicenciaCatalogo,
} from '../../services/licenciaService';
import {
  generarPdfConstanciaLicencia,
  generarPdfReporteLicencias,
} from '../../services/pdfService';
import {
  ImportedFeriadoCandidate,
  importFeriadosFromImageOnServer,
  importFeriadosFromUrlOnServer,
} from '../../services/apiService';
import { ConfirmModal } from '../common/ConfirmModal';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { LicenciaModal } from './LicenciaModal';
import { InterrumpirLicenciaModal } from './InterrumpirLicenciaModal';

interface LicenciasPolicialesViewProps {
  personalList: Personal[];
  licencias: LicenciaPolicial[];
  saldosLicencias: SaldoLicenciaAnio[];
  feriados: FeriadoDiaNoLaborable[];
  delegacionesList: DelegacionPolicial[];
  activeDelegacionId: string;
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSaveLicencia: (lic: LicenciaPolicial) => Promise<void> | void;
  onDeleteLicencia: (id: string) => Promise<void> | void;
  onSaveSaldoLicencia: (saldo: SaldoLicenciaAnio) => Promise<void> | void;
  onSaveFeriado: (feriado: FeriadoDiaNoLaborable) => Promise<void> | void;
  onSaveFeriadosBulk: (feriados: FeriadoDiaNoLaborable[]) => Promise<void> | void;
  onDeleteFeriado: (id: string) => Promise<void> | void;
  onSaveConfig: (cfg: ConfiguracionSistema) => Promise<void> | void;
}

const CHART_COLORS = ['#1e3a8a', '#0f766e', '#d97706', '#dc2626', '#4f46e5', '#0284c7'];

export const LicenciasPolicialesView: React.FC<LicenciasPolicialesViewProps> = ({
  personalList,
  licencias,
  saldosLicencias,
  feriados,
  delegacionesList,
  activeDelegacionId,
  config,
  currentUser,
  onSaveLicencia,
  onDeleteLicencia,
  onSaveSaldoLicencia,
  onSaveFeriado,
  onSaveFeriadosBulk,
  onDeleteFeriado,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'registro' | 'saldos' | 'feriados' | 'reportes'>('registro');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonalFilter, setSelectedPersonalFilter] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'vigente' | 'programada' | 'finalizada' | 'interrumpida'>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Permisos de Delegación
  const puedeVerTodasDelegaciones = currentUser?.rol === 'superusuario';
  const puedeVerMultiplesDelegaciones =
    puedeVerTodasDelegaciones || Boolean(currentUser?.puedeVerOtrasDelegaciones);

  const delegacionesPermitidas = useMemo(() => {
    if (puedeVerTodasDelegaciones) return delegacionesList;
    if (puedeVerMultiplesDelegaciones) {
      const allowedIds = new Set<string>(currentUser?.delegacionesPermitidas || []);
      if (currentUser?.delegacionId) allowedIds.add(currentUser.delegacionId);
      const list = delegacionesList.filter((d) => allowedIds.has(d.id));
      return list.length > 0 ? list : delegacionesList.filter((d) => d.id === activeDelegacionId);
    }
    const fixedId = currentUser?.delegacionId || activeDelegacionId;
    return delegacionesList.filter((d) => d.id === fixedId);
  }, [delegacionesList, puedeVerTodasDelegaciones, puedeVerMultiplesDelegaciones, currentUser, activeDelegacionId]);

  const fixedUserDelegacionId = currentUser?.delegacionId || activeDelegacionId || 'del-laguna-blanca';
  const [delegacionFilter, setDelegacionFilter] = useState<string>(
    puedeVerMultiplesDelegaciones ? activeDelegacionId : fixedUserDelegacionId
  );

  // Sincronizar con la barra superior central cuando cambia activeDelegacionId
  useEffect(() => {
    if (!puedeVerMultiplesDelegaciones) {
      setDelegacionFilter(fixedUserDelegacionId);
    } else if (activeDelegacionId) {
      setDelegacionFilter(activeDelegacionId);
    }
  }, [activeDelegacionId, puedeVerMultiplesDelegaciones, fixedUserDelegacionId]);

  const effectiveDelegacionFilter = puedeVerMultiplesDelegaciones
    ? delegacionFilter
    : fixedUserDelegacionId;

  useEffect(() => {
    setSelectedPersonalFilter('todos');
  }, [effectiveDelegacionFilter]);

  const allowedDelegacionIds = useMemo(
    () => new Set(delegacionesPermitidas.map((d) => d.id)),
    [delegacionesPermitidas]
  );

  const delegacionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of delegacionesList) {
      map.set(d.id, d.ciudad ? `${d.siglas} (${d.ciudad})` : d.nombre);
    }
    return map;
  }, [delegacionesList]);

  const activeDelegacionObj = useMemo(
    () => delegacionesList.find((d) => d.id === effectiveDelegacionFilter),
    [delegacionesList, effectiveDelegacionFilter]
  );

  const activeDelegacionLabel =
    effectiveDelegacionFilter === 'todas'
      ? 'Todas las Delegaciones'
      : activeDelegacionObj
      ? activeDelegacionObj.nombre
      : config.dependencia || effectiveDelegacionFilter;

  const personalMapAll = useMemo(() => {
    const m = new Map<string, Personal>();
    personalList.forEach((p) => m.set(p.id, p));
    return m;
  }, [personalList]);

  // Datos autorizados (para modales con selector de delegación permitido)
  const allowedPersonal = useMemo(() => {
    return personalList.filter((p) => {
      const delId = p.delegacionId || 'del-laguna-blanca';
      return puedeVerTodasDelegaciones || allowedDelegacionIds.has(delId);
    });
  }, [personalList, puedeVerTodasDelegaciones, allowedDelegacionIds]);

  const allowedLicencias = useMemo(() => {
    return licencias.filter((l) => {
      const owner = personalMapAll.get(l.personalId);
      const delId = l.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return puedeVerTodasDelegaciones || allowedDelegacionIds.has(delId);
    });
  }, [licencias, personalMapAll, puedeVerTodasDelegaciones, allowedDelegacionIds]);

  const allowedSaldos = useMemo(() => {
    return saldosLicencias.filter((s) => {
      const owner = personalMapAll.get(s.personalId);
      const delId = s.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return puedeVerTodasDelegaciones || allowedDelegacionIds.has(delId);
    });
  }, [saldosLicencias, personalMapAll, puedeVerTodasDelegaciones, allowedDelegacionIds]);

  // Datos filtrados por el filtro de delegación activo
  const scopedPersonal = useMemo(() => {
    if (effectiveDelegacionFilter === 'todas') return allowedPersonal;
    return allowedPersonal.filter(
      (p) => (p.delegacionId || 'del-laguna-blanca') === effectiveDelegacionFilter
    );
  }, [allowedPersonal, effectiveDelegacionFilter]);

  const scopedLicencias = useMemo(() => {
    if (effectiveDelegacionFilter === 'todas') return allowedLicencias;
    return allowedLicencias.filter((l) => {
      const owner = personalMapAll.get(l.personalId);
      const delId = l.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return delId === effectiveDelegacionFilter;
    });
  }, [allowedLicencias, personalMapAll, effectiveDelegacionFilter]);

  const scopedSaldos = useMemo(() => {
    if (effectiveDelegacionFilter === 'todas') return allowedSaldos;
    return allowedSaldos.filter((s) => {
      const owner = personalMapAll.get(s.personalId);
      const delId = s.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return delId === effectiveDelegacionFilter;
    });
  }, [allowedSaldos, personalMapAll, effectiveDelegacionFilter]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaPolicial | null>(null);
  const [preselectedPersonalId, setPreselectedPersonalId] = useState<string | undefined>(undefined);
  const [interruptingLicencia, setInterruptingLicencia] = useState<LicenciaPolicial | null>(null);
  const [deleteLicConfirm, setDeleteLicConfirm] = useState<LicenciaPolicial | null>(null);

  // Modal de gestión rápida de Tipos de Licencia
  const [isTiposModalOpen, setIsTiposModalOpen] = useState(false);
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState('');
  const [nuevoTipoDescuentaSaldo, setNuevoTipoDescuentaSaldo] = useState(false);
  const [nuevoTipoDiasSugeridos, setNuevoTipoDiasSugeridos] = useState<number>(0);

  // Saldos: del año actual hasta dos años anteriores (ej. en 2026 -> 2024, 2025, 2026)
  const currentYear = new Date().getFullYear();
  const [extraAnios, setExtraAnios] = useState<number[]>([]);
  const [newAnioInput, setNewAnioInput] = useState<string>(String(currentYear - 3));
  const [editingSaldoCell, setEditingSaldoCell] = useState<{
    personal: Personal;
    anio: number;
    diasCorrespondientes: number;
    diasUsados: number;
    vencido: boolean;
    motivoVencimiento: string;
  } | null>(null);

  // Feriados
  const [feriadoYearFilter, setFeriadoYearFilter] = useState<string>(String(currentYear));
  const [feriadoTipoFilter, setFeriadoTipoFilter] = useState<string>('todos');
  const [feriadoSearch, setFeriadoSearch] = useState('');
  const [newFeriadoFecha, setNewFeriadoFecha] = useState('');
  const [newFeriadoNombre, setNewFeriadoNombre] = useState('');
  const [newFeriadoTipo, setNewFeriadoTipo] = useState<TipoFeriado>('Nacional');
  const [deleteFeriadoConfirm, setDeleteFeriadoConfirm] = useState<FeriadoDiaNoLaborable | null>(null);

  // Importación automática URL / Imagen
  const [importUrl, setImportUrl] = useState(`https://api.argentinadatos.com/v1/feriados/${currentYear}`);
  const [importImageAnio, setImportImageAnio] = useState<number>(currentYear);
  const [isImportingFeriados, setIsImportingFeriados] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [importCandidates, setImportCandidates] = useState<
    Array<ImportedFeriadoCandidate & { selected: boolean; origen: 'URL' | 'Imagen'; urlFuente?: string }>
  >([]);

  const tiposLicencia: TipoLicenciaConfig[] = useMemo(() => {
    return normalizeTiposLicenciaCatalogo(config.tiposLicenciaCatalogo);
  }, [config.tiposLicenciaCatalogo]);

  // Por defecto: año actual y dos anteriores (ej. 2024, 2025, 2026), más cualquier año agregado manualmente
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>([currentYear - 2, currentYear - 1, currentYear, ...extraAnios]);
    return Array.from(set).sort((a, b) => a - b);
  }, [currentYear, extraAnios]);

  const todayYmd = new Date().toISOString().slice(0, 10);

  const getEstadoLicencia = (lic: LicenciaPolicial): 'Interrumpida' | 'En Curso' | 'Programada' | 'Finalizada' => {
    if (lic.fueInterrumpida) return 'Interrumpida';
    if (todayYmd >= lic.fechaSalida && todayYmd <= lic.fechaFinLicencia) return 'En Curso';
    if (todayYmd < lic.fechaSalida) return 'Programada';
    return 'Finalizada';
  };

  // KPIs: ÚNICAMENTE Personal Activo, Personal en Licencia e Interrumpidas
  const kpis = useMemo(() => {
    let personalActivo = 0;
    let personalEnLicencia = 0;

    for (const p of scopedPersonal) {
      if (p.estado === 'Pasiva' || p.estado === 'Retirado') continue;
      const cond = getLicenciaActivaPersonal(p.id, todayYmd, scopedLicencias, scopedPersonal);
      if (cond?.enLicencia) {
        personalEnLicencia++;
      } else {
        personalActivo++;
      }
    }

    const interrumpidas = scopedLicencias.filter((l) => l.fueInterrumpida).length;
    return { personalActivo, personalEnLicencia, interrumpidas };
  }, [scopedPersonal, scopedLicencias, todayYmd]);

  const filteredLicencias = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...scopedLicencias]
      .filter((l) => {
        const matchPersonal =
          selectedPersonalFilter === 'todos' || l.personalId === selectedPersonalFilter;
        const matchSearch =
          !q ||
          (l.apellidoYNombre || '').toLowerCase().includes(q) ||
          (l.dni || '').includes(q) ||
          (l.jerarquia || '').toLowerCase().includes(q) ||
          (l.subtipoEtiqueta || '').toLowerCase().includes(q) ||
          (l.parentescoFallecimiento || '').toLowerCase().includes(q) ||
          (l.articuloReglamento || '').toLowerCase().includes(q) ||
          (l.disposicionNro || '').toLowerCase().includes(q);
        const matchTipo = filtroTipo === 'todos' || l.tipoLicencia === filtroTipo;
        const est = getEstadoLicencia(l);
        const matchEstado =
          filtroEstado === 'todos' ||
          (filtroEstado === 'vigente' && est === 'En Curso') ||
          (filtroEstado === 'programada' && est === 'Programada') ||
          (filtroEstado === 'finalizada' && est === 'Finalizada') ||
          (filtroEstado === 'interrumpida' && est === 'Interrumpida');
        const matchDesde = !fechaDesde || (l.fechaSalida || '') >= fechaDesde;
        const matchHasta = !fechaHasta || (l.fechaSalida || '') <= fechaHasta;
        return matchPersonal && matchSearch && matchTipo && matchEstado && matchDesde && matchHasta;
      })
      .sort((a, b) => (b.fechaSalida || '').localeCompare(a.fechaSalida || ''));
  }, [scopedLicencias, selectedPersonalFilter, searchTerm, filtroTipo, filtroEstado, fechaDesde, fechaHasta, todayYmd]);

  const activeRegistroFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedPersonalFilter !== 'todos') count++;
    if (filtroTipo !== 'todos') count++;
    if (filtroEstado !== 'todos') count++;
    if (fechaDesde) count++;
    if (fechaHasta) count++;
    return count;
  }, [searchTerm, selectedPersonalFilter, filtroTipo, filtroEstado, fechaDesde, fechaHasta]);

  const handleClearRegistroFilters = () => {
    setSearchTerm('');
    setSelectedPersonalFilter('todos');
    setFiltroTipo('todos');
    setFiltroEstado('todos');
    setFechaDesde('');
    setFechaHasta('');
  };

  // Matriz de saldos POR PERSONAL
  const saldosMatrix = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedPersonal
      .filter((p) => {
        const matchSelect = selectedPersonalFilter === 'todos' || p.id === selectedPersonalFilter;
        const matchSearch =
          !q ||
          (p.apellidoYNombre || '').toLowerCase().includes(q) ||
          (p.dni || '').includes(q) ||
          (p.jerarquia || '').toLowerCase().includes(q);
        return matchSelect && matchSearch;
      })
      .map((p) => {
        const antiguedadAnios = calcularAniosAntiguedad(p.fechaIngreso);
        const escalaArt7 = getDiasEscalaArt7(antiguedadAnios);
        const balances = calcularBalancePorAnio(p, scopedSaldos, scopedLicencias, aniosDisponibles);
        const totalDisponibles = balances.reduce(
          (acc, b) => acc + (!b.enServicio || b.vencido ? 0 : b.diasDisponibles),
          0
        );
        const totalUsados = balances.reduce((acc, b) => acc + (b.enServicio ? b.diasUsados : 0), 0);
        const totalCorrespondientes = balances.reduce(
          (acc, b) => acc + (b.enServicio ? b.diasCorrespondientes : 0),
          0
        );
        const aniosVencidos = balances
          .filter((b) => b.enServicio && b.vencido)
          .map((b) => String(b.anio))
          .join(', ');
        return {
          personal: p,
          delegacionNombre: delegacionNameMap.get(p.delegacionId || 'del-laguna-blanca') || 'Delegación',
          antiguedadAnios,
          escalaArt7,
          balances,
          totalCorrespondientes,
          totalDisponibles,
          totalUsados,
          aniosVencidos,
        };
      });
  }, [scopedPersonal, selectedPersonalFilter, searchTerm, scopedSaldos, scopedLicencias, aniosDisponibles, delegacionNameMap]);

  // Totales por año respecto del conjunto filtrado
  const totalesPorAnio = useMemo(() => {
    return aniosDisponibles.map((anio) => {
      let correspondientes = 0;
      let usados = 0;
      let vencidos = 0;
      let disponibles = 0;

      for (const row of saldosMatrix) {
        const b = row.balances.find((item) => item.anio === anio);
        if (!b || !b.enServicio) continue;
        correspondientes += b.diasCorrespondientes;
        usados += b.diasUsados;
        if (b.vencido) {
          vencidos += Math.max(0, b.diasCorrespondientes - b.diasUsados);
        } else {
          disponibles += b.diasDisponibles;
        }
      }

      return { anio, correspondientes, usados, vencidos, disponibles };
    });
  }, [aniosDisponibles, saldosMatrix]);

  const granTotalAnios = useMemo(() => {
    return totalesPorAnio.reduce(
      (acc, y) => ({
        correspondientes: acc.correspondientes + y.correspondientes,
        usados: acc.usados + y.usados,
        vencidos: acc.vencidos + y.vencidos,
        disponibles: acc.disponibles + y.disponibles,
      }),
      { correspondientes: 0, usados: 0, vencidos: 0, disponibles: 0 }
    );
  }, [totalesPorAnio]);

  // Datos para gráficos
  const chartDataPorAnio = useMemo(() => {
    return totalesPorAnio.map((t) => ({
      anio: String(t.anio),
      Disponibles: t.disponibles,
      Usados: t.usados,
      Vencidos: t.vencidos,
    }));
  }, [totalesPorAnio]);

  const chartDataPersonal = useMemo(() => {
    return saldosMatrix.slice(0, 15).map((r) => {
      const vencidosDias = r.balances
        .filter((b) => b.enServicio && b.vencido)
        .reduce((acc, b) => acc + Math.max(0, b.diasCorrespondientes - b.diasUsados), 0);
      return {
        nombre: r.personal.apellidoYNombre.split(',')[0] || r.personal.apellidoYNombre.slice(0, 16),
        Disponibles: r.totalDisponibles,
        Usados: r.totalUsados,
        Vencidos: vencidosDias,
      };
    });
  }, [saldosMatrix]);

  const chartDataTipos = useMemo(() => {
    const counts = new Map<string, number>();
    scopedLicencias.forEach((l) => {
      counts.set(l.tipoLicencia, (counts.get(l.tipoLicencia) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [scopedLicencias]);

  const chartDataInterrupciones = useMemo(() => {
    const interrumpidas = scopedLicencias.filter((l) => l.fueInterrumpida).length;
    const normales = scopedLicencias.length - interrumpidas;
    return [
      { name: 'Gozadas s/ Interrupción', value: normales },
      { name: 'Interrumpidas (Art. 15)', value: interrumpidas },
    ];
  }, [scopedLicencias]);

  const chartDataMensualSalidas = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const map = new Map<string, { salidas: number; dias: number }>();
    meses.forEach((m) => map.set(m, { salidas: 0, dias: 0 }));
    scopedLicencias.forEach((l) => {
      if (!l.fechaSalida) return;
      const d = new Date(l.fechaSalida + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        const key = meses[d.getMonth()];
        const cur = map.get(key)!;
        cur.salidas += 1;
        cur.dias += (l.diasHabilesSolicitados || 0) + (l.diasViajeArt11 || 0);
      }
    });
    return meses.map((mes) => ({
      mes,
      Salidas: map.get(mes)?.salidas || 0,
      Dias: map.get(mes)?.dias || 0,
    }));
  }, [scopedLicencias]);

  const diasOtorgadosTotales = useMemo(
    () =>
      scopedLicencias.reduce(
        (acc, l) => acc + (l.diasHabilesSolicitados || 0) + (l.diasViajeArt11 || 0),
        0
      ),
    [scopedLicencias]
  );

  const filteredFeriados = useMemo(() => {
    const q = feriadoSearch.trim().toLowerCase();
    return [...feriados]
      .filter((f) => {
        const matchYear = feriadoYearFilter === 'todos' || f.fecha.startsWith(feriadoYearFilter);
        const matchTipo = feriadoTipoFilter === 'todos' || f.tipo === feriadoTipoFilter;
        const matchSearch =
          !q || f.nombre.toLowerCase().includes(q) || f.tipo.toLowerCase().includes(q) || f.fecha.includes(q);
        return matchYear && matchTipo && matchSearch;
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [feriados, feriadoYearFilter, feriadoTipoFilter, feriadoSearch]);

  const handleToggleVencido = async (
    personal: Personal,
    anio: number,
    currentSaldo: SaldoLicenciaAnio | undefined,
    diasEscala: number,
    currentlyVencido: boolean
  ) => {
    const now = new Date().toISOString();
    const record: SaldoLicenciaAnio = currentSaldo
      ? {
          ...currentSaldo,
          vencido: !currentlyVencido,
          fechaVencimiento: !currentlyVencido ? todayYmd : undefined,
          motivoVencimiento: !currentlyVencido ? 'Marcado como vencido por Superioridad / Personal' : undefined,
          updatedAt: now,
        }
      : {
          id: `${personal.id}_${anio}`,
          personalId: personal.id,
          anio,
          diasCorrespondientes: diasEscala,
          diasUsados: 0,
          vencido: !currentlyVencido,
          fechaVencimiento: !currentlyVencido ? todayYmd : undefined,
          motivoVencimiento: !currentlyVencido ? 'Marcado como vencido por Superioridad / Personal' : undefined,
          delegacionId:
            personal.delegacionId ||
            (effectiveDelegacionFilter === 'todas' ? activeDelegacionId : effectiveDelegacionFilter),
          createdAt: now,
          updatedAt: now,
        };
    await onSaveSaldoLicencia(record);
  };

  const handleAddTipoLicencia = async (nuevoTipo: TipoLicenciaConfig) => {
    if (tiposLicencia.some((t) => t.nombre.toLowerCase() === nuevoTipo.nombre.toLowerCase())) return;
    const updatedCatalog = [...tiposLicencia, nuevoTipo];
    await onSaveConfig({ ...config, tiposLicenciaCatalogo: updatedCatalog });
  };

  const handleDeleteTipoLicencia = async (id: string) => {
    const target = tiposLicencia.find((t) => t.id === id);
    if (!target || target.esDefault) return;
    const updatedCatalog = tiposLicencia.filter((t) => t.id !== id);
    await onSaveConfig({ ...config, tiposLicenciaCatalogo: updatedCatalog });
  };

  const handleAddManualFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeriadoFecha || !newFeriadoNombre.trim()) return;
    const now = new Date().toISOString();
    await onSaveFeriado({
      id: `fer-${newFeriadoFecha}-${Date.now()}`,
      fecha: newFeriadoFecha,
      nombre: newFeriadoNombre.trim(),
      tipo: newFeriadoTipo,
      origen: 'Manual',
      createdAt: now,
      updatedAt: now,
    });
    setNewFeriadoFecha('');
    setNewFeriadoNombre('');
    setImportFeedback({ type: 'ok', text: 'Feriado / día no laborable agregado correctamente.' });
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setIsImportingFeriados(true);
    setImportFeedback(null);
    const res = await importFeriadosFromUrlOnServer(importUrl.trim());
    setIsImportingFeriados(false);
    if (!res.success || !res.feriados) {
      setImportFeedback({ type: 'err', text: res.error || 'No se pudieron obtener feriados desde la URL.' });
      return;
    }
    if (res.feriados.length === 0) {
      setImportFeedback({ type: 'err', text: 'No se detectaron fechas de feriados en el sitio indicado.' });
      return;
    }
    setImportCandidates(
      res.feriados.map((f) => ({ ...f, selected: true, origen: 'URL', urlFuente: importUrl.trim() }))
    );
    setImportFeedback({
      type: 'ok',
      text: `Se detectaron ${res.feriados.length} feriados desde el sitio (${res.source || 'URL'}). Revise y confirme la importación.`,
    });
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingFeriados(true);
    setImportFeedback(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await importFeriadosFromImageOnServer(dataUrl, importImageAnio);
      setIsImportingFeriados(false);
      if (!res.success || !res.feriados) {
        setImportFeedback({ type: 'err', text: res.error || 'No se pudieron extraer feriados de la imagen.' });
        return;
      }
      if (res.feriados.length === 0) {
        setImportFeedback({ type: 'err', text: 'No se detectaron fechas claras en la imagen seleccionada.' });
        return;
      }
      setImportCandidates(res.feriados.map((f) => ({ ...f, selected: true, origen: 'Imagen' })));
      setImportFeedback({
        type: 'ok',
        text: `Se extrajeron ${res.feriados.length} feriados desde la imagen. Revise y confirme la importación.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmImportCandidates = async () => {
    const selected = importCandidates.filter((c) => c.selected);
    if (selected.length === 0) return;
    const now = new Date().toISOString();
    const existingByDate = new Map(feriados.map((f) => [f.fecha.slice(0, 10), f]));

    const toSave: FeriadoDiaNoLaborable[] = selected.map((c) => {
      const existing = existingByDate.get(c.fecha);
      return {
        id: existing?.id || `fer-${c.fecha}-${Math.random().toString(36).slice(2, 6)}`,
        fecha: c.fecha,
        nombre: c.nombre,
        tipo: c.tipo,
        origen: c.origen,
        urlFuente: c.urlFuente,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
    });

    await onSaveFeriadosBulk(toSave);
    setImportCandidates([]);
    setImportFeedback({ type: 'ok', text: `Se importaron/actualizaron ${toSave.length} feriados correctamente.` });
  };

  const handleExportPdfReporte = () => {
    generarPdfReporteLicencias(
      filteredLicencias,
      saldosMatrix.map((r) => ({
        jerarquia: r.personal.jerarquia,
        apellidoYNombre: r.personal.apellidoYNombre,
        dni: r.personal.dni,
        antiguedadAnios: r.antiguedadAnios,
        escalaArt7: r.escalaArt7,
        totalDisponibles: r.totalDisponibles,
        totalUsados: r.totalUsados,
        aniosVencidos: r.aniosVencidos,
      })),
      config
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Delegacion',
      'Jerarquia',
      'Apellido y Nombre',
      'DNI',
      'Fecha Ingreso',
      'Antiguedad Anios',
      'Tipo Licencia',
      'Fecha Salida',
      'Dias Habiles',
      'Dias Viaje Art 11',
      'Fecha Reanudacion',
      'Hora Reanudacion',
      'Imputacion Multi-Anio',
      'Fue Interrumpida Art 15',
      'Motivo Interrupcion',
    ];
    const rows = filteredLicencias.map((l) => [
      delegacionNameMap.get(l.delegacionId || 'del-laguna-blanca') || l.delegacionId || '',
      l.jerarquia,
      l.apellidoYNombre,
      l.dni,
      l.fechaIngreso || '',
      String(l.antiguedadAnios),
      l.tipoLicencia,
      l.fechaSalida,
      String(l.diasHabilesSolicitados),
      String(l.diasViajeArt11 || 0),
      l.fechaReanudacion,
      l.horaReanudacion || '08:00',
      (l.imputacionAnios || []).map((i) => `${i.anio}:${i.dias}d`).join(' | '),
      l.fueInterrumpida ? 'SI' : 'NO',
      l.motivoInterrupcion || '',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Licencias_Policiales_${todayYmd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const singleRow = selectedPersonalFilter !== 'todos' && saldosMatrix.length === 1 ? saldosMatrix[0] : null;
  const defaultModalDelegacionId =
    effectiveDelegacionFilter === 'todas'
      ? delegacionesPermitidas[0]?.id || activeDelegacionId
      : effectiveDelegacionFilter;

  const renderFiltroDelegacion = () => {
    if (!puedeVerMultiplesDelegaciones) {
      return (
        <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{activeDelegacionLabel}</span>
        </div>
      );
    }
    return (
      <div className="relative">
        <Building2 className="w-3.5 h-3.5 text-blue-900 absolute left-3 top-2.5 pointer-events-none" />
        <select
          value={effectiveDelegacionFilter}
          onChange={(e) => setDelegacionFilter(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
        >
          <option value="todas">Todas las Delegaciones</option>
          {delegacionesPermitidas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.ciudad ? `${d.siglas} (${d.ciudad})` : d.nombre}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Principal */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Régimen de Licencias Policiales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeDelegacionLabel} — Cómputo automático en días hábiles administrativos, Escala progresiva Art. 7, Traslado Art. 11, Imputación Multi-Año e Interrupción Art. 15.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTiposModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <Tags className="w-3.5 h-3.5 text-blue-800" />
            <span>Tipos de Licencia</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdfReporte}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reporte PDF</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingLicencia(null);
              setPreselectedPersonalId(
                selectedPersonalFilter !== 'todos' ? selectedPersonalFilter : undefined
              );
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Licencia</span>
          </button>
        </div>
      </div>

      {/* KPIs: ÚNICAMENTE Personal Activo, Personal en Licencia e Interrumpidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Personal Activo</div>
            <div className="text-2xl font-extrabold text-emerald-800 tabular-nums mt-0.5">
              {kpis.personalActivo}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Personal en Licencia</div>
            <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-0.5">
              {kpis.personalEnLicencia}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Interrumpidas</div>
            <div className="text-2xl font-extrabold text-red-700 tabular-nums mt-0.5">
              {kpis.interrumpidas}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-red-50 text-red-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex flex-wrap gap-1 shadow-2xs text-xs">
        {[
          { id: 'registro', label: 'Licencias Registradas', icon: Calendar },
          { id: 'saldos', label: `Días Disponibles por Personal (${currentYear - 2}–${currentYear})`, icon: Layers },
          { id: 'feriados', label: `Feriados y Días No Laborables (${feriados.length})`, icon: Globe },
          { id: 'reportes', label: 'Reportes y Gráficos', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LICENCIAS REGISTRADAS */}
      {activeTab === 'registro' && (
        <div className="space-y-4">
          {/* Filtros de búsqueda por Personal, Delegación, Tipo y Estado (Plegable) */}
          <CollapsibleFilterBar
            title="Filtros de Búsqueda de Licencias"
            activeFiltersCount={activeRegistroFiltersCount}
            onClear={handleClearRegistroFilters}
            summaryRight={
              <span>
                Mostrando <strong>{filteredLicencias.length}</strong> de {scopedLicencias.length} licencias
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar personal, DNI, disposición..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {renderFiltroDelegacion()}

              <div className="relative">
                <User className="w-3.5 h-3.5 text-blue-900 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={selectedPersonalFilter}
                  onChange={(e) => setSelectedPersonalFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="todos">Todo el personal ({scopedPersonal.length})</option>
                  {scopedPersonal.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jerarquia} — {p.apellidoYNombre}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="todos">Todos los Tipos de Licencia</option>
                {tiposLicencia.map((t) => (
                  <option key={t.id} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="todos">Todos los Estados</option>
                <option value="vigente">En Curso Hoy</option>
                <option value="programada">Programadas</option>
                <option value="finalizada">Finalizadas</option>
                <option value="interrumpida">Interrumpidas (Art. 15)</option>
              </select>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">Salida desde:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">Salida hasta:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </CollapsibleFilterBar>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3 px-3">Jerarquía / Apellido y Nombre</th>
                  {effectiveDelegacionFilter === 'todas' && <th className="py-3 px-3">Delegación</th>}
                  <th className="py-3 px-3">DNI / Antigüedad</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Salida</th>
                  <th className="py-3 px-3">Días Hábiles + Art. 11</th>
                  <th className="py-3 px-3">Reanudación</th>
                  <th className="py-3 px-3">Imputación Multi-Año</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLicencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={effectiveDelegacionFilter === 'todas' ? 10 : 9}
                      className="py-10 text-center text-slate-500"
                    >
                      No hay licencias registradas en {activeDelegacionLabel} con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLicencias.map((lic) => {
                    const est = getEstadoLicencia(lic);
                    const delName =
                      delegacionNameMap.get(
                        lic.delegacionId ||
                          personalMapAll.get(lic.personalId)?.delegacionId ||
                          'del-laguna-blanca'
                      ) || 'Delegación';
                    return (
                      <tr key={lic.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-[10px] font-bold text-blue-900 uppercase">{lic.jerarquia}</div>
                          <div className="font-bold text-slate-900">{lic.apellidoYNombre}</div>
                        </td>
                        {effectiveDelegacionFilter === 'todas' && (
                          <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-700">{delName}</td>
                        )}
                        <td className="py-2.5 px-3 font-mono">
                          <div>{lic.dni}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Antig.: {lic.antiguedadAnios} {lic.antiguedadAnios === 1 ? 'año' : 'años'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{lic.tipoLicencia}</div>
                          {lic.subtipoEtiqueta && (
                            <div className="text-[10px] text-indigo-900 font-semibold leading-tight mt-0.5">
                              {lic.subtipoEtiqueta}
                            </div>
                          )}
                          {lic.esSinGoceHaberes && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-bold">
                              Sin goce hab. (Art. 62)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{formatFechaDisplay(lic.fechaSalida)}</td>
                        <td className="py-2.5 px-3 tabular-nums">
                          <span className="font-bold text-slate-900">
                            {lic.diasHabilesSolicitados} {lic.modoComputo === 'corridos' ? 'd. corr.' : 'd. háb.'}
                          </span>
                          {lic.diasViajeArt11 > 0 && (
                            <div className="text-[10px] font-semibold text-indigo-800">
                              +{lic.diasViajeArt11} d. Art. 11 ({lic.distanciaKm || 0} km)
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-emerald-900 font-mono">
                            {formatFechaDisplay(lic.fechaReanudacion)}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{lic.horaReanudacion || '08:00'} hs.</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {lic.imputacionAnios && lic.imputacionAnios.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lic.imputacionAnios.map((i) => (
                                <span
                                  key={i.anio}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-mono text-[10px] font-bold"
                                >
                                  {i.anio}: {i.dias}d
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500">No descuenta Anual</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              est === 'En Curso'
                                ? 'bg-blue-100 text-blue-900'
                                : est === 'Interrumpida'
                                ? 'bg-red-100 text-red-800'
                                : est === 'Programada'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {est === 'Interrumpida' ? 'Interrumpida (Art. 15)' : est}
                          </span>
                          {lic.fueInterrumpida && (
                            <div className="text-[10px] text-red-700 max-w-[170px] truncate mt-0.5" title={lic.motivoInterrupcion}>
                              {lic.diasRestituidos ? `Restituidos: ${lic.diasRestituidos} d. • ` : ''}
                              {lic.motivoInterrupcion || ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setInterruptingLicencia(lic)}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                lic.fueInterrumpida
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                              }`}
                              title={
                                lic.fueInterrumpida
                                  ? 'Ver / modificar interrupción (Art. 15)'
                                  : 'Interrumpir licencia desde tabla (Art. 15)'
                              }
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>{lic.fueInterrumpida ? 'Art. 15' : 'Interrumpir'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => generarPdfConstanciaLicencia(lic, config)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                              title="Constancia PDF con vista previa"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLicencia(lic);
                                setPreselectedPersonalId(undefined);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                              title="Editar licencia"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteLicConfirm(lic)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Eliminar licencia"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DÍAS DISPONIBLES POR PERSONAL (AÑO ACTUAL HASTA DOS ANTERIORES) */}
      {activeTab === 'saldos' && (
        <div className="space-y-4">
          {/* Referencia oficial Escala Art. 7 + agregar año adicional si se necesita */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-blue-200">
                Escala Progresiva por Antigüedad en cada Año (Art. 7) — Período {aniosDisponibles[0]} a {aniosDisponibles[aniosDisponibles.length - 1]}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Los días disponibles son individuales por cada efectivo, calculados desde el año actual hasta dos años anteriores según su antigüedad en cada año.
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                {ESCALA_ART_7.map((e) => (
                  <span key={e.rango} className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                    <strong className="text-blue-200">{e.rango}:</strong> {e.dias} días hábiles
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={1990}
                max={2040}
                value={newAnioInput}
                onChange={(e) => setNewAnioInput(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const y = Number(newAnioInput);
                  if (y >= 1980 && y <= 2050 && !aniosDisponibles.includes(y)) {
                    setExtraAnios((prev) => [...prev, y]);
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Año</span>
              </button>
            </div>
          </div>

          {/* Buscador + Filtro de Delegación + Selector de Personal Específico (Plegable) */}
          <CollapsibleFilterBar
            title="Filtros de Búsqueda de Personal y Saldos"
            activeFiltersCount={(searchTerm.trim() ? 1 : 0) + (selectedPersonalFilter !== 'todos' ? 1 : 0)}
            onClear={() => {
              setSearchTerm('');
              setSelectedPersonalFilter('todos');
            }}
            summaryRight={
              <span>
                Mostrando <strong>{saldosMatrix.length}</strong> de {scopedPersonal.length} efectivos
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar personal por Jerarquía, Apellido, Nombre o DNI..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {renderFiltroDelegacion()}

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-900 shrink-0" />
                <select
                  value={selectedPersonalFilter}
                  onChange={(e) => setSelectedPersonalFilter(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="todos">Todo el personal ({scopedPersonal.length})</option>
                  {scopedPersonal.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jerarquia} — {p.apellidoYNombre} (DNI {p.dni})
                    </option>
                  ))}
                </select>
                {selectedPersonalFilter !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => setSelectedPersonalFilter('todos')}
                    className="px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    Todos
                  </button>
                )}
              </div>
            </div>
          </CollapsibleFilterBar>

          {/* Ficha destacada cuando se selecciona un efectivo puntual */}
          {singleRow && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-blue-900 uppercase">
                    {singleRow.personal.jerarquia} • {singleRow.delegacionNombre}
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {singleRow.personal.apellidoYNombre} — DNI {singleRow.personal.dni}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Fecha de Ingreso:{' '}
                    <strong className="font-mono">
                      {singleRow.personal.fechaIngreso ? formatFechaDisplay(singleRow.personal.fechaIngreso) : 'Sin registro'}
                    </strong>{' '}
                    • Antigüedad actual: <strong>{singleRow.antiguedadAnios} {singleRow.antiguedadAnios === 1 ? 'año' : 'años'}</strong>
                  </div>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl px-4 py-2 text-center shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Disponible</div>
                  <div className="text-xl font-extrabold text-emerald-800 tabular-nums">
                    {singleRow.totalDisponibles} días
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {singleRow.balances.map((b) => (
                  <div key={b.anio} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">Año {b.anio}</span>
                      <span className={b.vencido ? 'text-red-700' : 'text-emerald-800'}>
                        {!b.enServicio ? 'Sin ingreso' : b.vencido ? 'VENCIDO' : `${b.diasDisponibles} disp.`}
                      </span>
                    </div>
                    {b.enServicio && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Antigüedad en {b.anio}: <strong>{b.antiguedadEnAnio} años</strong> • Corresp.: {b.diasCorrespondientes} d. • Usados: {b.diasUsados} d.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matriz por Personal y Año */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3 px-3 sticky left-0 bg-slate-900 z-10 min-w-[180px]">
                    Jerarquía / Apellido y Nombre
                  </th>
                  {effectiveDelegacionFilter === 'todas' && <th className="py-3 px-3">Delegación</th>}
                  <th className="py-3 px-3">DNI</th>
                  <th className="py-3 px-3">Fecha Ingreso / Antigüedad</th>
                  <th className="py-3 px-3 text-center">Escala Actual</th>
                  {aniosDisponibles.map((anio) => (
                    <th key={anio} className="py-3 px-3 text-center min-w-[140px]">
                      Período {anio}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">Total Disp.</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saldosMatrix.length === 0 ? (
                  <tr>
                    <td
                      colSpan={aniosDisponibles.length + (effectiveDelegacionFilter === 'todas' ? 7 : 6)}
                      className="py-8 text-center text-slate-500"
                    >
                      No hay personal que coincida con la búsqueda en {activeDelegacionLabel}.
                    </td>
                  </tr>
                ) : (
                  saldosMatrix.map((row) => (
                    <tr key={row.personal.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <div className="text-[10px] font-bold text-blue-900 uppercase">{row.personal.jerarquia}</div>
                        <div className="font-bold text-slate-900">{row.personal.apellidoYNombre}</div>
                      </td>
                      {effectiveDelegacionFilter === 'todas' && (
                        <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-700">
                          {row.delegacionNombre}
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-mono">{row.personal.dni}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[11px]">
                          {row.personal.fechaIngreso ? formatFechaDisplay(row.personal.fechaIngreso) : 'Sin registro'}
                        </div>
                        <div className="font-bold text-blue-900 text-[11px]">
                          {row.antiguedadAnios} {row.antiguedadAnios === 1 ? 'año' : 'años'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                        {row.escalaArt7} d.
                      </td>
                      {row.balances.map((b) => (
                        <td key={b.anio} className="py-2 px-2.5 text-center">
                          {!b.enServicio ? (
                            <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-[10px] text-slate-400">
                              Sin ingreso
                            </div>
                          ) : (
                            <div
                              className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                                b.vencido
                                  ? 'bg-red-50/70 border-red-200'
                                  : b.diasDisponibles === 0
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-emerald-50/50 border-emerald-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold tabular-nums">
                                <span className={b.vencido ? 'text-red-700 line-through' : 'text-emerald-900'}>
                                  {b.diasDisponibles} disp.
                                </span>
                                <span className="text-slate-500 text-[10px]">de {b.diasCorrespondientes}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span>{b.antiguedadEnAnio}a.</span>
                                <span>Usados: {b.diasUsados}d.</span>
                              </div>
                              <div className="flex items-center justify-center gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSaldoCell({
                                      personal: row.personal,
                                      anio: b.anio,
                                      diasCorrespondientes: b.diasCorrespondientes,
                                      diasUsados: b.saldoRecord?.diasUsados ?? b.diasUsados,
                                      vencido: b.vencido,
                                      motivoVencimiento: b.saldoRecord?.motivoVencimiento || '',
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[10px] font-semibold cursor-pointer"
                                  title="Editar días asignados/usados manualmente"
                                >
                                  Ajustar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleVencido(
                                      row.personal,
                                      b.anio,
                                      b.saldoRecord,
                                      b.diasCorrespondientes,
                                      b.vencido
                                    )
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer ${
                                    b.vencido
                                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                  title={b.vencido ? 'Reactivar período' : 'Marcar período como Vencido'}
                                >
                                  {b.vencido ? (
                                    <>
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      <span>Reactivar</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-2.5 h-2.5" />
                                      <span>Vencer</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center font-extrabold text-emerald-900 tabular-nums text-sm">
                        {row.totalDisponibles} d.
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLicencia(null);
                            setPreselectedPersonalId(row.personal.id);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-semibold text-[11px] cursor-pointer"
                        >
                          + Licencia
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {saldosMatrix.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td className="py-3 px-3 sticky left-0 bg-slate-900 z-10">
                      TOTAL POR AÑO ({saldosMatrix.length} efect.)
                    </td>
                    {effectiveDelegacionFilter === 'todas' && <td className="py-3 px-3" />}
                    <td className="py-3 px-3" />
                    <td className="py-3 px-3" />
                    <td className="py-3 px-3" />
                    {totalesPorAnio.map((t) => (
                      <td key={t.anio} className="py-2.5 px-2.5 text-center tabular-nums">
                        <div className="text-emerald-300 font-extrabold">{t.disponibles} disp.</div>
                        <div className="text-[10px] text-slate-300 font-normal">
                          de {t.correspondientes} (Us: {t.usados})
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-3 text-center text-emerald-300 font-extrabold text-sm tabular-nums">
                      {granTotalAnios.disponibles} d.
                    </td>
                    <td className="py-3 px-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FERIADOS Y DÍAS NO LABORABLES */}
      {activeTab === 'feriados' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Actualización desde Sitio / URL */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Globe className="w-4 h-4 text-blue-700" />
                <span>Actualización Automática desde Sitio Web / URL</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Especifique una URL pública oficial (JSON o página HTML) para extraer feriados nacionales o provinciales automáticamente.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setImportUrl(`https://api.argentinadatos.com/v1/feriados/${currentYear}`)}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-semibold cursor-pointer"
                >
                  ArgentinaDatos {currentYear}
                </button>
                <button
                  type="button"
                  onClick={() => setImportUrl(`https://api.argentinadatos.com/v1/feriados/${currentYear + 1}`)}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-semibold cursor-pointer"
                >
                  ArgentinaDatos {currentYear + 1}
                </button>
                <button
                  type="button"
                  onClick={() => setImportUrl(`https://www.argentina.gob.ar/interior/feriados-nacionales-${currentYear}`)}
                  className="px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold cursor-pointer"
                >
                  Argentina.gob.ar {currentYear}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300"
                />
                <button
                  type="button"
                  disabled={isImportingFeriados}
                  onClick={handleImportUrl}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isImportingFeriados ? 'animate-spin' : ''}`} />
                  <span>Obtener</span>
                </button>
              </div>
            </div>

            {/* Actualización desde Imagen */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>Actualización Automática desde Imagen / Captura</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Suba una imagen o captura de pantalla del calendario oficial de feriados para detectar y cargar las fechas automáticamente.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Año del calendario</label>
                  <input
                    type="number"
                    min={2020}
                    max={2040}
                    value={importImageAnio}
                    onChange={(e) => setImportImageAnio(Number(e.target.value) || currentYear)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="pt-4">
                  <label className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg inline-flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <span>{isImportingFeriados ? 'Analizando imagen...' : 'Seleccionar Imagen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isImportingFeriados}
                      onChange={handleImportImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {importFeedback && (
            <div
              className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                importFeedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {importFeedback.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                )}
                <span>{importFeedback.text}</span>
              </div>
              <button type="button" onClick={() => setImportFeedback(null)} className="p-1 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Vista previa de candidatos detectados antes de guardar */}
          {importCandidates.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-300 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-blue-950">
                  Feriados Detectados ({importCandidates.filter((c) => c.selected).length} seleccionados)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportCandidates([])}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImportCandidates}
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Importar Seleccionados
                  </button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto bg-white border border-blue-200 rounded-lg divide-y divide-slate-100">
                {importCandidates.map((cand, idx) => (
                  <label key={`${cand.fecha}-${idx}`} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cand.selected}
                      onChange={(e) =>
                        setImportCandidates((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, selected: e.target.checked } : item))
                        )
                      }
                      className="w-4 h-4 rounded text-blue-700"
                    />
                    <span className="font-mono font-bold text-slate-800 w-24">{formatFechaDisplay(cand.fecha)}</span>
                    <span className="flex-1 font-semibold text-slate-900">{cand.nombre}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {cand.tipo}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Alta manual de feriado / día no laborable */}
          <form
            onSubmit={handleAddManualFeriado}
            className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={newFeriadoFecha}
                onChange={(e) => setNewFeriadoFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nombre / Motivo del Feriado *</label>
              <input
                type="text"
                required
                value={newFeriadoNombre}
                onChange={(e) => setNewFeriadoNombre(e.target.value)}
                placeholder="Ej. Día de la Soberanía Nacional / Asueto Provincial"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo</label>
              <select
                value={newFeriadoTipo}
                onChange={(e) => setNewFeriadoTipo(e.target.value as TipoFeriado)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Nacional">Nacional</option>
                <option value="Provincial">Provincial</option>
                <option value="No Laborable">No Laborable</option>
                <option value="Asueto">Asueto</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Feriado</span>
            </button>
          </form>

          {/* Filtros Plegables y Tabla de Feriados */}
          <CollapsibleFilterBar
            title="Filtros de Búsqueda de Feriados"
            activeFiltersCount={(feriadoSearch.trim() ? 1 : 0) + (feriadoTipoFilter !== 'todos' ? 1 : 0) + (feriadoYearFilter !== String(currentYear) ? 1 : 0)}
            onClear={() => {
              setFeriadoSearch('');
              setFeriadoTipoFilter('todos');
              setFeriadoYearFilter('todos');
            }}
            summaryRight={
              <span>
                Mostrando <strong>{filteredFeriados.length}</strong> de {feriados.length} feriados
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={feriadoSearch}
                  onChange={(e) => setFeriadoSearch(e.target.value)}
                  placeholder="Filtrar feriado por nombre o fecha..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <select
                value={feriadoTipoFilter}
                onChange={(e) => setFeriadoTipoFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="Nacional">Nacional</option>
                <option value="Provincial">Provincial</option>
                <option value="No Laborable">No Laborable</option>
                <option value="Asueto">Asueto</option>
              </select>

              <select
                value={feriadoYearFilter}
                onChange={(e) => setFeriadoYearFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="todos">Todos los años</option>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                  <option key={y} value={String(y)}>
                    Año {y}
                  </option>
                ))}
              </select>
            </div>
          </CollapsibleFilterBar>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Denominación</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Origen</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeriados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No hay feriados registrados para el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredFeriados.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-mono font-bold text-slate-900">
                          {formatFechaDisplay(f.fecha)}
                        </td>
                        <td className="py-2 px-4 font-semibold text-slate-800">{f.nombre}</td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                            {f.tipo}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-500">{f.origen || 'Sistema'}</td>
                        <td className="py-2 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteFeriadoConfirm(f)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Eliminar feriado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTES Y GRÁFICOS */}
      {activeTab === 'reportes' && (
        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                    Centro Estadístico de Licencias — {activeDelegacionLabel}
                  </h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    Balance anual Art. 7, salidas mensuales, distribución por tipo e interrupciones Art. 15.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportPdfReporte}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-blue-950 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Reporte General (PDF)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="px-4 py-3.5 bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Licencias Registradas
                </div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {scopedLicencias.length}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Filtradas en reporte: {filteredLicencias.length}
                </div>
              </div>
              <div className="px-4 py-3.5 bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Días Otorgados
                </div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-blue-900">
                  {diasOtorgadosTotales}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">Incluye traslado Art. 11</div>
              </div>
              <div className="px-4 py-3.5 bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Interrumpidas (Art. 15)
                </div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-700">
                  {kpis.interrumpidas}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">Por razones de servicio</div>
              </div>
              <div className="px-4 py-3.5 bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Saldo Global Disponible
                </div>
                <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                  {granTotalAnios.disponibles} d.
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Usados: {granTotalAnios.usados} · Venc.: {granTotalAnios.vencidos}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Totales por Año ({currentYear - 2}–{currentYear})
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {chartDataPorAnio.length} períodos
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPorAnio} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="anio" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Disponibles" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usados" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Días Disponibles vs Usados por Efectivo
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  Top {chartDataPersonal.length}
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPersonal} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#475569' }} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Disponibles" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usados" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 lg:col-span-2">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Evolución Mensual de Salidas de Licencia
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {diasOtorgadosTotales} días totales
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataMensualSalidas} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="licMesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748b' }} />
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
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="Salidas"
                      name="Licencias otorgadas"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      fill="url(#licMesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-3">
                Distribución por Tipo de Licencia
              </h3>
              <div className="h-56 flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-1/2 h-44 sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataTipos.length ? chartDataTipos : [{ name: 'Sin datos', value: 1 }]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {(chartDataTipos.length ? chartDataTipos : [{ name: 'Sin datos', value: 1 }]).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {chartDataTipos.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between gap-2 text-xs py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-3">
                Interrupciones de Licencia (Art. 15)
              </h3>
              <div className="h-56 flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-1/2 h-44 sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopedLicencias.length ? chartDataInterrupciones : [{ name: 'Sin datos', value: 1 }]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        <Cell fill="#1e3a8a" />
                        <Cell fill="#dc2626" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2">
                  {chartDataInterrupciones.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between gap-2 text-xs py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: idx === 0 ? '#1e3a8a' : '#dc2626' }}
                        />
                        <span className="truncate text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alta / Edición de Licencia (con selector/bloqueo de Delegación y sin interrupción en carga) */}
      {isModalOpen && (
        <LicenciaModal
          licencia={editingLicencia}
          preselectedPersonalId={preselectedPersonalId}
          personalList={allowedPersonal}
          saldosLicencias={allowedSaldos}
          licenciasExistentes={allowedLicencias}
          feriados={feriados}
          tiposLicencia={tiposLicencia}
          aniosDisponibles={aniosDisponibles}
          delegacionesPermitidas={delegacionesPermitidas}
          defaultDelegacionId={defaultModalDelegacionId}
          puedeCambiarDelegacion={puedeVerMultiplesDelegaciones}
          config={config}
          currentUsername={currentUser?.username}
          onSave={async (lic) => {
            await onSaveLicencia(lic);
            setIsModalOpen(false);
            setEditingLicencia(null);
          }}
          onAddTipoLicencia={handleAddTipoLicencia}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLicencia(null);
          }}
        />
      )}

      {/* Modal dedicado para Interrumpir Licencia desde la Tabla (Art. 15) */}
      {interruptingLicencia && (
        <InterrumpirLicenciaModal
          licencia={interruptingLicencia}
          feriados={feriados}
          onSave={async (updated) => {
            await onSaveLicencia(updated);
            setInterruptingLicencia(null);
          }}
          onClose={() => setInterruptingLicencia(null)}
        />
      )}

      {/* Modal de Gestión de Tipos de Licencia */}
      {isTiposModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-blue-300" />
                <h3 className="font-bold text-sm">Catálogo de Tipos de Licencia Policial</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTiposModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                {tiposLicencia.map((t) => (
                  <div key={t.id} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{t.nombre}</span>
                      <span className="ml-2 text-[10px] text-slate-500">
                        {t.descuentaSaldoAnual ? 'Imputa saldo Art. 7 (establecer días)' : 'No resta de Anual'}
                        {t.modoComputo === 'corridos' ? ' • Días corridos' : ' • Días hábiles'}
                        {t.diasSugeridos ? ` • Fijo/Sugerido: ${t.diasSugeridos} d.` : ''}
                      </span>
                    </div>
                    {t.esDefault ? (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Predeterminado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteTipoLicencia(t.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Eliminar tipo personalizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const nombre = nuevoTipoNombre.trim();
                  if (!nombre) return;
                  await handleAddTipoLicencia({
                    id: 'lic-tipo-' + Date.now(),
                    nombre,
                    esDefault: false,
                    descuentaSaldoAnual: nuevoTipoDescuentaSaldo,
                    diasSugeridos: nuevoTipoDiasSugeridos > 0 ? nuevoTipoDiasSugeridos : undefined,
                    activo: true,
                  });
                  setNuevoTipoNombre('');
                  setNuevoTipoDiasSugeridos(0);
                  setNuevoTipoDescuentaSaldo(false);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3"
              >
                <div className="font-bold text-slate-900">Agregar Nuevo Tipo de Licencia</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={nuevoTipoNombre}
                      onChange={(e) => setNuevoTipoNombre(e.target.value)}
                      placeholder="Ej. Matrimonio, Duelo, Estudio, Médica..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Días sugeridos</label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={nuevoTipoDiasSugeridos}
                      onChange={(e) => setNuevoTipoDiasSugeridos(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevoTipoDescuentaSaldo}
                      onChange={(e) => setNuevoTipoDescuentaSaldo(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-700"
                    />
                    <span>Imputa saldo anual (Art. 7)</span>
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Tipo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste Manual de Saldo Anual */}
      {editingSaldoCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-300 shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Ajustar Saldo Período {editingSaldoCell.anio}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingSaldoCell.personal.jerarquia} {editingSaldoCell.personal.apellidoYNombre} (DNI{' '}
                  {editingSaldoCell.personal.dni})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSaldoCell(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Días Correspondientes (Art. 7)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={editingSaldoCell.diasCorrespondientes}
                  onChange={(e) =>
                    setEditingSaldoCell({
                      ...editingSaldoCell,
                      diasCorrespondientes: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Días Usados Históricos</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={editingSaldoCell.diasUsados}
                  onChange={(e) =>
                    setEditingSaldoCell({
                      ...editingSaldoCell,
                      diasUsados: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 font-bold text-red-800 cursor-pointer">
              <input
                type="checkbox"
                checked={editingSaldoCell.vencido}
                onChange={(e) =>
                  setEditingSaldoCell({ ...editingSaldoCell, vencido: e.target.checked })
                }
                className="w-4 h-4 rounded text-red-600"
              />
              <span>Marcar Período {editingSaldoCell.anio} como VENCIDO</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingSaldoCell(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const now = new Date().toISOString();
                  await onSaveSaldoLicencia({
                    id: `${editingSaldoCell.personal.id}_${editingSaldoCell.anio}`,
                    personalId: editingSaldoCell.personal.id,
                    anio: editingSaldoCell.anio,
                    diasCorrespondientes: editingSaldoCell.diasCorrespondientes,
                    diasUsados: editingSaldoCell.diasUsados,
                    vencido: editingSaldoCell.vencido,
                    fechaVencimiento: editingSaldoCell.vencido ? todayYmd : undefined,
                    motivoVencimiento: editingSaldoCell.vencido ? 'Marcado como vencido' : undefined,
                    delegacionId: editingSaldoCell.personal.delegacionId || defaultModalDelegacionId,
                    createdAt: now,
                    updatedAt: now,
                  });
                  setEditingSaldoCell(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold cursor-pointer"
              >
                Guardar Saldo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de Licencia */}
      <ConfirmModal
        isOpen={Boolean(deleteLicConfirm)}
        title="Eliminar Registro de Licencia"
        message={`¿Confirma eliminar la licencia ${deleteLicConfirm?.tipoLicencia || ''} de ${deleteLicConfirm?.jerarquia || ''} ${deleteLicConfirm?.apellidoYNombre || ''} (${formatFechaDisplay(deleteLicConfirm?.fechaSalida)})?`}
        confirmLabel="Eliminar Licencia"
        isDestructive={true}
        onConfirm={() => {
          if (deleteLicConfirm) {
            onDeleteLicencia(deleteLicConfirm.id);
          }
        }}
        onClose={() => setDeleteLicConfirm(null)}
      />

      {/* Confirmación de eliminación de Feriado */}
      <ConfirmModal
        isOpen={Boolean(deleteFeriadoConfirm)}
        title="Eliminar Feriado / Día No Laborable"
        message={`¿Confirma eliminar "${deleteFeriadoConfirm?.nombre || ''}" (${formatFechaDisplay(deleteFeriadoConfirm?.fecha)})?`}
        confirmLabel="Eliminar Feriado"
        isDestructive={true}
        onConfirm={() => {
          if (deleteFeriadoConfirm) {
            onDeleteFeriado(deleteFeriadoConfirm.id);
          }
        }}
        onClose={() => setDeleteFeriadoConfirm(null)}
      />
    </div>
  );
};

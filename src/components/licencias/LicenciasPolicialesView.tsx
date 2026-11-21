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
  Building2,
  Lock,
  Users,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  DEFAULT_TIPOS_LICENCIA,
  ESCALA_ART_7,
  formatFechaDisplay,
  getDiasEscalaArt7,
  getLicenciaActivaPersonal,
  parseYmdLocal,
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
import { LicenciaModal } from './LicenciaModal';

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
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'vigente' | 'programada' | 'finalizada' | 'interrumpida'>('todos');

  // Control estricto de acceso por Delegación
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

  const defaultUserDelegacionId = currentUser?.delegacionId || activeDelegacionId || 'del-laguna-blanca';
  const [scopeDelegacion, setScopeDelegacion] = useState<string>(
    puedeVerMultiplesDelegaciones ? 'TODAS' : defaultUserDelegacionId
  );

  useEffect(() => {
    if (!puedeVerMultiplesDelegaciones) {
      setScopeDelegacion(defaultUserDelegacionId);
    }
  }, [puedeVerMultiplesDelegaciones, defaultUserDelegacionId]);

  const effectiveScopeDelegacion = puedeVerMultiplesDelegaciones
    ? scopeDelegacion
    : defaultUserDelegacionId;

  const delegacionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of delegacionesList) {
      map.set(d.id, d.ciudad ? `${d.siglas} (${d.ciudad})` : d.nombre);
    }
    return map;
  }, [delegacionesList]);

  const allowedDelegacionIds = useMemo(
    () => new Set(delegacionesPermitidas.map((d) => d.id)),
    [delegacionesPermitidas]
  );

  // Datos autorizados (nunca expone personal/licencias de delegaciones no autorizadas)
  const personalMapAll = useMemo(() => {
    const m = new Map<string, Personal>();
    personalList.forEach((p) => m.set(p.id, p));
    return m;
  }, [personalList]);

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

  // Datos filtrados al ámbito seleccionado ('TODAS' o una delegación puntual)
  const scopedPersonal = useMemo(() => {
    if (effectiveScopeDelegacion === 'TODAS') return allowedPersonal;
    return allowedPersonal.filter(
      (p) => (p.delegacionId || 'del-laguna-blanca') === effectiveScopeDelegacion
    );
  }, [allowedPersonal, effectiveScopeDelegacion]);

  const scopedLicencias = useMemo(() => {
    if (effectiveScopeDelegacion === 'TODAS') return allowedLicencias;
    return allowedLicencias.filter((l) => {
      const owner = personalMapAll.get(l.personalId);
      const delId = l.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return delId === effectiveScopeDelegacion;
    });
  }, [allowedLicencias, personalMapAll, effectiveScopeDelegacion]);

  const scopedSaldos = useMemo(() => {
    if (effectiveScopeDelegacion === 'TODAS') return allowedSaldos;
    return allowedSaldos.filter((s) => {
      const owner = personalMapAll.get(s.personalId);
      const delId = s.delegacionId || owner?.delegacionId || 'del-laguna-blanca';
      return delId === effectiveScopeDelegacion;
    });
  }, [allowedSaldos, personalMapAll, effectiveScopeDelegacion]);

  // Modal Licencia
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicencia, setEditingLicencia] = useState<LicenciaPolicial | null>(null);
  const [preselectedPersonalId, setPreselectedPersonalId] = useState<string | undefined>(undefined);
  const [deleteLicConfirm, setDeleteLicConfirm] = useState<LicenciaPolicial | null>(null);

  // Saldos / Años activos
  const currentYear = new Date().getFullYear();
  const [extraAnios, setExtraAnios] = useState<number[]>([]);
  const [newAnioInput, setNewAnioInput] = useState<string>(String(currentYear + 1));
  const [mostrarTodosDesdeIngreso, setMostrarTodosDesdeIngreso] = useState<boolean>(true);
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
    const custom = config.tiposLicenciaCatalogo || [];
    if (custom.length > 0) return custom;
    return DEFAULT_TIPOS_LICENCIA;
  }, [config.tiposLicenciaCatalogo]);

  // Años históricos completos desde la fecha de ingreso más antigua en el ámbito hasta el año actual
  const aniosHistoricosCompletos = useMemo(() => {
    let minIngYear = currentYear - 4;
    for (const p of scopedPersonal) {
      const dt = parseYmdLocal(p.fechaIngreso);
      if (dt) {
        const y = dt.getFullYear();
        if (y >= 1980 && y <= currentYear && y < minIngYear) {
          minIngYear = y;
        }
      }
    }
    const set = new Set<number>();
    for (let y = minIngYear; y <= currentYear; y++) {
      set.add(y);
    }
    extraAnios.forEach((y) => set.add(y));
    scopedSaldos.forEach((s) => {
      if (s.anio) set.add(s.anio);
    });
    scopedLicencias.forEach((l) => {
      l.imputacionAnios?.forEach((i) => set.add(i.anio));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [scopedPersonal, currentYear, extraAnios, scopedSaldos, scopedLicencias]);

  const aniosDisponibles = useMemo(() => {
    if (mostrarTodosDesdeIngreso) return aniosHistoricosCompletos;
    const minRecent = currentYear - 4;
    return aniosHistoricosCompletos.filter((y) => y >= minRecent);
  }, [aniosHistoricosCompletos, mostrarTodosDesdeIngreso, currentYear]);

  const todayYmd = new Date().toISOString().slice(0, 10);

  const getEstadoLicencia = (lic: LicenciaPolicial): 'Interrumpida' | 'En Curso' | 'Programada' | 'Finalizada' => {
    if (lic.fueInterrumpida) return 'Interrumpida';
    if (todayYmd >= lic.fechaSalida && todayYmd <= lic.fechaFinLicencia) return 'En Curso';
    if (todayYmd < lic.fechaSalida) return 'Programada';
    return 'Finalizada';
  };

  // KPIs estrictos solicitados: Personal Activo, Personal en Licencia, Interrumpidas
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
        const matchSearch =
          !q ||
          l.apellidoYNombre.toLowerCase().includes(q) ||
          l.dni.includes(q) ||
          l.jerarquia.toLowerCase().includes(q) ||
          (l.disposicionNro || '').toLowerCase().includes(q);
        const matchTipo = filtroTipo === 'todos' || l.tipoLicencia === filtroTipo;
        const est = getEstadoLicencia(l);
        const matchEstado =
          filtroEstado === 'todos' ||
          (filtroEstado === 'vigente' && est === 'En Curso') ||
          (filtroEstado === 'programada' && est === 'Programada') ||
          (filtroEstado === 'finalizada' && est === 'Finalizada') ||
          (filtroEstado === 'interrumpida' && est === 'Interrumpida');
        return matchSearch && matchTipo && matchEstado;
      })
      .sort((a, b) => b.fechaSalida.localeCompare(a.fechaSalida));
  }, [scopedLicencias, searchTerm, filtroTipo, filtroEstado, todayYmd]);

  // Matriz de saldos por personal (campos heredados estrictos: Jerarquía, Apellido y Nombre, DNI, Fecha de Ingreso)
  const saldosMatrix = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedPersonal
      .filter(
        (p) =>
          !q ||
          p.apellidoYNombre.toLowerCase().includes(q) ||
          p.dni.includes(q) ||
          p.jerarquia.toLowerCase().includes(q)
      )
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
          delegacionNombre: delegacionNameMap.get(p.delegacionId || 'del-laguna-blanca') || 'Sin Delegación',
          antiguedadAnios,
          escalaArt7,
          balances,
          totalCorrespondientes,
          totalDisponibles,
          totalUsados,
          aniosVencidos,
        };
      });
  }, [scopedPersonal, searchTerm, scopedSaldos, scopedLicencias, aniosDisponibles, delegacionNameMap]);

  // Totales acumulados POR AÑO (para el ámbito actual)
  const totalesPorAnio = useMemo(() => {
    return aniosDisponibles.map((anio) => {
      let efectivosEnAnio = 0;
      let correspondientes = 0;
      let usados = 0;
      let vencidos = 0;
      let disponibles = 0;

      for (const row of saldosMatrix) {
        const b = row.balances.find((item) => item.anio === anio);
        if (!b || !b.enServicio) continue;
        efectivosEnAnio++;
        correspondientes += b.diasCorrespondientes;
        usados += b.diasUsados;
        if (b.vencido) {
          vencidos += Math.max(0, b.diasCorrespondientes - b.diasUsados);
        } else {
          disponibles += b.diasDisponibles;
        }
      }

      return {
        anio,
        efectivosEnAnio,
        correspondientes,
        usados,
        vencidos,
        disponibles,
      };
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

  // Resumen por Delegación y Total General (para usuarios habilitados a ver múltiples delegaciones)
  const resumenPorDelegacion = useMemo(() => {
    if (!puedeVerMultiplesDelegaciones) return [];

    return delegacionesPermitidas.map((del) => {
      const delPersonal = allowedPersonal.filter(
        (p) => (p.delegacionId || 'del-laguna-blanca') === del.id
      );
      const delLicencias = allowedLicencias.filter((l) => {
        const owner = personalMapAll.get(l.personalId);
        return (l.delegacionId || owner?.delegacionId || 'del-laguna-blanca') === del.id;
      });
      const delSaldos = allowedSaldos.filter((s) => {
        const owner = personalMapAll.get(s.personalId);
        return (s.delegacionId || owner?.delegacionId || 'del-laguna-blanca') === del.id;
      });

      let activos = 0;
      let enLicencia = 0;
      let correspondientes = 0;
      let usados = 0;
      let vencidos = 0;
      let disponibles = 0;

      for (const p of delPersonal) {
        if (p.estado !== 'Pasiva' && p.estado !== 'Retirado') {
          if (getLicenciaActivaPersonal(p.id, todayYmd, delLicencias, delPersonal)?.enLicencia) {
            enLicencia++;
          } else {
            activos++;
          }
        }
        const bals = calcularBalancePorAnio(p, delSaldos, delLicencias, aniosDisponibles);
        for (const b of bals) {
          if (!b.enServicio) continue;
          correspondientes += b.diasCorrespondientes;
          usados += b.diasUsados;
          if (b.vencido) {
            vencidos += Math.max(0, b.diasCorrespondientes - b.diasUsados);
          } else {
            disponibles += b.diasDisponibles;
          }
        }
      }

      return {
        delegacionId: del.id,
        nombre: del.ciudad ? `${del.siglas} — ${del.ciudad}` : del.nombre,
        dotacion: delPersonal.length,
        activos,
        enLicencia,
        correspondientes,
        usados,
        vencidos,
        disponibles,
      };
    });
  }, [
    puedeVerMultiplesDelegaciones,
    delegacionesPermitidas,
    allowedPersonal,
    allowedLicencias,
    allowedSaldos,
    personalMapAll,
    aniosDisponibles,
    todayYmd,
  ]);

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

  const filteredFeriados = useMemo(() => {
    const q = feriadoSearch.trim().toLowerCase();
    return [...feriados]
      .filter((f) => {
        const matchYear = feriadoYearFilter === 'todos' || f.fecha.startsWith(feriadoYearFilter);
        const matchSearch =
          !q || f.nombre.toLowerCase().includes(q) || f.tipo.toLowerCase().includes(q) || f.fecha.includes(q);
        return matchYear && matchSearch;
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [feriados, feriadoYearFilter, feriadoSearch]);

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
          delegacionId: personal.delegacionId || config.delegacionId,
          createdAt: now,
          updatedAt: now,
        };
    await onSaveSaldoLicencia(record);
  };

  const handleAddTipoLicencia = async (nuevoTipo: TipoLicenciaConfig) => {
    const updatedCatalog = [...tiposLicencia, nuevoTipo];
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

  const scopeLabel =
    effectiveScopeDelegacion === 'TODAS'
      ? 'General (Todas las Delegaciones)'
      : delegacionNameMap.get(effectiveScopeDelegacion) || effectiveScopeDelegacion;

  return (
    <div className="space-y-5">
      {/* Header Principal */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Régimen de Licencias Policiales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cómputo automático en días hábiles administrativos, Escala progresiva Art. 7, Traslado Art. 11, Imputación Multi-Año e Interrupción Art. 15.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              setPreselectedPersonalId(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Licencia</span>
          </button>
        </div>
      </div>

      {/* Selector de Ámbito: Por Delegación y En General (o bloqueado a la Delegación del usuario) */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-900" />
          <span className="font-bold text-slate-800">Alcance de Consulta:</span>
          {!puedeVerMultiplesDelegaciones && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 font-bold">
              <Lock className="w-3 h-3 text-slate-600" />
              <span>{scopeLabel} (Delegación Asignada)</span>
            </span>
          )}
        </div>

        {puedeVerMultiplesDelegaciones && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setScopeDelegacion('TODAS')}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                effectiveScopeDelegacion === 'TODAS'
                  ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              General (Todas)
            </button>
            {delegacionesPermitidas.map((del) => (
              <button
                key={del.id}
                type="button"
                onClick={() => setScopeDelegacion(del.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  effectiveScopeDelegacion === del.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {del.ciudad ? `${del.siglas} (${del.ciudad})` : del.nombre}
              </button>
            ))}
          </div>
        )}
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
          { id: 'saldos', label: 'Días Disponibles por Personal y Totales por Año (Art. 7)', icon: Layers },
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
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Jerarquía, Apellido, Nombre o DNI..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
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
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3 px-3">Jerarquía / Apellido y Nombre</th>
                  {effectiveScopeDelegacion === 'TODAS' && <th className="py-3 px-3">Delegación</th>}
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
                    <td colSpan={effectiveScopeDelegacion === 'TODAS' ? 10 : 9} className="py-10 text-center text-slate-500">
                      No hay licencias registradas para {scopeLabel} con los filtros aplicados.
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
                        {effectiveScopeDelegacion === 'TODAS' && (
                          <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-700">{delName}</td>
                        )}
                        <td className="py-2.5 px-3 font-mono">
                          <div>{lic.dni}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Antig.: {lic.antiguedadAnios} {lic.antiguedadAnios === 1 ? 'año' : 'años'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{lic.tipoLicencia}</td>
                        <td className="py-2.5 px-3 font-mono">{formatFechaDisplay(lic.fechaSalida)}</td>
                        <td className="py-2.5 px-3 tabular-nums">
                          <span className="font-bold text-slate-900">{lic.diasHabilesSolicitados} d.</span>
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
                            <span className="text-slate-400">---</span>
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
                          {lic.fueInterrumpida && lic.motivoInterrupcion && (
                            <div className="text-[10px] text-red-700 max-w-[160px] truncate mt-0.5" title={lic.motivoInterrupcion}>
                              {lic.motivoInterrupcion}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
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

      {/* TAB 2: DÍAS DISPONIBLES POR PERSONAL, POR DELEGACIÓN Y TOTAL POR AÑO (ART. 7) */}
      {activeTab === 'saldos' && (
        <div className="space-y-4">
          {/* Referencia oficial Escala Art. 7 + controles de años */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wide text-blue-200">
                Escala Progresiva por Antigüedad de Servicio en cada Año (Art. 7)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Cada período anual calcula automáticamente los días según los años de servicio cumplidos en ese año (ej.: ingreso 01/01/2016 → 2016–2021: 14 días; 2022–2026: 21 días).
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                {ESCALA_ART_7.map((e) => (
                  <span key={e.rango} className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                    <strong className="text-blue-200">{e.rango}:</strong> {e.dias} días hábiles
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMostrarTodosDesdeIngreso((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                  mostrarTodosDesdeIngreso
                    ? 'bg-emerald-700 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {mostrarTodosDesdeIngreso ? 'Viendo: Todos desde ingreso' : 'Ver todos desde ingreso'}
              </button>
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

          {/* Consolidado por Delegación (solo visible si el usuario tiene acceso multi-delegación) */}
          {puedeVerMultiplesDelegaciones && resumenPorDelegacion.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-900" />
                  <span>Licencias Disponibles por Delegación y Total General ({aniosDisponibles[0]}–{aniosDisponibles[aniosDisponibles.length - 1]})</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Vista actual: {scopeLabel}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Delegación</th>
                      <th className="py-2.5 px-3 text-center">Dotación</th>
                      <th className="py-2.5 px-3 text-center">Activos</th>
                      <th className="py-2.5 px-3 text-center">En Licencia</th>
                      <th className="py-2.5 px-3 text-center">Días Corresp.</th>
                      <th className="py-2.5 px-3 text-center">Días Usados</th>
                      <th className="py-2.5 px-3 text-center">Días Vencidos</th>
                      <th className="py-2.5 px-3 text-center">Días Disponibles</th>
                      <th className="py-2.5 px-3 text-right">Filtro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resumenPorDelegacion.map((d) => (
                      <tr
                        key={d.delegacionId}
                        className={effectiveScopeDelegacion === d.delegacionId ? 'bg-blue-50/70' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2 px-3 font-bold text-slate-900">{d.nombre}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{d.dotacion}</td>
                        <td className="py-2 px-3 text-center tabular-nums font-semibold text-emerald-800">{d.activos}</td>
                        <td className="py-2 px-3 text-center tabular-nums font-semibold text-blue-800">{d.enLicencia}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{d.correspondientes} d.</td>
                        <td className="py-2 px-3 text-center tabular-nums">{d.usados} d.</td>
                        <td className="py-2 px-3 text-center tabular-nums text-red-700">{d.vencidos} d.</td>
                        <td className="py-2 px-3 text-center tabular-nums font-extrabold text-emerald-900">
                          {d.disponibles} d.
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setScopeDelegacion(
                                effectiveScopeDelegacion === d.delegacionId ? 'TODAS' : d.delegacionId
                              )
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {effectiveScopeDelegacion === d.delegacionId ? 'Ver General' : 'Filtrar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold">
                    <tr>
                      <td className="py-2.5 px-3">TOTAL GENERAL</td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {resumenPorDelegacion.reduce((a, b) => a + b.dotacion, 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {resumenPorDelegacion.reduce((a, b) => a + b.activos, 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {resumenPorDelegacion.reduce((a, b) => a + b.enLicencia, 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {resumenPorDelegacion.reduce((a, b) => a + b.correspondientes, 0)} d.
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {resumenPorDelegacion.reduce((a, b) => a + b.usados, 0)} d.
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-red-300">
                        {resumenPorDelegacion.reduce((a, b) => a + b.vencidos, 0)} d.
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-emerald-300">
                        {resumenPorDelegacion.reduce((a, b) => a + b.disponibles, 0)} d.
                      </td>
                      <td className="py-2.5 px-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tabla Resumen de Totales POR AÑO */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Total por Año — {scopeLabel}
              </h3>
              <span className="text-[11px] font-bold text-emerald-800">
                Acumulado Disponible: {granTotalAnios.disponibles} días hábiles
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Año / Período</th>
                    <th className="py-2 px-3 text-center">Efectivos en Servicio</th>
                    <th className="py-2 px-3 text-center">Total Días Correspondientes</th>
                    <th className="py-2 px-3 text-center">Total Días Usados</th>
                    <th className="py-2 px-3 text-center">Total Días Vencidos</th>
                    <th className="py-2 px-3 text-center">Total Días Disponibles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {totalesPorAnio.map((t) => (
                    <tr key={t.anio} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-extrabold text-slate-900 font-mono">Período {t.anio}</td>
                      <td className="py-2 px-3 text-center tabular-nums">{t.efectivosEnAnio}</td>
                      <td className="py-2 px-3 text-center tabular-nums font-semibold text-slate-800">
                        {t.correspondientes} d.
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-blue-900 font-semibold">
                        {t.usados} d.
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-red-700 font-semibold">
                        {t.vencidos} d.
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums font-extrabold text-emerald-800">
                        {t.disponibles} d.
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <tr>
                    <td className="py-2.5 px-3">TOTAL ACUMULADO ({totalesPorAnio.length} años)</td>
                    <td className="py-2.5 px-3 text-center">—</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">{granTotalAnios.correspondientes} d.</td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-blue-200">{granTotalAnios.usados} d.</td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-red-300">{granTotalAnios.vencidos} d.</td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-emerald-300">{granTotalAnios.disponibles} d.</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar efectivo por Jerarquía, Apellido y Nombre o DNI..."
              className="flex-1 focus:outline-none"
            />
          </div>

          {/* Matriz detallada por Personal y Año */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3 px-3 sticky left-0 bg-slate-900 z-10 min-w-[180px]">
                    Jerarquía / Apellido y Nombre
                  </th>
                  {effectiveScopeDelegacion === 'TODAS' && <th className="py-3 px-3">Delegación</th>}
                  <th className="py-3 px-3">DNI</th>
                  <th className="py-3 px-3">Fecha Ingreso / Antigüedad</th>
                  <th className="py-3 px-3 text-center">Escala Actual</th>
                  {aniosDisponibles.map((anio) => (
                    <th key={anio} className="py-3 px-3 text-center min-w-[136px]">
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
                      colSpan={aniosDisponibles.length + (effectiveScopeDelegacion === 'TODAS' ? 7 : 6)}
                      className="py-8 text-center text-slate-500"
                    >
                      No hay personal registrado en el ámbito seleccionado.
                    </td>
                  </tr>
                ) : (
                  saldosMatrix.map((row) => (
                    <tr key={row.personal.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <div className="text-[10px] font-bold text-blue-900 uppercase">{row.personal.jerarquia}</div>
                        <div className="font-bold text-slate-900">{row.personal.apellidoYNombre}</div>
                      </td>
                      {effectiveScopeDelegacion === 'TODAS' && (
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
                    {effectiveScopeDelegacion === 'TODAS' && <td className="py-3 px-3" />}
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

          {/* Filtros y Tabla de Feriados */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={feriadoSearch}
                  onChange={(e) => setFeriadoSearch(e.target.value)}
                  placeholder="Filtrar feriado..."
                  className="focus:outline-none"
                />
              </div>
              <select
                value={feriadoYearFilter}
                onChange={(e) => setFeriadoYearFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="todos">Todos los años</option>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                  <option key={y} value={String(y)}>
                    Año {y}
                  </option>
                ))}
              </select>
            </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de Totales por Año */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Totales Acumulados por Año — {scopeLabel}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPorAnio} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Disponibles" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usados" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Días Disponibles vs Usados vs Vencidos por Efectivo
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPersonal} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Disponibles" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usados" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vencidos" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Por Tipo de Licencia</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataTipos.length ? chartDataTipos : [{ name: 'Sin datos', value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={68}
                      label
                    >
                      {(chartDataTipos.length ? chartDataTipos : [{ name: 'Sin datos', value: 1 }]).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Interrupciones (Art. 15)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scopedLicencias.length ? chartDataInterrupciones : [{ name: 'Sin datos', value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={68}
                      label
                    >
                      <Cell fill="#1e3a8a" />
                      <Cell fill="#dc2626" />
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alta / Edición de Licencia */}
      {isModalOpen && (
        <LicenciaModal
          licencia={editingLicencia}
          preselectedPersonalId={preselectedPersonalId}
          personalList={scopedPersonal}
          saldosLicencias={scopedSaldos}
          licenciasExistentes={scopedLicencias}
          feriados={feriados}
          tiposLicencia={tiposLicencia}
          aniosDisponibles={aniosHistoricosCompletos}
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
                    delegacionId: editingSaldoCell.personal.delegacionId || config.delegacionId,
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

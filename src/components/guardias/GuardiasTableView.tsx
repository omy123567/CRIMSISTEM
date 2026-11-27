import React, { useState, useMemo } from 'react';
import {
  ParteNovedadesGuardia,
  Personal,
  MovilPolicial,
  GrupoPersonal,
  ConfiguracionSistema,
  IntervencionParte,
  UsuarioSistema,
  LicenciaPolicial,
} from '../../types/police';
import { getLicenciaActivaPersonal, formatFechaDisplay } from '../../services/licenciaService';
import {
  Search,
  Filter,
  Users,
  Car,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  Plus,
  CheckSquare,
  Square,
  Hash,
  Clock,
  ShieldAlert,
  Stethoscope,
  Sparkles,
  Download,
  AlertTriangle,
} from 'lucide-react';

import { GestionPersonalGuardiaModal } from './GestionPersonalGuardiaModal';
import { GestionMovilesGuardiaModal } from './GestionMovilesGuardiaModal';
import { GestionForenseGuardiaModal } from './GestionForenseGuardiaModal';
import { DetalleIntervencionesTipoModal } from './DetalleIntervencionesTipoModal';
import { GestionCibercrimenGuardiaModal } from './GestionCibercrimenGuardiaModal';
import { ParteVisualPreview } from './ParteVisualPreview';
import { ConfirmModal } from '../common/ConfirmModal';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { Cpu, ArrowLeftRight } from 'lucide-react';
import { generarPdfParteGuardia } from '../../services/pdfService';
import { getResumenLesionADeterminarParte } from '../../utils/lesionesUtils';
import { getCrudPermissions } from '../../utils/permisosUtils';

interface GuardiasTableViewProps {
  partesList: ParteNovedadesGuardia[];
  personalList?: Personal[];
  movilesList?: MovilPolicial[];
  gruposList?: GrupoPersonal[];
  licenciasPoliciales?: LicenciaPolicial[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSelectGuardia: (parte: ParteNovedadesGuardia) => void;
  onEditGuardia: (parte: ParteNovedadesGuardia) => void;
  onDeleteGuardia: (id: string) => void;
  onNewGuardia: () => void;
  onSaveParte?: (parte: ParteNovedadesGuardia) => void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
  onNuevaIntervencionParaGuardia?: (parte: ParteNovedadesGuardia, tipo: 'Criminalística' | 'Accidentológica') => void;
  onEditarIntervencion?: (interv: IntervencionParte) => void;
}

export const GuardiasTableView: React.FC<GuardiasTableViewProps> = ({
  partesList,
  personalList = [],
  movilesList = [],
  gruposList = [],
  licenciasPoliciales = [],
  config,
  currentUser,
  onSelectGuardia,
  onEditGuardia,
  onDeleteGuardia,
  onNewGuardia,
  onSaveParte,
  onSaveConfig,
  onNuevaIntervencionParaGuardia,
  onEditarIntervencion,
}) => {
  const { canCreate, canEdit, canDelete } = getCrudPermissions(currentUser);
  // Buscadores y filtros requeridos: fecha, guardia, personal, contenido
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [filtroTipoLesion, setFiltroTipoLesion] = useState('todas');
  const [soloFallecidos, setSoloFallecidos] = useState(false);

  // Paginación
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados de modales interactivos
  const [personalModalParte, setPersonalModalParte] = useState<ParteNovedadesGuardia | null>(null);
  const [movilesModalParte, setMovilesModalParte] = useState<ParteNovedadesGuardia | null>(null);
  const [forenseModalParte, setForenseModalParte] = useState<ParteNovedadesGuardia | null>(null);
  const [tipoModalData, setTipoModalData] = useState<{ parte: ParteNovedadesGuardia; tipo: 'LC' | 'SegVial' } | null>(null);
  const [cibercrimenModalParte, setCibercrimenModalParte] = useState<ParteNovedadesGuardia | null>(null);
  const [previewParte, setPreviewParte] = useState<ParteNovedadesGuardia | null>(null);
  const [avisoBloqueoModal, setAvisoBloqueoModal] = useState<string | null>(null);
  const [guardiaDeleteConfirm, setGuardiaDeleteConfirm] = useState<{
    isOpen: boolean;
    parte: ParteNovedadesGuardia | null;
  }>({ isOpen: false, parte: null });

  // Orden dinámico de columnas (Requerimiento: "permite cambiar el orden de las columnas")
  const defaultColOrder = ['personal', 'moviles', 'lc', 'forense', 'segVial', 'cibercrimen'];
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sispol_guardias_column_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === defaultColOrder.length) return parsed;
      }
    } catch (e) {}
    return config.ordenColumnasGuardia || defaultColOrder;
  });

  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  const moverColumna = (index: number, direccion: 'izq' | 'der') => {
    const target = direccion === 'izq' ? index - 1 : index + 1;
    if (target < 0 || target >= columnOrder.length) return;
    const copy = [...columnOrder];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setColumnOrder(copy);
    try {
      localStorage.setItem('sispol_guardias_column_order', JSON.stringify(copy));
    } catch (e) {}
    if (onSaveConfig) {
      onSaveConfig({ ...config, ordenColumnasGuardia: copy });
    }
  };

  const reordenarColumnaPorArrastre = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= columnOrder.length || toIdx >= columnOrder.length) return;
    const copy = [...columnOrder];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setColumnOrder(copy);
    try {
      localStorage.setItem('sispol_guardias_column_order', JSON.stringify(copy));
    } catch (e) {}
    if (onSaveConfig) {
      onSaveConfig({ ...config, ordenColumnasGuardia: copy });
    }
  };

  // Verificación de permiso de edición:
  // "En parte de Novedades que todos los usuarios comunes puedan editar las cargas, durante el turno de guardia. 07:00 a 19:00 horas y 19:00 a 07:00 horas."
  // "no debe poder modificarse una vez cargado las intervenciones, salvo caso que se tenga el permiso especifico."
  const verificarPermisoGuardia = (p: ParteNovedadesGuardia): { puede: boolean; motivo?: string } => {
    if (!currentUser) return { puede: true };
    if (currentUser.rol === 'superusuario' || currentUser.puedeModificarActuacionesCargadas) {
      return { puede: true };
    }

    // Comprobar ventana horaria activa de guardia: 07:00 a 19:00 hs o 19:00 a 07:00 hs
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const esTurnoDia = currentHour >= 7 && currentHour < 19;
    const esTurnoNoche = currentHour >= 19 || currentHour < 7;

    const hoyStr = now.toISOString().slice(0, 10);
    const esDeHoy = p.fechaInicio === hoyStr || p.fechaFin === hoyStr;

    if (esDeHoy) {
      const horaInicioNum = parseInt(p.horaInicio?.slice(0, 2) || '7', 10);
      const parteEsDiurno = horaInicioNum >= 7 && horaInicioNum < 19;
      const parteEsNocturno = horaInicioNum >= 19 || horaInicioNum < 7;

      if ((esTurnoDia && parteEsDiurno) || (esTurnoNoche && parteEsNocturno)) {
        // En turno de guardia activo, usuarios comunes pueden editar libremente
        return { puede: true };
      }
    }

    // Fuera del turno o con intervenciones registradas
    if ((p.intervenciones && p.intervenciones.length > 0) || p.cerrado) {
      return {
        puede: false,
        motivo:
          'El parte de guardia se encuentra fuera del turno de guardia activo (07:00 a 19:00 / 19:00 a 07:00 hs) o cuenta con intervenciones ya registradas. Por protocolo pericial y de cadena de custodia, solo usuarios con permiso de "Modificar Actuaciones Cargadas" o Superusuario pueden editarlo.',
      };
    }

    return { puede: true };
  };

  const getColDef = (key: string) => {
    switch (key) {
      case 'personal':
        return {
          id: 'personal',
          label: 'Personal',
          bgTh: '',
          bgTd: '',
          title: 'Personal de guardia (Click para gestionar)',
          render: (p: ParteNovedadesGuardia, counts: any) => (
            <button
              type="button"
              onClick={() => {
                if (!canEdit && !canCreate) {
                  setAvisoBloqueoModal('Su usuario no tiene permisos para modificar guardias cargadas.');
                  return;
                }
                const check = verificarPermisoGuardia(p);
                if (!check.puede) {
                  setAvisoBloqueoModal(check.motivo || '');
                  return;
                }
                setPersonalModalParte(p);
              }}
              className="inline-flex flex-col items-center gap-0.5 font-mono font-bold text-slate-800 hover:text-blue-900 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors text-[11px]"
              title={
                counts.enLicenciaCount > 0
                  ? `Gestionar Personal (${counts.enLicenciaCount} efectivo/s de licencia el ${formatFechaDisplay(p.fechaInicio)})`
                  : 'Gestionar Personal y Funciones de esta guardia (Editar, Eliminar, Agregar)'
              }
            >
              <span className="inline-flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" />
                <Users className="w-3.5 h-3.5 text-blue-800" />
                <span>{counts.personalCount}</span>
              </span>
              {counts.enLicenciaCount > 0 && (
                <span className="text-[9px] font-sans font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1 rounded leading-tight">
                  {counts.enLicenciaCount} c/ licencia
                </span>
              )}
            </button>
          ),
        };
      case 'moviles':
        return {
          id: 'moviles',
          label: 'Móviles',
          bgTh: '',
          bgTd: '',
          title: 'Móviles de guardia (Click para gestionar)',
          render: (p: ParteNovedadesGuardia, counts: any) => (
            <button
              type="button"
              onClick={() => {
                if (!canEdit && !canCreate) {
                  setAvisoBloqueoModal('Su usuario no tiene permisos para modificar guardias cargadas.');
                  return;
                }
                const check = verificarPermisoGuardia(p);
                if (!check.puede) {
                  setAvisoBloqueoModal(check.motivo || '');
                  return;
                }
                setMovilesModalParte(p);
              }}
              className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-900 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors text-[11px]"
              title="Gestionar Móviles de esta guardia (Parque automotor)"
            >
              <Search className="w-3 h-3 text-slate-400" />
              <Car className="w-3.5 h-3.5 text-slate-700" />
              <span>{counts.movilesCount}</span>
            </button>
          ),
        };
      case 'lc':
        return {
          id: 'lc',
          label: 'LC',
          bgTh: 'bg-blue-50/50',
          bgTd: 'bg-blue-50/30',
          title: 'LC: Labor Criminalística (Hechos no de tránsito)',
          render: (p: ParteNovedadesGuardia, counts: any) => (
            <button
              type="button"
              onClick={() => setTipoModalData({ parte: p, tipo: 'LC' })}
              className="inline-flex items-center gap-1 font-mono font-bold text-blue-950 hover:text-blue-800 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors text-[11px]"
              title="Labor Criminalística (Hechos no de tránsito) - Ver o registrar intervenciones"
            >
              <Search className="w-3 h-3 text-blue-400" />
              <ShieldAlert className="w-3.5 h-3.5 text-blue-700" />
              <span>{counts.lc}</span>
            </button>
          ),
        };
      case 'forense':
        return {
          id: 'forense',
          label: 'Forense',
          bgTh: 'bg-teal-50/50',
          bgTd: 'bg-teal-50/30',
          title: 'Médico de turno, examinados y agregar forense',
          render: (p: ParteNovedadesGuardia, counts: any) => (
            <button
              type="button"
              onClick={() => {
                if (!canEdit && !canCreate) {
                  setAvisoBloqueoModal('Su usuario no tiene permisos para modificar guardias cargadas.');
                  return;
                }
                const check = verificarPermisoGuardia(p);
                if (!check.puede) {
                  setAvisoBloqueoModal(check.motivo || '');
                  return;
                }
                setForenseModalParte(p);
              }}
              className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors cursor-pointer ${
                counts.forenseMedicosCount > 0
                  ? 'text-teal-950 hover:bg-teal-100'
                  : 'text-slate-500 hover:text-teal-900 hover:bg-teal-50'
              }`}
              title={
                counts.forenseMedicosCount > 0
                  ? `Médico(s): ${counts.forenseMedicos.join(', ')} • Examinados: ${counts.forenseCount} (Click para editar examinados o agregar otro forense)`
                  : 'Sin médico de turno asignado (Click para cargar Médico de Turno y Examinados)'
              }
            >
              <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-[11px]">
                <Search className="w-3 h-3 text-teal-500" />
                <Stethoscope
                  className={`w-3.5 h-3.5 ${
                    counts.forenseMedicosCount > 0 ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{counts.forenseMedicosCount > 0 ? counts.forenseCount : '+'}</span>
              </span>
              {counts.forenseLabel && (
                <span className="text-[10px] font-semibold text-teal-800 max-w-[115px] truncate leading-none">
                  {counts.forenseLabel}
                </span>
              )}
            </button>
          ),
        };
      case 'segVial':
        return {
          id: 'segVial',
          label: 'Seg. Vial',
          bgTh: 'bg-amber-50/50',
          bgTd: 'bg-amber-50/30',
          title: 'Seguridad Vial (Siniestros y constataciones viales)',
          render: (p: ParteNovedadesGuardia, counts: any) => (
            <button
              type="button"
              onClick={() => setTipoModalData({ parte: p, tipo: 'SegVial' })}
              className="inline-flex items-center gap-1 font-mono font-bold text-amber-950 hover:text-amber-800 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors text-[11px]"
              title="Seguridad Vial - Ver o registrar siniestros viales"
            >
              <Search className="w-3 h-3 text-amber-400" />
              <Car className="w-3.5 h-3.5 text-amber-700" />
              <span>{counts.segVial}</span>
            </button>
          ),
        };
      case 'cibercrimen':
      default:
        return {
          id: 'cibercrimen',
          label: 'Cibercrimen',
          bgTh: 'bg-indigo-50/50',
          bgTd: 'bg-indigo-50/30',
          title: 'Cibercrimen (Resguardo de evidencia y tareas)',
          render: (p: ParteNovedadesGuardia) => (
            <button
              type="button"
              onClick={() => {
                if (!canEdit && !canCreate) {
                  setAvisoBloqueoModal('Su usuario no tiene permisos para cargar o modificar registros de Cibercrimen.');
                  return;
                }
                setCibercrimenModalParte(p);
              }}
              className="inline-flex items-center gap-1 font-mono font-bold text-indigo-950 hover:text-indigo-800 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors text-[11px]"
              title="Cibercrimen - Resguardo de evidencia, filmaciones y pericias digitales"
            >
              <Search className="w-3 h-3 text-indigo-400" />
              <Cpu className="w-3.5 h-3.5 text-indigo-700" />
              <span>{p.cibercrimenRegistros?.length || 0}</span>
            </button>
          ),
        };
    }
  };

  // Filtrado reactivo de turnos de guardia
  const filteredPartes = useMemo(() => {
    return partesList.filter((p) => {
      const term = searchTerm.toLowerCase();

      // Búsqueda por personal asignado a la guardia
      const matchPersonal = (p.funcionesPersonal || []).some(
        (f) =>
          (f.personalNombre || '').toLowerCase().includes(term) ||
          (f.funcion || '').toLowerCase().includes(term)
      );

      // Búsqueda por contenido de las intervenciones de esa guardia
      const matchContenido = (p.intervenciones || []).some(
        (i) =>
          (i.hecho || '').toLowerCase().includes(term) ||
          (i.sintesisHecho || '').toLowerCase().includes(term) ||
          (i.laborCriminalistica || '').toLowerCase().includes(term) ||
          (i.inspeccionLugar || '').toLowerCase().includes(term)
      );

      // Búsqueda general
      const tipo = p.tipoGuardia || 'Pericial';
      const dep = p.dependencia || p.grupoGuardia || '';
      const matchGeneral =
        !term ||
        tipo.toLowerCase().includes(term) ||
        dep.toLowerCase().includes(term) ||
        (p.grupoGuardia || '').toLowerCase().includes(term);

      // Filtro por Fechas mejorado
      const fInicio = (p.fechaInicio || (p.fechaHoraDesde || '').slice(0, 10)).trim();
      const fFin = (p.fechaFin || (p.fechaHoraHasta || '').slice(0, 10)).trim();
      let matchFecha = true;
      if (fechaDesde) {
        if (fInicio && fInicio < fechaDesde && (!fFin || fFin < fechaDesde)) matchFecha = false;
      }
      if (fechaHasta) {
        if (fInicio && fInicio > fechaHasta) matchFecha = false;
      }

      // Filtro por tipo de guardia robusto
      const matchTipo =
        filtroTipo === 'todos' ||
        (p.tipoGuardia || '').toLowerCase() === filtroTipo.toLowerCase() ||
        (p.tipoGuardia || '').toLowerCase().includes(filtroTipo.toLowerCase());
      const matchDep = filtroDependencia === 'todas' || (p.dependencia || p.grupoGuardia) === filtroDependencia;
      const matchGrp = filtroGrupo === 'todos' || p.grupoGuardia === filtroGrupo;

      const matchTipoLesion =
        filtroTipoLesion === 'todas' ||
        (p.intervenciones || []).some(
          (i) =>
            (i.tipoLesionesLC &&
              i.tipoLesionesLC.toLowerCase().includes(filtroTipoLesion.toLowerCase())) ||
            (i.involucrados || []).some((inv) =>
              (inv.tipoLesion || 'Sin Lesiones')
                .toLowerCase()
                .includes(filtroTipoLesion.toLowerCase())
            ) ||
            (i.vehiculosSiniestro || []).some((v) =>
              (v.lesiones || '').toLowerCase().includes(filtroTipoLesion.toLowerCase())
            ) ||
            (i.personalPolicial?.tipoLesion &&
              i.personalPolicial.tipoLesion
                .toLowerCase()
                .includes(filtroTipoLesion.toLowerCase()))
        );

      const matchFallecido =
        !soloFallecidos ||
        p.intervenciones.some((i) => (i.involucrados || []).some((inv) => Boolean(inv.fallecido)));

      return (
        (matchGeneral || matchPersonal || matchContenido) &&
        matchFecha &&
        matchTipo &&
        matchDep &&
        matchGrp &&
        matchTipoLesion &&
        matchFallecido
      );
    });
  }, [
    partesList,
    searchTerm,
    fechaDesde,
    fechaHasta,
    filtroTipo,
    filtroDependencia,
    filtroGrupo,
    filtroTipoLesion,
    soloFallecidos,
  ]);

  const partesConLesionPendiente = useMemo(() => {
    return partesList.filter((p) => getResumenLesionADeterminarParte(p).cantidadIntervenciones > 0);
  }, [partesList]);

  // Paginación calculada
  const totalRecords = filteredPartes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedPartes = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredPartes.slice(start, start + pageSize);
  }, [filteredPartes, validPage, pageSize]);

  // Selección de checkboxes
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedPartes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPartes.map((p) => p.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Contadores por tipo de intervención para cada guardia (LC, Forense, Seg. Vial)
  // AP cambiado por LC (Labor Criminalística - hechos que no son de tránsito)
  // ES cambiado por Forense (Médico forense de turno, horario y examinados)
  // Seg. Vial (Hechos viales / tránsito)
  // Racionamiento eliminado
  const getCountsForGuardia = (p: ParteNovedadesGuardia) => {
    let lc = 0; // Labor Criminalística (No tránsito)
    let segVial = 0; // Seguridad Vial (Hechos viales / de tránsito)

    p.intervenciones.forEach((i) => {
      const h = (i.hecho || '').toUpperCase();
      const isVial =
        i.tipoIntervencion === 'Accidentológica' ||
        h.includes('SINIESTRO') ||
        h.includes('VIAL') ||
        h.includes('TRÁNSITO') ||
        h.includes('TRANSITO') ||
        h.includes('COLISIÓN');

      if (isVial) {
        segVial++;
      } else {
        lc++;
      }
    });

    // Médicos forenses y total de examinados
    const forenseMedicos =
      p.forensesTurno && p.forensesTurno.length > 0
        ? p.forensesTurno.map((f) => f.medicoNombre.trim()).filter(Boolean)
        : p.forense?.medicoNombre?.trim()
        ? p.forense.medicoNombre
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const totalExaminadosForense =
      p.forensesTurno && p.forensesTurno.length > 0
        ? p.forensesTurno.reduce((acc, f) => acc + (Number(f.totalExaminados) || 0), 0)
        : p.forense?.totalExaminados || 0;

    const cleanShortDocName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const forenseLabel =
      forenseMedicos.length === 0
        ? ''
        : forenseMedicos.length === 1
        ? cleanShortDocName(forenseMedicos[0])
        : `${forenseMedicos.length} forenses`;

    const enLicenciaCount = personalList.filter((pers) =>
      Boolean(getLicenciaActivaPersonal(pers.id, p.fechaInicio, licenciasPoliciales, personalList))
    ).length;

    return {
      personalCount:
        p.funcionesPersonal.filter((f) => f.personalNombre.trim().length > 0).length ||
        p.funcionesPersonal.length,
      enLicenciaCount,
      movilesCount: p.movilesAfectados.length,
      lc,
      forenseCount: totalExaminadosForense,
      forenseMedicos,
      forenseMedicosCount: forenseMedicos.length,
      forenseLabel,
      segVial,
    };
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE BÚSQUEDA Y FILTROS COLAPSABLE */}
      <CollapsibleFilterBar
        title="Búsqueda y Filtros de Partes de Guardia"
        activeFiltersCount={
          (searchTerm ? 1 : 0) +
          (fechaDesde ? 1 : 0) +
          (fechaHasta ? 1 : 0) +
          (filtroTipo !== 'todos' ? 1 : 0) +
          (filtroDependencia !== 'todas' ? 1 : 0) +
          (filtroGrupo !== 'todos' ? 1 : 0) +
          (filtroTipoLesion !== 'todas' ? 1 : 0) +
          (soloFallecidos ? 1 : 0)
        }
        onClear={() => {
          setSearchTerm('');
          setFechaDesde('');
          setFechaHasta('');
          setFiltroTipo('todos');
          setFiltroDependencia('todas');
          setFiltroGrupo('todos');
          setFiltroTipoLesion('todas');
          setSoloFallecidos(false);
        }}
        summaryRight={
          <div className="flex flex-wrap items-center gap-2">
            {partesConLesionPendiente.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFiltroTipoLesion(filtroTipoLesion === 'A Determinar' ? 'todas' : 'A Determinar')
                }
                className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] border flex items-center gap-1 cursor-pointer transition-colors ${
                  filtroTipoLesion === 'A Determinar'
                    ? 'bg-amber-700 text-white border-amber-800'
                    : 'bg-amber-200 text-amber-950 border-amber-500 hover:bg-amber-300'
                }`}
                title="Partes con intervenciones cuya lesión está A Determinar"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {partesConLesionPendiente.length} c/ lesión &ldquo;A Determinar&rdquo;
                </span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setColumnOrder(defaultColOrder);
                  try {
                    localStorage.removeItem('sispol_guardias_column_order');
                  } catch (e) {}
                  if (onSaveConfig) onSaveConfig({ ...config, ordenColumnasGuardia: defaultColOrder });
                }}
                className="px-2.5 py-1 border border-slate-300 bg-white rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                title="Restablecer el orden por defecto de las columnas de la tabla"
              >
                <ArrowLeftRight className="w-3 h-3 text-blue-700" />
                <span className="hidden sm:inline">Columnas</span>
              </button>
            )}

            {canCreate && (
              <button
                onClick={onNewGuardia}
                className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Turno</span>
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Tipo, Dependencia, Personal asignado, o contenido de novedades e intervenciones..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800"
            />
          </div>

          <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-300 bg-rose-50/70 rounded-lg text-xs font-bold text-rose-900 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={soloFallecidos}
              onChange={(e) => setSoloFallecidos(e.target.checked)}
              className="w-3.5 h-3.5 text-rose-700 rounded cursor-pointer"
            />
            <span>Con Involucrado Fallecido</span>
          </label>
        </div>

        {/* Fila secundaria de filtros: Fechas, Presets, Tipo Guardia, Dependencia, Grupo, Lesiones */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-900" />
              <span>Filtro por Rango de Fechas:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const hoy = new Date().toISOString().slice(0, 10);
                  setFechaDesde(hoy);
                  setFechaHasta(hoy);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const day = d.getDay();
                  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                  const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
                  const sunday = new Date(d.setDate(diff + 6)).toISOString().slice(0, 10);
                  setFechaDesde(monday);
                  setFechaHasta(sunday);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setFechaDesde(firstDay);
                  setFechaHasta(lastDay);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => {
                  const year = new Date().getFullYear();
                  setFechaDesde(`${year}-01-01`);
                  setFechaHasta(`${year}-12-31`);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Este Año
              </button>
              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde('');
                    setFechaHasta('');
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Quitar Fechas
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Tipo:</span>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              >
                <option value="todos">Todos los Tipos</option>
                {(config.tiposGuardia || ['Brigada', 'Servicios - Técnicos', 'Administrativa', 'Pericial', 'Prevención']).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Grupo:</span>
              <select
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              >
                <option value="todos">Todos los Grupos</option>
                {gruposList.map((g) => (
                  <option key={g.id} value={g.nombre}>{g.nombre}</option>
                ))}
                {config.gruposGuardia.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Dependencia:</span>
              <select
                value={filtroDependencia}
                onChange={(e) => setFiltroDependencia(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              >
                <option value="todas">Todas las Dependencias</option>
                {config.dependenciasPoliciales.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Lesiones:</span>
              <select
                value={filtroTipoLesion}
                onChange={(e) => setFiltroTipoLesion(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
              >
                <option value="todas">Todos los Tipos de Lesión</option>
                <option value="Sin Lesiones">Sin Lesiones</option>
                <option value="Leves">Leves</option>
                <option value="Graves">Graves</option>
                <option value="Gravísimas">Gravísimas</option>
                <option value="A Determinar">A Determinar (Falta precisar)</option>
              </select>
            </div>
          </div>
        </div>
      </CollapsibleFilterBar>

      {/* Aviso si existen Partes de Novedades con intervenciones cuya lesión está "A Determinar" */}
      {partesConLesionPendiente.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="font-extrabold block">
                Aviso: {partesConLesionPendiente.length} parte(s) de guardia tienen intervenciones con Tipo de Lesiones &ldquo;A Determinar&rdquo;
              </span>
              <span className="text-[11px] text-amber-900">
                Falta completar el carácter de las lesiones en los registros remarcados en amarillo.
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
              ? '✓ Mostrando "A Determinar" (Ver todos)'
              : `Filtrar "A Determinar" (${partesConLesionPendiente.length})`}
          </button>
        </div>
      )}

      {/* TABLA PRINCIPAL DE GUARDIAS (Estilo fiel a imagen image_13f44ed9.png) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Cabecera con degradado */}
            <thead className="bg-linear-to-b from-slate-100 to-slate-200 text-slate-800 border-b border-slate-300 font-semibold text-[11px] select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                  <input
                    type="checkbox"
                    checked={paginatedPartes.length > 0 && selectedIds.length === paginatedPartes.length}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-blue-900 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">Tipo Guardia</th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">Dependencias</th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">Fecha/Hora Desde</th>
                <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap">Fecha/Hora Hasta</th>
                {/* Columnas Reordenables (Personal, Móviles, LC, Forense, Seg. Vial, Cibercrimen) */}
                {columnOrder.map((key, idx) => {
                  const col = getColDef(key);
                  const isDragging = draggedColIdx === idx;
                  return (
                    <th
                      key={key}
                      draggable
                      onDragStart={(e) => {
                        setDraggedColIdx(idx);
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx = draggedColIdx !== null ? draggedColIdx : Number(e.dataTransfer.getData('text/plain'));
                        reordenarColumnaPorArrastre(fromIdx, idx);
                        setDraggedColIdx(null);
                      }}
                      className={`py-2 px-1 text-center border-r border-slate-300 whitespace-nowrap group select-none cursor-grab active:cursor-grabbing transition-opacity ${
                        isDragging ? 'opacity-40 bg-indigo-100' : ''
                      } ${col.bgTh}`}
                      title={`${col.title} (Arrastre para mover o use las flechas)`}
                    >
                      <div className="inline-flex items-center justify-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moverColumna(idx, 'izq'); }}
                            className="p-0.5 text-slate-400 hover:text-blue-900 hover:bg-slate-200 rounded cursor-pointer transition-colors text-[10px]"
                            title="Mover columna hacia la izquierda"
                          >
                            ◀
                          </button>
                        )}
                        <span className="font-bold">{col.label}</span>
                        {idx < columnOrder.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moverColumna(idx, 'der'); }}
                            className="p-0.5 text-slate-400 hover:text-blue-900 hover:bg-slate-200 rounded cursor-pointer transition-colors text-[10px]"
                            title="Mover columna hacia la derecha"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>

            {/* Cuerpo de la tabla */}
            <tbody className="divide-y divide-slate-200 font-normal text-slate-700">
              {paginatedPartes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No se encontraron guardias para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedPartes.map((p, idx) => {
                  const counts = getCountsForGuardia(p);
                  const isChecked = selectedIds.includes(p.id);
                  const resumenPend = getResumenLesionADeterminarParte(p);
                  const tieneLesionPendiente = resumenPend.cantidadIntervenciones > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        tieneLesionPendiente
                          ? 'bg-amber-100 hover:bg-amber-200/80 border-y-2 border-amber-400 border-l-4 border-l-amber-600'
                          : idx % 2 === 1
                          ? 'bg-slate-50/40 hover:bg-blue-50/60'
                          : 'bg-white hover:bg-blue-50/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-2.5 px-3 text-center border-r border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(p.id)}
                          className="w-3.5 h-3.5 rounded text-blue-900 cursor-pointer"
                        />
                      </td>

                      {/* Tipo Guardia */}
                      <td
                        onClick={() => onSelectGuardia(p)}
                        className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap cursor-pointer hover:underline"
                      >
                        <div>{p.tipoGuardia || 'Pericial'}</div>
                        {tieneLesionPendiente && (
                          <div className="mt-1">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 text-amber-950 border border-amber-500"
                              title="Hay intervenciones en este parte con Tipo de Lesiones marcado como A Determinar"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-800 shrink-0" />
                              <span>{resumenPend.cantidadIntervenciones} lesión A Determinar</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Dependencias */}
                      <td
                        onClick={() => onSelectGuardia(p)}
                        className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        {p.dependencia || p.grupoGuardia}
                      </td>

                      {/* Fecha/Hora Desde */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                        {p.fechaHoraDesde || `${p.fechaInicio} ${p.horaInicio}:00`}
                      </td>

                      {/* Fecha/Hora Hasta */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                        {p.fechaHoraHasta || `${p.fechaFin} ${p.horaFin}:00`}
                      </td>

                      {/* Celdas dinámicas según el orden seleccionado por el usuario */}
                      {columnOrder.map((key) => {
                        const col = getColDef(key);
                        return (
                          <td
                            key={key}
                            className={`py-2.5 px-2 text-center border-r border-slate-200 whitespace-nowrap ${col.bgTd}`}
                          >
                            {col.render(p, counts)}
                          </td>
                        );
                      })}

                      {/* ACCIONES: Reemplazar 'Cargar Novedades' por 'Vista Preliminar' según pedido del usuario */}
                      <td
                        className="py-2.5 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reemplazo explícito: Vista Preliminar y Descargar PDF */}
                          <button
                            type="button"
                            onClick={() => setPreviewParte(p)}
                            className="px-2.5 py-1 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Vista Preliminar Oficial del Parte de Novedades (PDF y Reporte)"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-700" />
                            <span>Vista Preliminar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => generarPdfParteGuardia(p, config, { licenciasPoliciales, personalList })}
                            className="px-2 py-1 text-slate-700 hover:text-blue-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Descargar documento PDF oficial firmado"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-800" />
                            <span className="hidden xl:inline">Descargar PDF</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                const check = verificarPermisoGuardia(p);
                                if (!check.puede) {
                                  setAvisoBloqueoModal(check.motivo || '');
                                  return;
                                }
                                onEditGuardia(p);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              title="Editar Datos Generales de la Guardia"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setGuardiaDeleteConfirm({ isOpen: true, parte: p })}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Eliminar Guardia"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PIE / PAGINACIÓN */}
        <div className="bg-linear-to-b from-slate-100 to-slate-200 border-t border-slate-300 p-2 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-slate-700 text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-200 border border-slate-300 font-mono text-[10px] font-bold">
              SIS.POL
            </span>
            <span className="text-slate-600">
              Registros del <strong className="font-mono">{(validPage - 1) * pageSize + 1}</strong> al{' '}
              <strong className="font-mono">{Math.min(validPage * pageSize, totalRecords)}</strong> de{' '}
              <strong className="font-mono">{totalRecords}</strong> guardias
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Filas por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono text-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
              <button
                disabled={validPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                title="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={validPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-mono text-slate-800 font-bold">
                Pág. {validPage} / {totalPages}
              </span>

              <button
                disabled={validPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={validPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: GESTIÓN DE PERSONAL Y FUNCIONES (Según image_a9bdfe7b.png) */}
      {personalModalParte && (
        <GestionPersonalGuardiaModal
          parte={personalModalParte}
          personalList={personalList}
          gruposList={gruposList}
          licenciasPoliciales={licenciasPoliciales}
          config={config}
          onSave={(updated) => {
            if (onSaveParte) onSaveParte(updated);
            setPersonalModalParte(null);
          }}
          onClose={() => setPersonalModalParte(null)}
        />
      )}

      {/* MODAL 2: GESTIÓN DE MÓVILES AFECTADOS */}
      {movilesModalParte && (
        <GestionMovilesGuardiaModal
          parte={movilesModalParte}
          movilesList={movilesList}
          config={config}
          onSave={(updated) => {
            if (onSaveParte) onSaveParte(updated);
            setMovilesModalParte(null);
          }}
          onClose={() => setMovilesModalParte(null)}
        />
      )}

      {/* MODAL 3: GESTIÓN DE FORENSE DE TURNO Y RELEVOS */}
      {forenseModalParte && (
        <GestionForenseGuardiaModal
          parte={forenseModalParte}
          config={config}
          onSave={(updated) => {
            if (onSaveParte) onSaveParte(updated);
            setForenseModalParte(null);
          }}
          onClose={() => setForenseModalParte(null)}
        />
      )}

      {/* MODAL 4: DETALLE INTERVENCIONES POR TIPO (LC / SEG. VIAL) */}
      {tipoModalData && (
        <DetalleIntervencionesTipoModal
          parte={tipoModalData.parte}
          tipo={tipoModalData.tipo}
          onNuevaIntervencion={
            canCreate
              ? (tipoDefault) => {
                  if (onNuevaIntervencionParaGuardia) {
                    onNuevaIntervencionParaGuardia(tipoModalData.parte, tipoDefault);
                  } else {
                    onSelectGuardia(tipoModalData.parte);
                  }
                }
              : undefined
          }
          onEditarIntervencion={
            canEdit
              ? (interv) => {
                  if (onEditarIntervencion) onEditarIntervencion(interv);
                }
              : undefined
          }
          onClose={() => setTipoModalData(null)}
        />
      )}

      {/* MODAL 6: VISTA PRELIMINAR DEL PARTE OFICIAL DE NOVEDADES */}
      {previewParte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
          onClick={() => setPreviewParte(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior de modal con botón Cerrar destacado */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-blue-200">
                  Vista Preliminar Oficial del Parte de Novedades
                </span>
                <span className="bg-blue-800 text-blue-100 text-xs px-2 py-0.5 rounded font-mono">
                  {previewParte.tipoGuardia || previewParte.grupoGuardia}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewParte(null)}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Cerrar vista preliminar"
              >
                <span>Cerrar</span>
                <span className="text-base font-bold">&times;</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <ParteVisualPreview
                parte={previewParte}
                config={config}
                personalList={personalList}
                licenciasPoliciales={licenciasPoliciales}
                onClose={() => setPreviewParte(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de aviso: Bloqueo de edición fuera de turno activo */}
      {avisoBloqueoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full p-5 text-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-full">
                <ShieldAlert className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Actuaciones Protegidas</h3>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Restricción Fuera de Turno de Guardia
                </span>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              {avisoBloqueoModal}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAvisoBloqueoModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar guardia */}
      <ConfirmModal
        isOpen={guardiaDeleteConfirm.isOpen}
        title="Eliminar Turno de Guardia"
        message={`¿Confirma eliminar definitivamente este turno de guardia (${guardiaDeleteConfirm.parte?.tipoGuardia || guardiaDeleteConfirm.parte?.grupoGuardia || ''} del ${guardiaDeleteConfirm.parte?.fechaInicio || ''}) y todas sus intervenciones?`}
        confirmLabel="Eliminar Guardia"
        isDestructive={true}
        onConfirm={() => {
          if (guardiaDeleteConfirm.parte) {
            onDeleteGuardia(guardiaDeleteConfirm.parte.id);
          }
        }}
        onClose={() => setGuardiaDeleteConfirm({ isOpen: false, parte: null })}
      />

      {/* Modal Cibercrimen de Guardia */}
      {cibercrimenModalParte && (
        <GestionCibercrimenGuardiaModal
          parte={cibercrimenModalParte}
          personalList={personalList}
          config={config}
          onSaveParte={(updated) => {
            if (onSaveParte) onSaveParte(updated);
            setCibercrimenModalParte(updated);
          }}
          onClose={() => setCibercrimenModalParte(null)}
        />
      )}
    </div>
  );
};

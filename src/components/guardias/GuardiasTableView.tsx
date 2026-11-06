import React, { useState, useMemo } from 'react';
import {
  ParteNovedadesGuardia,
  Personal,
  MovilPolicial,
  GrupoPersonal,
  ConfiguracionSistema,
  IntervencionParte,
} from '../../types/police';
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
} from 'lucide-react';

import { GestionPersonalGuardiaModal } from './GestionPersonalGuardiaModal';
import { GestionMovilesGuardiaModal } from './GestionMovilesGuardiaModal';
import { GestionForenseGuardiaModal } from './GestionForenseGuardiaModal';
import { DetalleIntervencionesTipoModal } from './DetalleIntervencionesTipoModal';
import { GestionCibercrimenGuardiaModal } from './GestionCibercrimenGuardiaModal';
import { ParteVisualPreview } from './ParteVisualPreview';
import { ConfirmModal } from '../common/ConfirmModal';
import { UsuarioSistema } from '../../types/police';
import { Cpu } from 'lucide-react';

interface GuardiasTableViewProps {
  partesList: ParteNovedadesGuardia[];
  personalList?: Personal[];
  movilesList?: MovilPolicial[];
  gruposList?: GrupoPersonal[];
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
  // Buscadores y filtros requeridos: fecha, guardia, personal, contenido
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');

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

  // Filtrado reactivo de turnos de guardia
  const filteredPartes = useMemo(() => {
    return partesList.filter((p) => {
      const term = searchTerm.toLowerCase();

      // Búsqueda por personal asignado a la guardia
      const matchPersonal = p.funcionesPersonal.some(
        (f) =>
          f.personalNombre.toLowerCase().includes(term) ||
          f.funcion.toLowerCase().includes(term)
      );

      // Búsqueda por contenido de las intervenciones de esa guardia
      const matchContenido = p.intervenciones.some(
        (i) =>
          i.hecho.toLowerCase().includes(term) ||
          i.sintesisHecho.toLowerCase().includes(term) ||
          i.laborCriminalistica.toLowerCase().includes(term) ||
          i.inspeccionLugar.toLowerCase().includes(term)
      );

      // Búsqueda general
      const tipo = p.tipoGuardia || 'Pericial';
      const dep = p.dependencia || p.grupoGuardia;
      const matchGeneral =
        tipo.toLowerCase().includes(term) ||
        dep.toLowerCase().includes(term) ||
        p.grupoGuardia.toLowerCase().includes(term);

      // Filtro por Fechas
      const fInicio = p.fechaInicio;
      let matchFecha = true;
      if (fechaDesde && fInicio < fechaDesde) matchFecha = false;
      if (fechaHasta && fInicio > fechaHasta) matchFecha = false;

      // Filtro por tipo, dependencia y grupo
      const matchTipo = filtroTipo === 'todos' || (p.tipoGuardia || 'Pericial') === filtroTipo;
      const matchDep = filtroDependencia === 'todas' || (p.dependencia || p.grupoGuardia) === filtroDependencia;
      const matchGrp = filtroGrupo === 'todos' || p.grupoGuardia === filtroGrupo;

      return (matchGeneral || matchPersonal || matchContenido) && matchFecha && matchTipo && matchDep && matchGrp;
    });
  }, [partesList, searchTerm, fechaDesde, fechaHasta, filtroTipo, filtroDependencia, filtroGrupo]);

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

    // Total de examinados por médico forense de turno y relevos
    const totalExaminadosForense =
      p.forensesTurno && p.forensesTurno.length > 0
        ? p.forensesTurno.reduce((acc, f) => acc + (Number(f.totalExaminados) || 0), 0)
        : p.forense?.totalExaminados || 0;

    return {
      personalCount:
        p.funcionesPersonal.filter((f) => f.personalNombre.trim().length > 0).length ||
        p.funcionesPersonal.length,
      movilesCount: p.movilesAfectados.length,
      lc,
      forenseCount: totalExaminadosForense,
      segVial,
    };
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE BÚSQUEDA Y FILTROS EN TIEMPO REAL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setFechaDesde('');
                setFechaHasta('');
                setFiltroTipo('todos');
                setFiltroDependencia('todas');
                setFiltroGrupo('todos');
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1"
              title="Limpiar filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>

            <button
              onClick={onNewGuardia}
              className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Turno de Guardia</span>
            </button>
          </div>
        </div>

        {/* Fila secundaria de filtros: Fechas, Tipo Guardia, Dependencia, Grupo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
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
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
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
        </div>
      </div>

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
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap" title="Click para agregar, editar o eliminar personal de esta guardia">Personal</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap" title="Click para agregar, editar o eliminar móviles del parque automotor">Móviles</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap bg-blue-50/50" title="LC: Labor Criminalística (Hechos no de tránsito)">LC</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap bg-teal-50/50" title="Forense de turno y relevos (Horarios y personas examinadas)">Forense</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap bg-amber-50/50" title="Seguridad Vial (Siniestros y constataciones viales)">Seg. Vial</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-300 whitespace-nowrap bg-indigo-50/50" title="Cibercrimen (Resguardo de evidencia y filmaciones)">Cibercrimen</th>
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

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-50/60 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
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
                        {p.tipoGuardia || 'Pericial'}
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

                      {/* PERSONAL (Interactible: editar, eliminar, agregar según image_a9bdfe7b.png) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const check = verificarPermisoGuardia(p);
                            if (!check.puede) {
                              setAvisoBloqueoModal(check.motivo || '');
                              return;
                            }
                            setPersonalModalParte(p);
                          }}
                          className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-900 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors text-[11px]"
                          title="Gestionar Personal y Funciones de esta guardia (Editar, Eliminar, Agregar)"
                        >
                          <Search className="w-3 h-3 text-slate-400" />
                          <Users className="w-3.5 h-3.5 text-blue-800" />
                          <span>{counts.personalCount}</span>
                        </button>
                      </td>

                      {/* MÓVILES (Interactible: agregar, editar, eliminar móviles según parque automotor) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
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
                      </td>

                      {/* LC: LABOR CRIMINALÍSTICA (Hechos no de tránsito) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-blue-50/30">
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
                      </td>

                      {/* FORENSE (Médico forense de turno, horario y examinados) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-teal-50/30">
                        <button
                          type="button"
                          onClick={() => {
                            const check = verificarPermisoGuardia(p);
                            if (!check.puede) {
                              setAvisoBloqueoModal(check.motivo || '');
                              return;
                            }
                            setForenseModalParte(p);
                          }}
                          className="inline-flex items-center gap-1 font-mono font-bold text-teal-950 hover:text-teal-800 hover:bg-teal-100 px-2 py-0.5 rounded transition-colors text-[11px]"
                          title="Forense de turno y relevos (Horarios y personas examinadas)"
                        >
                          <Search className="w-3 h-3 text-teal-400" />
                          <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                          <span>{counts.forenseCount}</span>
                        </button>
                      </td>

                      {/* SEG. VIAL (Siniestros y hechos de tránsito) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-amber-50/30">
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
                      </td>

                      {/* CIBERCRIMEN (Resguardo de evidencia y filmaciones - No suma a intervenciones) */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-indigo-50/30">
                        <button
                          type="button"
                          onClick={() => setCibercrimenModalParte(p)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-indigo-950 hover:text-indigo-800 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors text-[11px]"
                          title="Cibercrimen - Resguardo de evidencia, filmaciones y pericias digitales"
                        >
                          <Search className="w-3 h-3 text-indigo-400" />
                          <Cpu className="w-3.5 h-3.5 text-indigo-700" />
                          <span>{p.cibercrimenRegistros?.length || 0}</span>
                        </button>
                      </td>

                      {/* ACCIONES: Reemplazar 'Cargar Novedades' por 'Vista Preliminar' según pedido del usuario */}
                      <td
                        className="py-2.5 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reemplazo explícito: Vista Preliminar */}
                          <button
                            type="button"
                            onClick={() => setPreviewParte(p)}
                            className="px-2.5 py-1 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="Vista Preliminar Oficial del Parte de Novedades (PDF y Reporte)"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-700" />
                            <span>Vista Preliminar</span>
                          </button>

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

                          <button
                            type="button"
                            onClick={() => setGuardiaDeleteConfirm({ isOpen: true, parte: p })}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar Guardia"
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
          onNuevaIntervencion={(tipoDefault) => {
            if (onNuevaIntervencionParaGuardia) {
              onNuevaIntervencionParaGuardia(tipoModalData.parte, tipoDefault);
            } else {
              onSelectGuardia(tipoModalData.parte);
            }
          }}
          onEditarIntervencion={(interv) => {
            if (onEditarIntervencion) onEditarIntervencion(interv);
          }}
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

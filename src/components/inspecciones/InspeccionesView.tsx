import React, { useState, useMemo } from 'react';
import {
  InspeccionOcular,
  ParteNovedadesGuardia,
  Personal,
  ConfiguracionSistema,
  IntervencionParte,
  UsuarioSistema,
  DelegacionPolicial,
  GrupoPersonal,
} from '../../types/police';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import {
  Camera,
  Search,
  Plus,
  Download,
  Calendar,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Users,
  Image as ImageIcon,
  Clock,
  Filter,
  Shield,
  ShieldAlert,
  Hash,
  Sparkles,
  ClipboardList,
  RotateCcw,
  Check,
  X,
  CheckCircle2,
  FileSpreadsheet,
  LayoutGrid,
  ShieldCheck,
  UserCheck,
  Car,
  BarChart3,
} from 'lucide-react';
import { InspeccionModal } from './InspeccionModal';
import { ControlNumeradorModal } from '../guardias/ControlNumeradorModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ModuleStatsPanel } from '../common/ModuleStatsPanel';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import { generarPdfInspeccionOcular, generarPdfReporteInspeccionesOcularesPorTipo } from '../../services/pdfService';
import {
  extractIoNumber,
  extractIoYear,
  findDuplicateIoCode,
  formatNroIO,
  getLastLoadedIoNumber,
  getNextIoNumber,
  sanitizeUltimoNroIO,
} from '../../utils/numeracionUtils';
import { getCrudPermissions } from '../../utils/permisosUtils';

interface InspeccionesViewProps {
  inspeccionesList: InspeccionOcular[];
  partesGuardiaList?: ParteNovedadesGuardia[];
  intervencionesList?: IntervencionParte[];
  personalList?: Personal[];
  delegacionesList?: DelegacionPolicial[];
  gruposList?: GrupoPersonal[];
  activeDelegacionId?: string;
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSaveInspeccion: (io: InspeccionOcular) => void;
  onDeleteInspeccion: (id: string) => void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
  onNavigateToGuardias?: () => void;
}

export const InspeccionesView: React.FC<InspeccionesViewProps> = ({
  inspeccionesList,
  partesGuardiaList = [],
  intervencionesList = [],
  personalList = [],
  delegacionesList = [],
  gruposList = [],
  activeDelegacionId,
  config,
  currentUser,
  onSaveInspeccion,
  onDeleteInspeccion,
  onSaveConfig,
  onNavigateToGuardias,
}) => {
  const { canCreate, canEdit, canDelete } = getCrudPermissions(currentUser);
  const añoActual = useMemo(() => new Date().getFullYear(), []);

  const puedeVerTodasDelegaciones = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.rol === 'superusuario' || currentUser.rol === 'administrador') return true;
    return Boolean(currentUser.puedeVerOtrasDelegaciones);
  }, [currentUser]);
  const delegacionRestringidaId = !puedeVerTodasDelegaciones ? currentUser?.delegacionId || '' : '';

  // Estilo de visualización: 'parte-novedades' (Matriz Policial Oficial) o 'cuadricula' (Tarjetas)
  const [viewStyle, setViewStyle] = useState<'parte-novedades' | 'cuadricula'>('parte-novedades');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | 'guardias' | 'directas'>('todos');
  const [filtroHecho, setFiltroHecho] = useState('');
  const [filtroGrupoGuardia, setFiltroGrupoGuardia] = useState('todos');
  const [filtroEstadoFotos, setFiltroEstadoFotos] = useState<'todos' | 'confirmadas' | 'pendientes'>('todos');
  const [soloPolicial, setSoloPolicial] = useState(false);
  const [mostrarStats, setMostrarStats] = useState(false);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isControlNumeradorOpen, setIsControlNumeradorOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionOcular | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
    index: number;
  }>({ isOpen: false, files: [], index: 0 });
  const [deleteIoConfirm, setDeleteIoConfirm] = useState<{
    isOpen: boolean;
    io: InspeccionOcular | null;
  }>({ isOpen: false, io: null });

  // Mensaje de éxito o error tras carga o edición rápida en tabla
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);
  const [quickErrorMsg, setQuickErrorMsg] = useState<string | null>(null);

  // 1. SINCRONIZACIÓN Y CONSOLIDACIÓN SIN DUPLICADOS DE INSPECCIONES + INTERVENCIONES (LC + SEG. VIAL)
  const listaConsolidada = useMemo(() => {
    const consolidatedMap = new Map<string, InspeccionOcular>();
    const seenIntervIds = new Set<string>();
    const usedIoKeys = new Set<string>();

    const registerUsedIo = (nroIO?: string) => {
      const n = extractIoNumber(nroIO);
      if (n > 0) {
        const y = extractIoYear(nroIO, añoActual);
        usedIoKeys.add(`${y}:${n}`);
      }
    };

    // Primero agregamos todas las inspecciones guardadas en la BD de Inspecciones (sin duplicar claves)
    inspeccionesList.forEach((io) => {
      if (delegacionRestringidaId && io.delegacionId && io.delegacionId !== delegacionRestringidaId) {
        return;
      }
      consolidatedMap.set(io.id, io);
      registerUsedIo(io.nroIO);
      if (io.intervencionId) {
        seenIntervIds.add(io.intervencionId);
      }
    });

    // Helper para convertir una intervención de guardia / módulo en Inspección Ocular sin repetir números
    let nextCandidate = Math.max(config.inicioNroIO || 1, 1);
    const allocNextFreeIo = (preferredCode: string | undefined, targetYear: number): string => {
      const prefNum = extractIoNumber(preferredCode);
      if (prefNum > 0) {
        const prefYear = extractIoYear(preferredCode, targetYear);
        const key = `${prefYear}:${prefNum}`;
        if (!usedIoKeys.has(key)) {
          usedIoKeys.add(key);
          if (prefYear === targetYear && prefNum >= nextCandidate) {
            nextCandidate = prefNum + 1;
          }
          return preferredCode!.trim();
        }
      }
      while (usedIoKeys.has(`${targetYear}:${nextCandidate}`)) {
        nextCandidate += 1;
      }
      const assignedNum = nextCandidate;
      usedIoKeys.add(`${targetYear}:${assignedNum}`);
      nextCandidate += 1;
      return formatNroIO(assignedNum, targetYear);
    };

    const appendIntervencionAsIO = (
      interv: IntervencionParte,
      delId?: string,
      grupoGuardia?: string,
      parteFechaInicio?: string,
      parteHoraInicio?: string,
      parteDependencia?: string
    ) => {
      if (seenIntervIds.has(interv.id) || consolidatedMap.has(interv.id)) return;
      seenIntervIds.add(interv.id);

      const fechaVal = interv.inspeccionFecha || parteFechaInicio || new Date().toISOString().slice(0, 10);
      const itemYear = parseInt(fechaVal.slice(0, 4), 10) || añoActual;
      const nroIOAuto = allocNextFreeIo(interv.nroIO, itemYear);
      const direccion = interv.direccion || interv.inspeccionLugar || 'Lugar s/ consignar';
      const perito = interv.perito || interv.personalTecnico?.peritoAuxiliar || '';
      const fotografo = interv.fotografo || interv.personalTecnico?.choferFotografo || '';
      const personal =
        [perito ? `Perito: ${perito}` : '', fotografo ? `Fotógrafo: ${fotografo}` : '']
          .filter(Boolean)
          .join(' - ') || 'Personal Técnico de Guardia';

      const polInvolucrado =
        Boolean(interv.involucraPersonalPolicial) ||
        (interv.involucrados || []).some((inv) => inv.esPersonalPolicial);

      const ioFromInterv: InspeccionOcular = {
        id: interv.id,
        nroIO: nroIOAuto,
        fecha: fechaVal,
        hora: interv.inspeccionHora || interv.solicitudHora?.replace(' hs.', '') || parteHoraInicio || '08:00',
        lugar: direccion,
        direccion,
        hecho: interv.hecho || 'Intervención Policial de Guardia',
        tipo: interv.tipoIntervencion === 'Accidentológica' ? 'Accidentológica Vial' : 'Criminalística',
        dependenciaSolicitante: interv.dependencia || parteDependencia || config.dependencia || 'Comisaría de Turno',
        expedienteVinculado: interv.referencia || interv.codigoIntervencion || '',
        personalInterviniente: personal,
        perito,
        fotografo,
        cantidadFotografias: interv.vehiculosSiniestro?.length ? 14 : 8,
        fotosConformeFotografo: interv.fotosConformeFotografo
          ? 'Conforme relevamiento del fotógrafo'
          : 'Relevamiento fotográfico digital',
        fotosConfirmadas: Boolean(interv.fotosConfirmadas),
        confirmadoPorUsuario: interv.confirmadoPorUsuario || '',
        resumen:
          interv.sintesisHecho ||
          `Intervención en guardia registrada con ${interv.involucrados?.length || 0} demorado/s y ${interv.testigos?.length || 0} testigo/s.`,
        conclusiones: interv.laborCriminalistica || '',
        fotosAdjuntas: [],
        origenGuardia: true,
        intervencionId: interv.id,
        delegacionId: delId,
        grupoGuardia,
        involucraPersonalPolicial: polInvolucrado,
        personalPolicial: interv.personalPolicial,
        createdAt: interv.createdAt || new Date().toISOString(),
        updatedAt: interv.createdAt || new Date().toISOString(),
      };

      consolidatedMap.set(ioFromInterv.id, ioFromInterv);
    };

    // Recolectar intervenciones de partes de guardia
    partesGuardiaList.forEach((parte) => {
      if (delegacionRestringidaId && parte.delegacionId && parte.delegacionId !== delegacionRestringidaId) {
        return;
      }
      (parte.intervenciones || []).forEach((interv) => {
        appendIntervencionAsIO(
          interv,
          parte.delegacionId,
          parte.grupoGuardia,
          parte.fechaInicio,
          parte.horaInicio,
          parte.dependencia
        );
      });
    });

    // También incluir intervenciones registradas directamente en el módulo Intervenciones (LC / Seg. Vial)
    intervencionesList.forEach((interv) => {
      appendIntervencionAsIO(interv, activeDelegacionId);
    });

    return Array.from(consolidatedMap.values()).sort((a, b) => {
      if ((a.fecha || '') !== (b.fecha || '')) return (b.fecha || '').localeCompare(a.fecha || '');
      const numDiff = extractIoNumber(b.nroIO || '') - extractIoNumber(a.nroIO || '');
      if (numDiff !== 0) return numDiff;
      return (b.nroIO || '').localeCompare(a.nroIO || '');
    });
  }, [
    inspeccionesList,
    partesGuardiaList,
    intervencionesList,
    añoActual,
    config.dependencia,
    config.inicioNroIO,
    delegacionRestringidaId,
    activeDelegacionId,
  ]);

  const ultimoLoadedIO = useMemo(() => {
    const loaded = getLastLoadedIoNumber({
      inspecciones: listaConsolidada,
      anio: añoActual,
    });
    return Math.max(loaded, sanitizeUltimoNroIO(config.ultimoNroIO));
  }, [listaConsolidada, añoActual, config.ultimoNroIO]);

  // Contador de I.O. correlativo tomando el último cargado sin repetirse
  const proximoNroIO = useMemo(() => {
    return getNextIoNumber({
      inspecciones: listaConsolidada,
      config,
      anio: añoActual,
    });
  }, [listaConsolidada, config, añoActual]);

  // Formulario de carga rápida directo desde la tabla
  const [inlineNroIO, setInlineNroIO] = useState<string>(() => formatNroIO(proximoNroIO, añoActual));
  const [inlineFecha, setInlineFecha] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [inlineHora, setInlineHora] = useState<string>('10:00');
  const [inlineDireccion, setInlineDireccion] = useState<string>('');
  const [inlineHecho, setInlineHecho] = useState<string>(() => config.hechosCriminalistica?.[0] || 'SECUESTRO Y APREHENSION');
  const [inlineTipo, setInlineTipo] = useState<string>('Criminalística');
  const [inlineDependencia, setInlineDependencia] = useState<string>(() => config.dependenciasPoliciales?.[0] || 'Comisaría Seccional 1ra');
  const [inlinePerito, setInlinePerito] = useState<string>('');
  const [inlineFotografo, setInlineFotografo] = useState<string>('');
  const [inlineCantidadFotos, setInlineCantidadFotos] = useState<number>(8);
  const [inlineResumen, setInlineResumen] = useState<string>('');

  // Sincronizar sugerencia de número cuando cambia el contador
  React.useEffect(() => {
    setInlineNroIO(formatNroIO(proximoNroIO, añoActual));
  }, [proximoNroIO, añoActual]);

  // Edición directa en fila de tabla (Inline Row Editing)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<InspeccionOcular | null>(null);

  // Filtros reactivos con búsqueda por fecha, tipo, personal, lugar, hecho, grupo, estado de fotos
  const filteredList = useMemo(() => {
    return listaConsolidada.filter((io) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (io.nroIO || '').toLowerCase().includes(term) ||
        (io.direccion && io.direccion.toLowerCase().includes(term)) ||
        (io.lugar || '').toLowerCase().includes(term) ||
        (io.hecho && io.hecho.toLowerCase().includes(term)) ||
        (io.resumen || '').toLowerCase().includes(term) ||
        (io.personalInterviniente || '').toLowerCase().includes(term) ||
        (io.perito && io.perito.toLowerCase().includes(term)) ||
        (io.fotografo && io.fotografo.toLowerCase().includes(term)) ||
        (io.dependenciaSolicitante || '').toLowerCase().includes(term) ||
        (io.grupoGuardia && io.grupoGuardia.toLowerCase().includes(term)) ||
        (io.expedienteVinculado && io.expedienteVinculado.toLowerCase().includes(term));

      const matchTipo = filtroTipo === 'todos' || io.tipo === filtroTipo;

      let matchFecha = true;
      if (fechaDesde && io.fecha < fechaDesde) matchFecha = false;
      if (fechaHasta && io.fecha > fechaHasta) matchFecha = false;

      const matchDep =
        filtroDependencia === 'todas' || io.dependenciaSolicitante === filtroDependencia;

      const matchOrig =
        filtroOrigen === 'todos' ||
        (filtroOrigen === 'guardias' && io.origenGuardia) ||
        (filtroOrigen === 'directas' && !io.origenGuardia);

      const matchHecho =
        !filtroHecho.trim() ||
        (io.hecho || '').toLowerCase().includes(filtroHecho.trim().toLowerCase());

      const matchGrupo =
        filtroGrupoGuardia === 'todos' || (io.grupoGuardia || '') === filtroGrupoGuardia;

      const isConfirmed = Boolean(io.fotosConfirmadas || io.confirmadoPorUsuario);
      const matchEstadoFotos =
        filtroEstadoFotos === 'todos' ||
        (filtroEstadoFotos === 'confirmadas' && isConfirmed) ||
        (filtroEstadoFotos === 'pendientes' && !isConfirmed);

      const matchPolicial = !soloPolicial || Boolean(io.involucraPersonalPolicial);

      return (
        matchSearch &&
        matchTipo &&
        matchFecha &&
        matchDep &&
        matchOrig &&
        matchHecho &&
        matchGrupo &&
        matchEstadoFotos &&
        matchPolicial
      );
    });
  }, [
    listaConsolidada,
    searchTerm,
    filtroTipo,
    fechaDesde,
    fechaHasta,
    filtroDependencia,
    filtroOrigen,
    filtroHecho,
    filtroGrupoGuardia,
    filtroEstadoFotos,
    soloPolicial,
  ]);

  const totalFotografias = useMemo(() => {
    return listaConsolidada.reduce((acc, io) => acc + (io.cantidadFotografias || 0), 0);
  }, [listaConsolidada]);

  const totalIntervencionesGuardia = useMemo(() => {
    return partesGuardiaList.reduce((acc, p) => acc + (p.intervenciones?.length || 0), 0);
  }, [partesGuardiaList]);

  // Cantidad de Intervenciones Criminalísticas (LC)
  const cantidadLC = useMemo(() => {
    return listaConsolidada.filter((io) => {
      const t = (io.tipo || '').toLowerCase();
      return t.includes('criminalística') || t.includes('lc') || (!t.includes('accid') && !t.includes('vial'));
    }).length;
  }, [listaConsolidada]);

  // Cantidad de Seguridad Vial (Seg. Vial) - Siniestros y Hechos Viales
  const cantidadSegVial = useMemo(() => {
    return listaConsolidada.filter((io) => {
      const t = (io.tipo || '').toLowerCase();
      return t.includes('accid') || t.includes('vial') || t.includes('siniestro');
    }).length;
  }, [listaConsolidada]);

  // Total de Inspecciones Oculares = LC + Seg. Vial
  const cantidadTotalIO = cantidadLC + cantidadSegVial;

  const ioStats = useMemo(() => {
    const total = listaConsolidada.length;
    const confirmadas = listaConsolidada.filter((io) => Boolean(io.fotosConfirmadas || io.confirmadoPorUsuario)).length;
    const promFotos = total > 0 ? Math.round((totalFotografias / total) * 10) / 10 : 0;

    const porTipo = new Map<string, { actas: number; fotos: number }>();
    listaConsolidada.forEach((io) => {
      const t = io.tipo || 'Otras';
      const cur = porTipo.get(t) || { actas: 0, fotos: 0 };
      cur.actas += 1;
      cur.fotos += io.cantidadFotografias || 0;
      porTipo.set(t, cur);
    });

    return {
      kpis: [
        { label: 'Total Actas I.O.', value: total, detail: `LC: ${cantidadLC} · Seg. Vial: ${cantidadSegVial}`, tone: 'navy' as const },
        { label: 'Tomas Fotográficas', value: totalFotografias, detail: 'Evidencia visual capturada', tone: 'blue' as const },
        { label: 'Promedio Fotos / Acta', value: promFotos, detail: 'Cobertura fotográfica media', tone: 'slate' as const },
        { label: 'Fotos Confirmadas', value: `${confirmadas}/${total}`, detail: 'Validación conforme fotógrafo', tone: 'emerald' as const },
      ],
      charts: [
        {
          id: 'io-tipos',
          title: 'Inspecciones por Tipo Pericial',
          subtitle: 'Proporción por especialidad de relevamiento',
          type: 'donut' as const,
          data: Array.from(porTipo.entries()).map(([name, v]) => ({ name, value: v.actas })),
        },
        {
          id: 'io-fotos',
          title: 'Volumen de Fotografías por Tipo',
          subtitle: 'Total de tomas fotográficas registradas',
          type: 'bar' as const,
          data: Array.from(porTipo.entries()).map(([name, v]) => ({ name, value: v.fotos })),
          valueLabel: 'Fotografías',
        },
      ],
    };
  }, [listaConsolidada, totalFotografias, cantidadLC, cantidadSegVial]);

  // Personal para autocompletar Perito / Fotógrafo (priorizando personal de partes de guardia)
  const opcionesPersonalGuardia = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    partesGuardiaList.forEach((parte) => {
      parte.funcionesPersonal?.forEach((f) => {
        if (f.personalNombre?.trim() && !seen.has(f.personalNombre.trim().toLowerCase())) {
          seen.add(f.personalNombre.trim().toLowerCase());
          list.push(f.personalNombre.trim());
        }
      });
      parte.intervenciones?.forEach((i) => {
        if (i.perito?.trim() && !seen.has(i.perito.trim().toLowerCase())) {
          seen.add(i.perito.trim().toLowerCase());
          list.push(i.perito.trim());
        }
        if (i.fotografo?.trim() && !seen.has(i.fotografo.trim().toLowerCase())) {
          seen.add(i.fotografo.trim().toLowerCase());
          list.push(i.fotografo.trim());
        }
      });
    });

    personalList.forEach((p) => {
      const full = `${p.jerarquia} ${p.apellidoYNombre}`.trim();
      if (!seen.has(full.toLowerCase())) {
        seen.add(full.toLowerCase());
        list.push(full);
      }
    });

    return list;
  }, [partesGuardiaList, personalList]);

  // Handler para validar/confirmar cantidad de fotos al hacer clic sobre el estado
  const handleToggleValidarFotos = (io: InspeccionOcular) => {
    if (!canEdit) {
      setQuickSuccessMsg(
        'Acceso restringido: Su usuario solo tiene permisos para consultar o cargar registros y no puede editar ni validar fotografías.'
      );
      setTimeout(() => setQuickSuccessMsg(null), 4000);
      return;
    }

    const puedeValidar = Boolean(
      currentUser?.rol === 'superusuario' || currentUser?.puedeConfirmarFotografias
    );

    if (!puedeValidar) {
      setQuickSuccessMsg(
        'Acceso restringido: Se requiere el permiso especial "Confirmar Fotografías" o rol de Superusuario para validar fotografías.'
      );
      setTimeout(() => setQuickSuccessMsg(null), 4000);
      return;
    }

    const nuevoEstado = !io.fotosConfirmadas;
    const confirmador = nuevoEstado
      ? currentUser?.apellidoYNombre || currentUser?.username || 'Oficial Validante'
      : undefined;

    const actualizada: InspeccionOcular = {
      ...io,
      fotosConfirmadas: nuevoEstado,
      confirmadoPorUsuario: confirmador,
      updatedAt: new Date().toISOString(),
    };

    onSaveInspeccion(actualizada);
    setQuickSuccessMsg(
      nuevoEstado
        ? `¡Fotografías de ${io.nroIO} (${io.cantidadFotografias || 0} tomas) confirmadas por ${confirmador}!`
        : `Estado de fotografías de ${io.nroIO} revertido a pendiente.`
    );
    setTimeout(() => setQuickSuccessMsg(null), 3500);
  };

  // RESETEAR CONTADOR A 1
  const handleConfirmResetContador = () => {
    if (!canEdit) return;
    if (onSaveConfig) {
      onSaveConfig({
        ...config,
        inicioNroIO: 1,
        ultimoNroIO: 0,
      });
      setInlineNroIO(`I.O. Nº 001/${añoActual}`);
      setQuickSuccessMsg('Contador de Inspecciones Oculares reiniciado al N° 001 correctamente.');
      setTimeout(() => setQuickSuccessMsg(null), 4000);
    }
    setIsResetModalOpen(false);
  };

  // CARGA RÁPIDA DIRECTA DESDE LA TABLA
  const handleCargarDesdeTabla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setQuickErrorMsg(null);
    const direccionFinal = inlineDireccion.trim();
    if (!inlineNroIO.trim() || !direccionFinal) {
      setQuickErrorMsg('Debe ingresar el N° de I.O. y la Dirección / Lugar de Ocurrido.');
      return;
    }

    const currentNum = extractIoNumber(inlineNroIO);
    if (currentNum <= 0) {
      setQuickErrorMsg('El N° de I.O. debe incluir un número válido (ej. I.O. Nº 001/2026).');
      return;
    }

    const dup = findDuplicateIoCode(inlineNroIO, {
      inspecciones: listaConsolidada,
      anio: extractIoYear(inlineNroIO, añoActual),
    });
    if (dup) {
      setQuickErrorMsg(
        `El número ingresado repite una I.O. ya cargada (${dup}). Las Inspecciones Oculares son correlativas y no pueden repetirse.`
      );
      return;
    }

    const nuevaIO: InspeccionOcular = {
      id: 'io-' + Date.now(),
      nroIO: inlineNroIO.trim(),
      fecha: inlineFecha,
      hora: inlineHora,
      lugar: direccionFinal,
      direccion: direccionFinal,
      hecho: inlineHecho,
      tipo: inlineTipo,
      dependenciaSolicitante: inlineDependencia,
      expedienteVinculado: '',
      personalInterviniente: [
        inlinePerito ? `Perito: ${inlinePerito}` : '',
        inlineFotografo ? `Fotógrafo: ${inlineFotografo}` : ''
      ].filter(Boolean).join(' - ') || 'Personal Técnico Pericial',
      perito: inlinePerito,
      fotografo: inlineFotografo,
      cantidadFotografias: inlineCantidadFotos,
      fotosConformeFotografo: `${inlineCantidadFotos} tomas fotográficas conforme fotógrafo`,
      fotosConfirmadas: true,
      confirmadoPorUsuario: inlinePerito || currentUser?.apellidoYNombre || 'Oficial de Servicio',
      resumen: inlineResumen || `Relevamiento de Inspección Ocular en ${direccionFinal}.`,
      conclusiones: 'Actuación pericial registrada directamente desde tabla de novedades.',
      fotosAdjuntas: [],
      delegacionId: delegacionRestringidaId || (activeDelegacionId && activeDelegacionId !== 'todas' ? activeDelegacionId : undefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveInspeccion(nuevaIO);

    // Sincronizar contador tomando el último número cargado sin concatenar el año
    const nextNum = getNextIoNumber({
      inspecciones: [nuevaIO, ...listaConsolidada],
      config: { ...config, ultimoNroIO: Math.max(ultimoLoadedIO, currentNum) },
      anio: añoActual,
    });
    setInlineNroIO(formatNroIO(nextNum, añoActual));
    setInlineDireccion('');
    setInlineResumen('');
    setQuickSuccessMsg(`¡${nuevaIO.nroIO} cargada directamente en la tabla con éxito!`);
    setTimeout(() => setQuickSuccessMsg(null), 4000);
  };

  // INLINE ROW EDITING: Guardar edición de fila (sin repetir N° y actualizando al último cargado)
  const handleSaveInlineEdit = () => {
    if (!canEdit || !editingRowData) return;
    setQuickErrorMsg(null);
    const numEditado = extractIoNumber(editingRowData.nroIO);
    if (numEditado <= 0) {
      setQuickErrorMsg('El N° de I.O. editado debe contener un número correlativo válido.');
      return;
    }

    const dup = findDuplicateIoCode(editingRowData.nroIO, {
      inspecciones: listaConsolidada,
      anio: extractIoYear(editingRowData.nroIO, añoActual),
      excludeId: editingRowData.id,
      excludeIntervencionId: editingRowData.intervencionId,
    });
    if (dup) {
      setQuickErrorMsg(
        `No se puede guardar "${editingRowData.nroIO}" porque repite una Inspección Ocular existente (${dup}). Use otro número o "Último +1".`
      );
      return;
    }

    onSaveInspeccion(editingRowData);
    setEditingRowId(null);
    setEditingRowData(null);
    setQuickSuccessMsg('Registro actualizado directamente en la tabla y numerador sincronizado con el último cargado.');
    setTimeout(() => setQuickSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* PANEL SUPERIOR: CONTROL DEL NUMERADOR CON RESET DIRECTO A 1 */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-3.5 sm:px-5 rounded-xl shadow-md border border-blue-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <Hash className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">
                Control de Numerador de Inspecciones Oculares (I.O.)
              </span>
              <span className="bg-blue-600/50 text-blue-200 border border-blue-400/30 text-[10px] font-mono px-2 py-0.2 rounded font-bold">
                {config.siglasDependencia || 'DPC'} / {añoActual}
              </span>
            </div>
            <p className="text-[11px] text-blue-200 flex flex-wrap items-center gap-2 mt-0.5">
              <span>
                Próxima I.O. a emitir:{' '}
                <strong className="text-amber-300 font-mono font-bold">
                  {formatNroIO(proximoNroIO, añoActual)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Último cargado: <strong className="text-white font-mono">#{ultimoLoadedIO}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold">
                ✓ Correlativo sin repetidos (LC + Seg. Vial + Manuales)
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          {/* BOTÓN RESETEAR CONTADOR A 1 */}
          {onSaveConfig && canEdit && (
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3 py-1.5 bg-red-800/90 hover:bg-red-700 text-white border border-red-600/50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Resetear el numerador para que comience en 001"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-200" />
              <span>Resetear Contador a 1</span>
            </button>
          )}

          {onSaveConfig && canEdit && (
            <button
              onClick={() => setIsControlNumeradorOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Configurar y ajustar números de numeradores oficiales"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Ajustar Numerador</span>
            </button>
          )}

          <button
            onClick={() => generarPdfReporteInspeccionesOcularesPorTipo(listaConsolidada, config)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar Reporte Estadístico de I.O. en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* Notificación de éxito o error en operaciones rápidas */}
      {quickErrorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{quickErrorMsg}</span>
          </div>
          <button onClick={() => setQuickErrorMsg(null)} className="text-red-700 hover:text-red-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {quickSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{quickSuccessMsg}</span>
          </div>
          <button onClick={() => setQuickSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Principal con selectores de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inspecciones Oculares (I.O.)
            </h1>
            <span className="bg-blue-900 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs" title="Total de Inspecciones Oculares (LC + Seg. Vial)">
              Inspecciones Oculares: {cantidadTotalIO}
            </span>
            <span className="bg-blue-100 text-blue-950 border border-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1" title="Labor Criminalística (Hechos no de tránsito)">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-800" />
              <span>Intervenciones criminalísticas (LC): {cantidadLC}</span>
            </span>
            <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1" title="Seguridad Vial - Siniestros y Hechos Viales">
              <Car className="w-3.5 h-3.5 text-amber-800" />
              <span>Seguridad Vial (Seg. Vial): {cantidadSegVial}</span>
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
              {totalFotografias} fotografías
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Relevamiento discriminado por Delegación: Criminalística (LC), Seguridad Vial y total de actas con validación fotográfica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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

          {/* Selector de Estilo de Vista */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => setViewStyle('parte-novedades')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewStyle === 'parte-novedades'
                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="Formato Matriz Policial con carga de datos directa en tabla"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Estilo Parte de Novedades</span>
            </button>

            <button
              type="button"
              onClick={() => setViewStyle('cuadricula')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewStyle === 'cuadricula'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Tarjetas</span>
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setSelectedInspeccion(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva I.O. Detallada</span>
            </button>
          )}
        </div>
      </div>

      {mostrarStats && (
        <ModuleStatsPanel
          title="Estadísticas de Inspecciones Oculares (I.O.)"
          subtitle="Distribución pericial, tomas fotográficas y control de conformidad"
          kpis={ioStats.kpis}
          charts={ioStats.charts}
          onExportPdf={() => generarPdfReporteInspeccionesOcularesPorTipo(filteredList, config)}
          exportPdfLabel="Reporte Estadístico I.O. (PDF)"
          onClose={() => setMostrarStats(false)}
        />
      )}

      {/* Barra de Búsqueda y Filtros Colapsable por Campos del Formulario */}
      <CollapsibleFilterBar
        title="Búsqueda y Filtros de Inspecciones Oculares"
        activeFiltersCount={
          (searchTerm ? 1 : 0) +
          (filtroTipo !== 'todos' ? 1 : 0) +
          (fechaDesde ? 1 : 0) +
          (fechaHasta ? 1 : 0) +
          (filtroDependencia !== 'todas' ? 1 : 0) +
          (filtroOrigen !== 'todos' ? 1 : 0) +
          (filtroHecho.trim() ? 1 : 0) +
          (filtroGrupoGuardia !== 'todos' ? 1 : 0) +
          (filtroEstadoFotos !== 'todos' ? 1 : 0) +
          (soloPolicial ? 1 : 0)
        }
        onClear={() => {
          setSearchTerm('');
          setFiltroTipo('todos');
          setFechaDesde('');
          setFechaHasta('');
          setFiltroDependencia('todas');
          setFiltroOrigen('todos');
          setFiltroHecho('');
          setFiltroGrupoGuardia('todos');
          setFiltroEstadoFotos('todos');
          setSoloPolicial(false);
        }}
        summaryRight={
          <span className="text-[11px] text-slate-600 font-mono">
            Mostrando <strong>{filteredList.length}</strong> de {listaConsolidada.length}
          </span>
        }
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° I.O., dirección/lugar, hecho, perito, fotógrafo, expediente o dependencia..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg font-semibold text-xs text-slate-700"
            >
              <option value="todos">Todos los Orígenes ({listaConsolidada.length})</option>
              <option value="guardias">Intervenciones de Guardia ({listaConsolidada.filter(i => i.origenGuardia).length})</option>
              <option value="directas">Cargadas en Módulo ({listaConsolidada.filter(i => !i.origenGuardia).length})</option>
            </select>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-amber-50/70 rounded-lg text-xs font-bold text-amber-950 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soloPolicial}
                onChange={(e) => setSoloPolicial(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-700 rounded"
              />
              <span>Con Personal Policial</span>
            </label>
          </div>
        </div>

        {/* Filtros por campos del formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Criminalística">Criminalística</option>
              <option value="Accidentológica Vial">Accidentológica Vial</option>
              <option value="Balística">Balística</option>
              <option value="Incendio">Incendio</option>
              <option value="Homicidio">Homicidio</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Dependencia:</span>
            <select
              value={filtroDependencia}
              onChange={(e) => setFiltroDependencia(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            >
              <option value="todas">Todas las dependencias</option>
              {config.dependenciasPoliciales.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              value={filtroHecho}
              onChange={(e) => setFiltroHecho(e.target.value)}
              placeholder="Filtrar por Hecho / Tipificación..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Guardia:</span>
            <select
              value={filtroGrupoGuardia}
              onChange={(e) => setFiltroGrupoGuardia(e.target.value)}
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

          <div className="flex items-center gap-1.5 sm:col-span-2">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Estado Fotos:</span>
            <select
              value={filtroEstadoFotos}
              onChange={(e) => setFiltroEstadoFotos(e.target.value as any)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            >
              <option value="todos">Todas (Confirmadas y Pendientes)</option>
              <option value="confirmadas">Solo Fotos Confirmadas por Usuario</option>
              <option value="pendientes">Solo Pendientes de Confirmación</option>
            </select>
          </div>
        </div>
      </CollapsibleFilterBar>

      {/* CONTENIDO PRINCIPAL: VISTA ESTILO PARTE DE NOVEDADES VS CUADRÍCULA */}
      {viewStyle === 'parte-novedades' ? (
        <div className="bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden space-y-0">
          {/* TABLA PRINCIPAL DE INSPECCIONES OCULARES */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider border-b-2 border-slate-900">
                <tr>
                  <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap text-amber-300 font-bold">N° I.O.</th>
                  <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap">FECHA Y HORA</th>
                  <th className="border border-slate-600 px-3 py-2.5">DIRECCIÓN / LUGAR DE HECHO</th>
                  <th className="border border-slate-600 px-3 py-2.5">HECHO / MOTIVO</th>
                  <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap">TIPO</th>
                  <th className="border border-slate-600 px-3 py-2.5">DEPENDENCIA</th>
                  <th className="border border-slate-600 px-3 py-2.5">PERITO / FOTÓGRAFO</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-center">FOTOS / CONFORME</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 bg-white">
                      No se encontraron inspecciones oculares registradas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((io, idx) => {
                    const isEditingThis = editingRowId === io.id;

                    if (isEditingThis && editingRowData) {
                      return (
                        <tr key={io.id} className="bg-amber-100/60 border-2 border-amber-500">
                          {/* N° I.O. */}
                          <td className="border border-slate-300 p-2 space-y-1">
                            <input
                              type="text"
                              value={editingRowData.nroIO}
                              onChange={(e) => setEditingRowData({ ...editingRowData, nroIO: e.target.value })}
                              className="w-32 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditingRowData({
                                  ...editingRowData,
                                  nroIO: formatNroIO(
                                    getNextIoNumber({
                                      inspecciones: listaConsolidada,
                                      config,
                                      anio: extractIoYear(editingRowData.nroIO, añoActual),
                                      excludeId: editingRowData.id,
                                      excludeIntervencionId: editingRowData.intervencionId,
                                    }),
                                    extractIoYear(editingRowData.nroIO, añoActual)
                                  ),
                                })
                              }
                              className="block text-[10px] font-bold text-blue-800 hover:underline cursor-pointer"
                            >
                              Tomar último (+1)
                            </button>
                          </td>
                          {/* Fecha / Hora */}
                          <td className="border border-slate-300 p-2 whitespace-nowrap">
                            <input
                              type="date"
                              value={editingRowData.fecha}
                              onChange={(e) => setEditingRowData({ ...editingRowData, fecha: e.target.value })}
                              className="w-28 px-1 py-1 bg-white border border-slate-300 rounded text-xs block mb-1"
                            />
                            <input
                              type="text"
                              value={editingRowData.hora}
                              onChange={(e) => setEditingRowData({ ...editingRowData, hora: e.target.value })}
                              placeholder="10:00"
                              className="w-16 px-1 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </td>
                          {/* Dirección */}
                          <td className="border border-slate-300 p-2">
                            <input
                              type="text"
                              value={editingRowData.direccion || editingRowData.lugar}
                              onChange={(e) => setEditingRowData({
                                ...editingRowData,
                                direccion: e.target.value,
                                lugar: e.target.value,
                              })}
                              className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </td>
                          {/* Hecho */}
                          <td className="border border-slate-300 p-2">
                            <input
                              type="text"
                              value={editingRowData.hecho || ''}
                              onChange={(e) => setEditingRowData({ ...editingRowData, hecho: e.target.value })}
                              className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-blue-900"
                            />
                          </td>
                          {/* Tipo */}
                          <td className="border border-slate-300 p-2">
                            <select
                              value={editingRowData.tipo}
                              onChange={(e) => setEditingRowData({ ...editingRowData, tipo: e.target.value })}
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs"
                            >
                              <option value="Criminalística">Criminalística</option>
                              <option value="Accidentológica Vial">Accidentológica Vial</option>
                              <option value="Balística">Balística</option>
                              <option value="Incendio">Incendio</option>
                              <option value="Homicidio">Homicidio</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </td>
                          {/* Dependencia */}
                          <td className="border border-slate-300 p-2">
                            <select
                              value={editingRowData.dependenciaSolicitante}
                              onChange={(e) => setEditingRowData({ ...editingRowData, dependenciaSolicitante: e.target.value })}
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs"
                            >
                              {config.dependenciasPoliciales.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                          {/* Perito / Fotógrafo con autocompletado de guardia y general */}
                          <td className="border border-slate-300 p-2 space-y-1">
                            <input
                              type="text"
                              list="datalist-peritos-inspecciones"
                              value={editingRowData.perito || ''}
                              onChange={(e) => setEditingRowData({ ...editingRowData, perito: e.target.value })}
                              placeholder="Perito (Guardia / Gral)"
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                            <input
                              type="text"
                              list="datalist-fotografos-inspecciones"
                              value={editingRowData.fotografo || ''}
                              onChange={(e) => setEditingRowData({ ...editingRowData, fotografo: e.target.value })}
                              placeholder="Fotógrafo (Guardia / Gral)"
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                            <datalist id="datalist-peritos-inspecciones">
                              {opcionesPersonalGuardia.map((nom) => (
                                <option key={'p-' + nom} value={nom} />
                              ))}
                            </datalist>
                            <datalist id="datalist-fotografos-inspecciones">
                              {opcionesPersonalGuardia.map((nom) => (
                                <option key={'f-' + nom} value={nom} />
                              ))}
                            </datalist>
                          </td>
                          {/* Fotos */}
                          <td className="border border-slate-300 p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={editingRowData.cantidadFotografias || 0}
                              onChange={(e) => setEditingRowData({ ...editingRowData, cantidadFotografias: parseInt(e.target.value) || 0 })}
                              className="w-16 px-1 py-1 bg-white border border-slate-300 rounded text-xs text-center font-bold"
                            />
                          </td>
                          {/* Guardar / Cancelar */}
                          <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveInlineEdit}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Guardar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRowId(null);
                                  setEditingRowData(null);
                                }}
                                className="px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const sinConfirmar = !io.fotosConfirmadas && !io.confirmadoPorUsuario;

                    return (
                      <tr
                        key={io.id}
                        className={`transition-colors ${
                          sinConfirmar
                            ? 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60'
                            : idx % 2 === 0
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50/60 hover:bg-slate-100/60'
                        }`}
                      >
                        {/* N° I.O. */}
                        <td className="border border-slate-300 px-3 py-2 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-950 bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded text-xs">
                              {io.nroIO}
                            </span>
                            {io.origenGuardia && (
                              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-indigo-300" title="Intervención originada automáticamente desde Libro de Guardia">
                                Guardia
                              </span>
                            )}
                          </div>
                          {io.expedienteVinculado && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[140px]">
                              Exp: {io.expedienteVinculado}
                            </div>
                          )}
                        </td>

                        {/* Fecha y Hora */}
                        <td className="border border-slate-300 px-3 py-2 font-mono whitespace-nowrap text-slate-700">
                          <div className="font-bold text-slate-900">{io.fecha}</div>
                          <div className="text-[10px] text-slate-500">{io.hora ? `${io.hora} hs` : '10:00 hs'}</div>
                        </td>

                        {/* Dirección / Lugar */}
                        <td className="border border-slate-300 px-3 py-2">
                          <div className="font-semibold text-slate-900 flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{io.direccion || io.lugar}</span>
                          </div>
                          {io.resumen && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                              {io.resumen}
                            </div>
                          )}
                        </td>

                        {/* Hecho / Motivo */}
                        <td className="border border-slate-300 px-3 py-2">
                          <div className="font-bold text-blue-950 line-clamp-2">
                            {io.hecho || 'Inspección Ocular Pericial'}
                          </div>
                          {io.involucraPersonalPolicial && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                <span>👮 Pers. Policial: {io.personalPolicial?.jerarquia} {io.personalPolicial?.apellidoYNombre} (Plaza {io.personalPolicial?.plaza})</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tipo */}
                        <td className="border border-slate-300 px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                            io.tipo === 'Criminalística'
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : io.tipo === 'Accidentológica Vial'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {io.tipo}
                          </span>
                        </td>

                        {/* Dependencia */}
                        <td className="border border-slate-300 px-3 py-2 font-medium text-slate-800">
                          {io.dependenciaSolicitante}
                        </td>

                        {/* Perito / Fotógrafo */}
                        <td className="border border-slate-300 px-3 py-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-bold">P: </span>
                            <span className="font-semibold text-slate-800">{io.perito || 'A designar'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">F: </span>
                            <span className="text-slate-700">{io.fotografo || 'A designar'}</span>
                          </div>
                        </td>

                        {/* Fotos / Estado Conforme (Clickeable para validar por usuarios con permiso) */}
                        <td className={`border border-slate-300 px-3 py-2 text-center whitespace-nowrap ${sinConfirmar ? 'bg-amber-100/50' : ''}`}>
                          <div className="font-bold text-slate-900 font-mono">
                            {io.cantidadFotografias || 0} tomas
                          </div>
                          <div className="mt-1">
                            {(() => {
                              const puedeValidarFotos =
                                canEdit &&
                                Boolean(
                                  currentUser?.rol === 'superusuario' ||
                                    currentUser?.puedeConfirmarFotografias
                                );
                              if (io.fotosConfirmadas || io.confirmadoPorUsuario) {
                                return puedeValidarFotos ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleValidarFotos(io)}
                                    className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400 cursor-pointer transition-colors shadow-2xs"
                                    title={`Confirmado por: ${io.confirmadoPorUsuario || 'Oficial'}. Haga clic para alternar si cuenta con permiso.`}
                                  >
                                    <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                                    <span>Confirmado</span>
                                  </button>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400 shadow-2xs"
                                    title={`Confirmado por: ${io.confirmadoPorUsuario || 'Oficial'}`}
                                  >
                                    <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                                    <span>Confirmado</span>
                                  </span>
                                );
                              }
                              return puedeValidarFotos ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleValidarFotos(io)}
                                  className="inline-flex items-center gap-1 bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400 cursor-pointer transition-colors shadow-2xs animate-pulse"
                                  title="Fotos pendientes de validación oficial. Haga clic para confirmar (requiere permiso)."
                                >
                                  <span>Pendiente</span>
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 bg-amber-200 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400 shadow-2xs"
                                  title="Fotos pendientes de validación oficial"
                                >
                                  <span>Pendiente</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="border border-slate-300 px-3 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {io.fotosAdjuntas && io.fotosAdjuntas.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewGallery({
                                    isOpen: true,
                                    files: (io.fotosAdjuntas || []).map((url, idx) => ({
                                      id: `${io.id}-foto-${idx}`,
                                      nombre: `${io.nroIO || 'I.O.'} — Toma ${idx + 1}`,
                                      dataUrl: url,
                                    })),
                                    index: 0,
                                  })
                                }
                                className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                title={`Vista preliminar con zoom (${io.fotosAdjuntas.length} fotos)`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => generarPdfInspeccionOcular(io, config)}
                              className="p-1 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded cursor-pointer"
                              title="Descargar Acta I.O. en PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRowId(io.id);
                                    setEditingRowData({ ...io });
                                  }}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Editar directamente en la tabla"
                                >
                                  Editar en fila
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedInspeccion(io);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Editar con formulario completo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => setDeleteIoConfirm({ isOpen: true, io })}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                title="Eliminar"
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
        </div>
      ) : (
        /* VISTA ESTILO 2: CUADRÍCULA DE TARJETAS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((io) => (
            <div
              key={io.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 font-mono font-bold text-xs px-2 py-0.5 rounded">
                      {io.nroIO}
                    </span>
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {io.tipo}
                    </span>
                    {io.origenGuardia && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                        Intervención de Guardia
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => generarPdfInspeccionOcular(io, config)}
                      className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded cursor-pointer"
                      title="Descargar Acta en PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setSelectedInspeccion(io);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                        title="Editar Inspección"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteIoConfirm({ isOpen: true, io })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong className="text-slate-800">Fecha:</strong> {io.fecha} {io.hora ? `• ${io.hora} hs` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">
                      {io.cantidadFotografias || 0} Fotos
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      <strong className="text-slate-800">Dirección:</strong> {io.direccion || io.lugar}
                    </span>
                  </div>
                  {io.hecho && (
                    <div className="flex flex-col gap-1 col-span-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                        <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate">
                          Hecho: {io.hecho}
                        </span>
                      </div>
                      {io.involucraPersonalPolicial && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>👮 Personal Policial: {io.personalPolicial?.jerarquia} {io.personalPolicial?.apellidoYNombre} (Plaza {io.personalPolicial?.plaza})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Perito y Fotógrafo */}
                  <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-bold block">Perito:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {io.perito || (io.personalInterviniente ? io.personalInterviniente.split('-')[0] : 'No asignado')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Fotógrafo:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {io.fotografo || (io.personalInterviniente && io.personalInterviniente.includes('-') ? io.personalInterviniente.split('-')[1] : 'No asignado')}
                      </span>
                    </div>
                  </div>

                  {/* Fotos Conforme Fotógrafo y Confirmación */}
                  <div className="col-span-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-bold text-slate-800 block">Fotos (Conforme Fotógrafo):</span>
                      <span className="text-slate-600 truncate block">
                        {io.fotosConformeFotografo || `${io.cantidadFotografias || 0} tomas fotográficas`}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      {io.fotosConfirmadas || io.confirmadoPorUsuario ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Confirmado: {io.confirmadoPorUsuario || 'Supervisor'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          ⏳ Pendiente de Confirmar
                        </span>
                      )}
                    </div>
                  </div>

                  {io.expedienteVinculado && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">Exp: {io.expedienteVinculado}</span>
                    </div>
                  )}
                </div>

                {io.resumen && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
                    <p className="font-semibold text-slate-800 mb-0.5">Resumen de Escena:</p>
                    <p className="line-clamp-2">{io.resumen}</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Registrado: {io.createdAt?.slice(0, 10)}
                </span>
                <div className="flex items-center gap-1.5">
                  {io.fotosAdjuntas && io.fotosAdjuntas.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewGallery({
                          isOpen: true,
                          files: (io.fotosAdjuntas || []).map((url, idx) => ({
                            id: `${io.id}-foto-${idx}`,
                            nombre: `${io.nroIO || 'I.O.'} — Toma ${idx + 1}`,
                            dataUrl: url,
                          })),
                          index: 0,
                        })
                      }
                      className="px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Fotos ({io.fotosAdjuntas.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => generarPdfInspeccionOcular(io, config)}
                    className="px-3 py-1 bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-900 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Imprimir Acta I.O.</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal I.O. Completo */}
      {isModalOpen && (
        <InspeccionModal
          inspeccion={selectedInspeccion}
          existingInspecciones={listaConsolidada}
          personalList={personalList}
          partesGuardiaList={partesGuardiaList}
          delegacionesList={delegacionesList}
          gruposList={gruposList}
          activeDelegacionId={activeDelegacionId}
          currentUser={currentUser}
          config={config}
          onSave={(data) => {
            onSaveInspeccion(data);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal Control de Numerador Oficial */}
      {isControlNumeradorOpen && onSaveConfig && (
        <ControlNumeradorModal
          config={config}
          onSaveConfig={(updatedCfg) => {
            onSaveConfig(updatedCfg);
            setIsControlNumeradorOpen(false);
          }}
          onClose={() => setIsControlNumeradorOpen(false)}
        />
      )}

      {/* Modal Confirmación Resetear Contador a 1 */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Resetear Contador de Inspecciones Oculares"
        message={`¿Confirma reiniciar el contador de Inspecciones Oculares (I.O.) para que la próxima acta comience desde el N° 001/${añoActual}?`}
        confirmLabel="Sí, Reiniciar a N° 001"
        isDestructive={false}
        onConfirm={handleConfirmResetContador}
        onClose={() => setIsResetModalOpen(false)}
      />

      {/* Visor Preliminar con Zoom */}
      <FilePreviewModal
        isOpen={previewGallery.isOpen}
        file={previewGallery.files[previewGallery.index] || null}
        files={previewGallery.files}
        initialIndex={previewGallery.index}
        onClose={() => setPreviewGallery({ isOpen: false, files: [], index: 0 })}
      />

      {/* Modal Confirmación Eliminar Inspección Ocular */}
      <ConfirmModal
        isOpen={deleteIoConfirm.isOpen}
        title="Eliminar Inspección Ocular"
        message={`¿Confirma eliminar definitivamente la inspección ocular ${deleteIoConfirm.io?.nroIO || ''} (${deleteIoConfirm.io?.tipo || ''} del ${deleteIoConfirm.io?.fecha || ''})?`}
        confirmLabel="Eliminar Inspección"
        isDestructive={true}
        onConfirm={() => {
          if (deleteIoConfirm.io) {
            onDeleteInspeccion(deleteIoConfirm.io.id);
          }
        }}
        onClose={() => setDeleteIoConfirm({ isOpen: false, io: null })}
      />
    </div>
  );
};

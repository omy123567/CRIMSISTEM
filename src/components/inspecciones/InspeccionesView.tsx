import React, { useState, useMemo } from 'react';
import {
  InspeccionOcular,
  ParteNovedadesGuardia,
  Personal,
  ConfiguracionSistema,
  IntervencionParte,
  UsuarioSistema,
} from '../../types/police';
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
} from 'lucide-react';
import { InspeccionModal } from './InspeccionModal';
import { ControlNumeradorModal } from '../guardias/ControlNumeradorModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { generarPdfInspeccionOcular, generarPdfReporteInspeccionesOcularesPorTipo } from '../../services/pdfService';

interface InspeccionesViewProps {
  inspeccionesList: InspeccionOcular[];
  partesGuardiaList?: ParteNovedadesGuardia[];
  personalList?: Personal[];
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
  personalList = [],
  config,
  currentUser,
  onSaveInspeccion,
  onDeleteInspeccion,
  onSaveConfig,
  onNavigateToGuardias,
}) => {
  const añoActual = useMemo(() => new Date().getFullYear(), []);

  // Estilo de visualización: 'parte-novedades' (Matriz Policial Oficial) o 'cuadricula' (Tarjetas)
  const [viewStyle, setViewStyle] = useState<'parte-novedades' | 'cuadricula'>('parte-novedades');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | 'guardias' | 'directas'>('todos');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isControlNumeradorOpen, setIsControlNumeradorOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState<InspeccionOcular | null>(null);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<string | null>(null);
  const [deleteIoConfirm, setDeleteIoConfirm] = useState<{
    isOpen: boolean;
    io: InspeccionOcular | null;
  }>({ isOpen: false, io: null });

  // Mensaje de éxito tras carga o edición rápida en tabla
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);

  // Contador de I.O. correlativo comenzando en 1
  const proximoNroIO = useMemo(() => {
    const inicio = config.inicioNroIO || 1;
    const ultimo = config.ultimoNroIO ?? 0;
    return Math.max(inicio, ultimo + 1);
  }, [config.inicioNroIO, config.ultimoNroIO]);

  // Formulario de carga rápida directo desde la tabla
  const [inlineNroIO, setInlineNroIO] = useState<string>(() => `I.O. Nº ${String(proximoNroIO).padStart(3, '0')}/${añoActual}`);
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
    setInlineNroIO(`I.O. Nº ${String(proximoNroIO).padStart(3, '0')}/${añoActual}`);
  }, [proximoNroIO, añoActual]);

  // Edición directa en fila de tabla (Inline Row Editing)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<InspeccionOcular | null>(null);

  // 1. SINCRONIZACIÓN AUTOMÁTICA DE INTERVENCIONES DE GUARDIAS:
  // "pese a tener 4 intervenciones cargadas, siguen sin aparecer en 'Inspecciones Oculares' quiero que sea de forma automática"
  const listaConsolidada = useMemo(() => {
    const mapExisting = new Map<string, InspeccionOcular>();

    // Primero agregamos todas las inspecciones cargadas en la BD de Inspecciones
    inspeccionesList.forEach((io) => {
      mapExisting.set(io.id, io);
      if (io.intervencionId) {
        mapExisting.set(io.intervencionId, io);
      }
    });

    // Luego recolectamos automáticamente TODAS las intervenciones de los partes de guardia
    let autoIndex = inspeccionesList.length;
    partesGuardiaList.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        if (!mapExisting.has(interv.id)) {
          autoIndex += 1;
          const direccion = interv.direccion || interv.inspeccionLugar || 'Lugar s/ consignar';
          const perito = interv.perito || interv.personalTecnico?.peritoAuxiliar || '';
          const fotografo = interv.fotografo || interv.personalTecnico?.choferFotografo || '';
          const personal = [
            perito ? `Perito: ${perito}` : '',
            fotografo ? `Fotógrafo: ${fotografo}` : '',
            interv.personalTecnico?.auxiliar ? `Auxiliar: ${interv.personalTecnico.auxiliar}` : ''
          ].filter(Boolean).join(' - ') || 'Personal Técnico de Guardia';

          // Asignar número I.O. si no viene asignado expresamente
          const nroIOAuto = interv.nroIO || `I.O. Nº ${String(autoIndex).padStart(3, '0')}/${añoActual}`;

          const ioFromInterv: InspeccionOcular = {
            id: interv.id,
            nroIO: nroIOAuto,
            fecha: interv.inspeccionFecha || parte.fechaInicio || new Date().toISOString().slice(0, 10),
            hora: interv.inspeccionHora || interv.solicitudHora?.replace(' hs.', '') || parte.horaInicio || '08:00',
            lugar: direccion,
            direccion: direccion,
            hecho: interv.hecho || 'Intervención Policial de Guardia',
            tipo: interv.tipoIntervencion === 'Accidentológica' ? 'Accidentológica Vial' : 'Criminalística',
            dependenciaSolicitante: interv.dependencia || parte.dependencia || config.dependencia || 'Comisaría de Turno',
            expedienteVinculado: interv.referencia || interv.codigoIntervencion || '',
            personalInterviniente: personal,
            perito: perito,
            fotografo: fotografo,
            cantidadFotografias: interv.vehiculosSiniestro?.length ? 14 : 8,
            fotosConformeFotografo: interv.fotosConformeFotografo ? 'Conforme relevamiento del fotógrafo' : 'Relevamiento fotográfico digital',
            fotosConfirmadas: Boolean(interv.fotosConfirmadas),
            confirmadoPorUsuario: interv.confirmadoPorUsuario || '',
            resumen: interv.sintesisHecho || `Intervención en guardia registrada con ${interv.involucrados?.length || 0} demorado/s y ${interv.testigos?.length || 0} testigo/s.`,
            conclusiones: interv.laborCriminalistica || '',
            fotosAdjuntas: [],
            origenGuardia: true,
            intervencionId: interv.id,
            createdAt: interv.createdAt || new Date().toISOString(),
            updatedAt: interv.createdAt || new Date().toISOString(),
          };

          mapExisting.set(interv.id, ioFromInterv);
        }
      });
    });

    return Array.from(mapExisting.values()).sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return b.nroIO.localeCompare(a.nroIO);
    });
  }, [inspeccionesList, partesGuardiaList, añoActual, config.dependencia]);

  // Filtros reactivos con búsqueda por fecha, tipo, personal, lugar, contenido
  const filteredList = useMemo(() => {
    return listaConsolidada.filter((io) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        io.nroIO.toLowerCase().includes(term) ||
        (io.direccion && io.direccion.toLowerCase().includes(term)) ||
        io.lugar.toLowerCase().includes(term) ||
        (io.hecho && io.hecho.toLowerCase().includes(term)) ||
        io.resumen.toLowerCase().includes(term) ||
        io.personalInterviniente.toLowerCase().includes(term) ||
        (io.perito && io.perito.toLowerCase().includes(term)) ||
        (io.fotografo && io.fotografo.toLowerCase().includes(term)) ||
        io.dependenciaSolicitante.toLowerCase().includes(term) ||
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

      return matchSearch && matchTipo && matchFecha && matchDep && matchOrig;
    });
  }, [listaConsolidada, searchTerm, filtroTipo, fechaDesde, fechaHasta, filtroDependencia, filtroOrigen]);

  const totalFotografias = useMemo(() => {
    return listaConsolidada.reduce((acc, io) => acc + (io.cantidadFotografias || 0), 0);
  }, [listaConsolidada]);

  const totalIntervencionesGuardia = useMemo(() => {
    return partesGuardiaList.reduce((acc, p) => acc + (p.intervenciones?.length || 0), 0);
  }, [partesGuardiaList]);

  // Cantidad de Intervenciones Criminalísticas (LC)
  const cantidadLC = useMemo(() => {
    return listaConsolidada.filter(
      (io) =>
        io.tipo.toLowerCase().includes('criminalística') ||
        io.tipo.toLowerCase().includes('lc') ||
        (!io.tipo.toLowerCase().includes('accid') && !io.tipo.toLowerCase().includes('vial'))
    ).length;
  }, [listaConsolidada]);

  // Cantidad de Seguridad Vial (Seg. Vial) - Siniestros y Hechos Viales
  const cantidadSegVial = useMemo(() => {
    return listaConsolidada.filter(
      (io) =>
        io.tipo.toLowerCase().includes('accid') ||
        io.tipo.toLowerCase().includes('vial') ||
        io.tipo.toLowerCase().includes('siniestro')
    ).length;
  }, [listaConsolidada]);

  // Total de Inspecciones Oculares = LC + Seg. Vial
  const cantidadTotalIO = cantidadLC + cantidadSegVial;

  // Handler para validar/confirmar cantidad de fotos al hacer clic sobre el estado
  const handleToggleValidarFotos = (io: InspeccionOcular) => {
    const puedeValidar = Boolean(
      currentUser?.rol === 'superusuario' || currentUser?.puedeConfirmarFotografias
    );

    if (!puedeValidar) {
      alert(
        'Acceso restringido: Se requiere el permiso especial "Confirmar Fotografías" o rol de Superusuario para validar o modificar el estado de fotografías.'
      );
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
    const direccionFinal = inlineDireccion.trim();
    if (!inlineNroIO.trim() || !direccionFinal) {
      alert('Debe ingresar el N° de I.O. y la Dirección / Lugar de Ocurrido.');
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
      confirmadoPorUsuario: inlinePerito || 'Oficial de Servicio',
      resumen: inlineResumen || `Relevamiento de Inspección Ocular en ${direccionFinal}.`,
      conclusiones: 'Actuación pericial registrada directamente desde tabla de novedades.',
      fotosAdjuntas: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveInspeccion(nuevaIO);

    // Incrementar contador en config
    const currentNum = parseInt(inlineNroIO.replace(/\D/g, '')) || proximoNroIO;
    if (onSaveConfig) {
      onSaveConfig({
        ...config,
        ultimoNroIO: Math.max(config.ultimoNroIO ?? 0, currentNum),
      });
    }

    // Resetear formulario para siguiente entrada
    const nextNum = currentNum + 1;
    setInlineNroIO(`I.O. Nº ${String(nextNum).padStart(3, '0')}/${añoActual}`);
    setInlineDireccion('');
    setInlineResumen('');
    setQuickSuccessMsg(`¡${nuevaIO.nroIO} cargada directamente en la tabla con éxito!`);
    setTimeout(() => setQuickSuccessMsg(null), 4000);
  };

  // INLINE ROW EDITING: Guardar edición de fila
  const handleSaveInlineEdit = () => {
    if (!editingRowData) return;
    onSaveInspeccion(editingRowData);
    setEditingRowId(null);
    setEditingRowData(null);
    setQuickSuccessMsg('Registro actualizado directamente en la tabla.');
    setTimeout(() => setQuickSuccessMsg(null), 3000);
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
                  I.O. Nº {String(proximoNroIO).padStart(3, '0')}/{añoActual}
                </strong>
              </span>
              <span>•</span>
              <span>
                Último N°: <strong className="text-white font-mono">#{config.ultimoNroIO ?? 0}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold">
                ✓ Comienza desde el 1
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          {/* BOTÓN RESETEAR CONTADOR A 1 */}
          {onSaveConfig && (
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3 py-1.5 bg-red-800/90 hover:bg-red-700 text-white border border-red-600/50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Resetear el numerador para que comience en 001"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-200" />
              <span>Resetear Contador a 1</span>
            </button>
          )}

          {onSaveConfig && (
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

      {/* Notificación de éxito en operaciones rápidas */}
      {quickSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{quickSuccessMsg}</span>
          </div>
          <button onClick={() => setQuickSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
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
          {/* Selector de Estilo de Vista */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => setViewStyle('parte-novedades')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-all cursor-pointer ${
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

          <button
            onClick={() => {
              setSelectedInspeccion(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva I.O. Detallada</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda Avanzada */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° I.O., dirección/lugar de hecho, hecho, perito, fotógrafo o dependencia..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg font-semibold text-xs text-slate-700"
            >
              <option value="todos">Todos los Orígenes ({listaConsolidada.length})</option>
              <option value="guardias">Intervenciones de Guardia ({listaConsolidada.filter(i => i.origenGuardia).length})</option>
              <option value="directas">Cargadas en Módulo ({listaConsolidada.filter(i => !i.origenGuardia).length})</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroTipo('todos');
                setFechaDesde('');
                setFechaHasta('');
                setFiltroDependencia('todas');
                setFiltroOrigen('todos');
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-medium whitespace-nowrap cursor-pointer"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Filtros secundarios: Rango de fecha, tipo y dependencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
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
              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-700"
            >
              <option value="todas">Todas las dependencias</option>
              {config.dependenciasPoliciales.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: VISTA ESTILO PARTE DE NOVEDADES VS CUADRÍCULA */}
      {viewStyle === 'parte-novedades' ? (
        <div className="bg-white rounded-xl border border-slate-300 shadow-md overflow-hidden space-y-0">
          {/* FORMULARIO DE CARGA DIRECTA DESDE LA TABLA */}
          <form onSubmit={handleCargarDesdeTabla} className="bg-amber-50/70 border-b-2 border-amber-300 p-3 sm:p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-700" />
                <span>Cargar Nueva Inspección Ocular Directo en la Tabla</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                Próximo correlativo automático
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {/* N° I.O. */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">N° I.O. *</label>
                <input
                  type="text"
                  required
                  value={inlineNroIO}
                  onChange={(e) => setInlineNroIO(e.target.value)}
                  placeholder="I.O. Nº 001/2026"
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded font-mono font-bold text-slate-900 text-xs"
                />
              </div>

              {/* Fecha */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fecha *</label>
                <input
                  type="date"
                  required
                  value={inlineFecha}
                  onChange={(e) => setInlineFecha(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs"
                />
              </div>

              {/* Hora */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Hora</label>
                <input
                  type="text"
                  value={inlineHora}
                  onChange={(e) => setInlineHora(e.target.value)}
                  placeholder="10:00"
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs"
                />
              </div>

              {/* Dirección / Lugar */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Dirección / Lugar de Hecho *</label>
                <input
                  type="text"
                  required
                  value={inlineDireccion}
                  onChange={(e) => setInlineDireccion(e.target.value)}
                  placeholder="Ej. Av. Gutnisky esquina Antártida Argentina"
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs font-medium"
                />
              </div>

              {/* Hecho */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Hecho / Motivo</label>
                <select
                  value={inlineHecho}
                  onChange={(e) => setInlineHecho(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                >
                  {config.hechosCriminalistica.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Tipo Pericial</label>
                <select
                  value={inlineTipo}
                  onChange={(e) => setInlineTipo(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs"
                >
                  <option value="Criminalística">Criminalística</option>
                  <option value="Accidentológica Vial">Accidentológica Vial</option>
                  <option value="Balística">Balística</option>
                  <option value="Incendio">Incendio</option>
                  <option value="Homicidio">Homicidio</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Dependencia */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Dependencia Solicitante</label>
                <select
                  value={inlineDependencia}
                  onChange={(e) => setInlineDependencia(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                >
                  {config.dependenciasPoliciales.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Perito */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Perito Interviniente</label>
                <select
                  value={inlinePerito}
                  onChange={(e) => setInlinePerito(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                >
                  <option value="">-- Seleccionar Perito --</option>
                  {personalList.map((p) => (
                    <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`}>
                      {p.jerarquia} {p.apellidoYNombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fotógrafo */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fotógrafo de Turno</label>
                <select
                  value={inlineFotografo}
                  onChange={(e) => setInlineFotografo(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                >
                  <option value="">-- Seleccionar Fotógrafo --</option>
                  {personalList.map((p) => (
                    <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`}>
                      {p.jerarquia} {p.apellidoYNombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fotos y Botón Cargar */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-2">
                <div className="w-24 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fotos Cant.</label>
                  <input
                    type="number"
                    min="0"
                    value={inlineCantidadFotos}
                    onChange={(e) => setInlineCantidadFotos(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs font-mono font-bold text-center"
                  />
                </div>

                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow-sm text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>+ Cargar a Tabla</span>
                </button>
              </div>
            </div>
          </form>

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
                          <td className="border border-slate-300 p-2">
                            <input
                              type="text"
                              value={editingRowData.nroIO}
                              onChange={(e) => setEditingRowData({ ...editingRowData, nroIO: e.target.value })}
                              className="w-28 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                            />
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
                          {/* Perito / Fotógrafo */}
                          <td className="border border-slate-300 p-2 space-y-1">
                            <input
                              type="text"
                              value={editingRowData.perito || ''}
                              onChange={(e) => setEditingRowData({ ...editingRowData, perito: e.target.value })}
                              placeholder="Perito"
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
                            <input
                              type="text"
                              value={editingRowData.fotografo || ''}
                              onChange={(e) => setEditingRowData({ ...editingRowData, fotografo: e.target.value })}
                              placeholder="Fotógrafo"
                              className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px]"
                            />
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
                            {io.fotosConfirmadas || io.confirmadoPorUsuario ? (
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
                              <button
                                type="button"
                                onClick={() => handleToggleValidarFotos(io)}
                                className="inline-flex items-center gap-1 bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400 cursor-pointer transition-colors shadow-2xs animate-pulse"
                                title="Fotos pendientes de validación oficial. Haga clic para confirmar (requiere permiso)."
                              >
                                <span>Pendiente</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="border border-slate-300 px-3 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => generarPdfInspeccionOcular(io, config)}
                              className="p-1 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded cursor-pointer"
                              title="Descargar Acta I.O. en PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

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

                            <button
                              onClick={() => setDeleteIoConfirm({ isOpen: true, io })}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              title="Eliminar"
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
                    <button
                      onClick={() => setDeleteIoConfirm({ isOpen: true, io })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
                <button
                  onClick={() => generarPdfInspeccionOcular(io, config)}
                  className="px-3 py-1 bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-900 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Imprimir Acta I.O.</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal I.O. Completo */}
      {isModalOpen && (
        <InspeccionModal
          inspeccion={selectedInspeccion}
          personalList={personalList}
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

      {/* Zoom de foto */}
      {selectedPhotoZoom && (
        <div
          onClick={() => setSelectedPhotoZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <img
            src={selectedPhotoZoom}
            alt="Evidencia Ampliada"
            className="max-w-4xl max-h-[85vh] rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

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

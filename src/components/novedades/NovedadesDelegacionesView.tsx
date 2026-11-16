import React, { useState, useMemo } from 'react';
import {
  AvisoNovedad,
  PrioridadNovedad,
  DelegacionPolicial,
  UsuarioSistema,
  Personal,
  ConfiguracionSistema,
} from '../../types/police';
import {
  Bell,
  Send,
  AlertTriangle,
  Info,
  Flame,
  CheckCircle2,
  Trash2,
  UserCheck,
  Building2,
  Calendar,
  Filter,
  Search,
  ArrowRight,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TrasladarPersonalModal } from '../personnel/TrasladarPersonalModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface NovedadesDelegacionesViewProps {
  novedadesList: AvisoNovedad[];
  delegacionesList: DelegacionPolicial[];
  personalList: Personal[];
  currentUser?: UsuarioSistema;
  activeDelegacionId: string;
  config: ConfiguracionSistema;
  onCrearNovedad: (novedad: Omit<AvisoNovedad, 'id' | 'createdAt'>) => Promise<void> | void;
  onMarcarLeido?: (id: string) => Promise<void> | void;
  onEliminarNovedad?: (id: string) => Promise<void> | void;
  onTransferirPersonal?: (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string
  ) => Promise<void> | void;
}

export const NovedadesDelegacionesView: React.FC<NovedadesDelegacionesViewProps> = ({
  novedadesList,
  delegacionesList,
  personalList,
  currentUser,
  activeDelegacionId,
  config,
  onCrearNovedad,
  onMarcarLeido,
  onEliminarNovedad,
  onTransferirPersonal,
}) => {
  // Formulario único según requerimiento estricto:
  // "únicamente debe tener: Mensaje, a quien ira dirigido (Delegacion) o a todos. Prioridad."
  const [mensaje, setMensaje] = useState('');
  const [destinoDelegacionId, setDestinoDelegacionId] = useState<string>('TODAS');
  const [prioridad, setPrioridad] = useState<PrioridadNovedad>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros de visualización
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal para traslado de personal
  const [isTrasladoModalOpen, setIsTrasladoModalOpen] = useState(false);
  const [personalParaTraslado, setPersonalParaTraslado] = useState<Personal | null>(null);

  // Confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  const delegacionActual =
    delegacionesList.find((d) => d.id === (currentUser?.delegacionId || activeDelegacionId)) ||
    delegacionesList[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    setIsSubmitting(true);
    try {
      const destinoObj = delegacionesList.find((d) => d.id === destinoDelegacionId);
      const destinoNombre =
        destinoDelegacionId === 'TODAS'
          ? 'Todas las Delegaciones'
          : destinoObj?.nombre || 'Delegación Seleccionada';

      await onCrearNovedad({
        mensaje: mensaje.trim(),
        origenDelegacionId: delegacionActual?.id || 'del-laguna-blanca',
        origenDelegacionNombre: delegacionActual?.nombre || config.dependencia,
        destinatarioDelegacionId: destinoDelegacionId,
        destinoDelegacionId,
        destinoDelegacionNombre: destinoNombre,
        prioridad,
        emisorNombre: currentUser?.apellidoYNombre || currentUser?.username || 'Oficial de Guardia',
        emisorUsername: currentUser?.username || 'usuario',
        fechaHora: new Date().toISOString(),
        tipo: 'comunicado',
        leidoPor: currentUser?.id ? [currentUser.id] : [],
      });

      setMensaje('');
      setPrioridad('Normal');
      setDestinoDelegacionId('TODAS');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletarTraslado = async (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string
  ) => {
    if (onTransferirPersonal) {
      await onTransferirPersonal(personal, nuevaDelegacionId, motivo, disposicion, fecha);
    }

    const nuevaDel = delegacionesList.find((d) => d.id === nuevaDelegacionId);
    const mensajeAviso = `TRASLADO DE EFECTIVO POLICIAL: Se comunica el traslado del efectivo ${personal.jerarquia} ${personal.apellidoYNombre} (DNI ${personal.dni}, Plaza: ${personal.plaza || 's/p'}) con destino a ${nuevaDel?.nombre || 'nueva delegación'}. Motivo/Disposición: ${disposicion || motivo || 'Orden superior'}. Fecha de efectivización: ${fecha}.`;

    // Generar automáticamente la novedad inter-delegación de prioridad Urgente
    await onCrearNovedad({
      mensaje: mensajeAviso,
      origenDelegacionId: delegacionActual?.id || 'del-laguna-blanca',
      origenDelegacionNombre: delegacionActual?.nombre || config.dependencia,
      destinatarioDelegacionId: nuevaDelegacionId,
      destinoDelegacionId: nuevaDelegacionId,
      destinoDelegacionNombre: nuevaDel?.nombre || 'Nueva Delegación',
      prioridad: 'Urgente',
      emisorNombre: currentUser?.apellidoYNombre || currentUser?.username || 'Sistema',
      emisorUsername: currentUser?.username || 'sistema',
      fechaHora: new Date().toISOString(),
      tipo: 'traslado_personal',
      leidoPor: currentUser?.id ? [currentUser.id] : [],
    });

    setIsTrasladoModalOpen(false);
    setPersonalParaTraslado(null);
  };

  const filteredNovedades = useMemo(() => {
    return novedadesList.filter((n) => {
      // Búsqueda por texto
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          n.mensaje.toLowerCase().includes(term) ||
          (n.origenDelegacionNombre || '').toLowerCase().includes(term) ||
          (n.destinoDelegacionNombre || n.destinatarioDelegacionNombre || '').toLowerCase().includes(term) ||
          (n.emisorNombre || n.usuarioEmisorNombre || n.remitenteUsuarioNombre || '').toLowerCase().includes(term);
        if (!match) return false;
      }

      // Prioridad
      if (filtroPrioridad !== 'todas' && n.prioridad !== filtroPrioridad) return false;

      return true;
    });
  }, [novedadesList, searchTerm, filtroPrioridad]);

  const getPrioridadBadge = (prio: PrioridadNovedad) => {
    switch (prio) {
      case 'Urgente':
        return {
          bg: 'bg-red-600 text-white border-red-700 animate-pulse',
          icon: Flame,
          label: 'Urgente',
        };
      case 'Alta':
        return {
          bg: 'bg-amber-600 text-white border-amber-700',
          icon: AlertTriangle,
          label: 'Prioridad Alta',
        };
      case 'Informativa':
        return {
          bg: 'bg-blue-600 text-white border-blue-700',
          icon: Info,
          label: 'Informativa',
        };
      case 'Normal':
      default:
        return {
          bg: 'bg-slate-700 text-white border-slate-800',
          icon: Bell,
          label: 'Normal',
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-900" />
              <span>Novedades y Comunicaciones Inter-Delegaciones</span>
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {novedadesList.length} avisos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Módulo oficial para emisión de avisos y directivas operativas entre delegaciones policiales y notificación automática de traslados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (personalList.length === 0) {
              alert('No hay efectivos cargados en la nómina para trasladar.');
              return;
            }
            setPersonalParaTraslado(personalList[0]);
            setIsTrasladoModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          title="Trasladar un efectivo a otra delegación policial con aviso inmediato a la delegación destino"
        >
          <ArrowRightLeft className="w-4 h-4 text-amber-300" />
          <span>Trasladar Personal a otra Delegación</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Formulario de Emisión (Requerimiento exacto: Mensaje, Dirigido a, Prioridad) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="p-2 bg-blue-900 rounded-lg text-white">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Emitir Nueva Novedad / Aviso</h2>
              <p className="text-[11px] text-slate-500">
                Origen: <strong>{delegacionActual?.nombre || 'Delegación Central'}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Destinatario */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-900" />
                <span>A quién irá dirigido: *</span>
              </label>
              <select
                required
                value={destinoDelegacionId}
                onChange={(e) => setDestinoDelegacionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="TODAS">📢 A todas las Delegaciones (General)</option>
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    🏢 {d.nombre} ({d.ciudad})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Prioridad */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                <span>Prioridad del Aviso: *</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Normal', 'Alta', 'Urgente', 'Informativa'] as PrioridadNovedad[]).map((p) => {
                  const isSelected = prioridad === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridad(p)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? p === 'Urgente'
                            ? 'bg-red-600 text-white border-red-700 shadow-xs'
                            : p === 'Alta'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : p === 'Informativa'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-800 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Mensaje */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-900" />
                <span>Mensaje Oficial / Novedad: *</span>
              </label>
              <textarea
                required
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escriba aquí la novedad, requerimiento pericial, comunicación o directiva para las otras delegaciones..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !mensaje.trim()}
              className="w-full bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Emitir y Notificar a Delegaciones</span>
            </button>
          </form>
        </div>

        {/* Tablero / Feed de Novedades */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barra de Filtros del Feed */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar novedades..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-slate-500 font-medium">Prioridad:</span>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-xs"
              >
                <option value="todas">Todas</option>
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
                <option value="Normal">Normal</option>
                <option value="Informativa">Informativa</option>
              </select>
            </div>
          </div>

          {/* Listado de Tarjetas */}
          {filteredNovedades.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 text-slate-500 text-xs">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No hay novedades registradas con estos filtros.</p>
              <p className="text-[11px] text-slate-400">
                Utilice el formulario de la izquierda para emitir comunicados a las otras delegaciones.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredNovedades.map((n) => {
                const prioBadge = getPrioridadBadge(n.prioridad);
                const PrioIcon = prioBadge.icon;
                const esParaMi =
                  n.destinoDelegacionId === 'TODAS' ||
                  n.destinoDelegacionId === activeDelegacionId ||
                  n.destinoDelegacionId === currentUser?.delegacionId;

                const fechaFormateada = new Date(n.fechaHora || n.createdAt || Date.now()).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={n.id}
                    className={`bg-white rounded-xl border p-4 shadow-2xs space-y-2 transition-all hover:shadow-xs ${
                      n.prioridad === 'Urgente'
                        ? 'border-red-300 bg-red-50/20'
                        : n.tipo === 'traslado_personal'
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${prioBadge.bg}`}
                        >
                          <PrioIcon className="w-3 h-3" />
                          <span>{prioBadge.label}</span>
                        </span>

                        {n.tipo === 'traslado_personal' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            Traslado de Personal
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{fechaFormateada}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onEliminarNovedad && (currentUser?.rol === 'superusuario' || currentUser?.puedeEliminar) && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ isOpen: true, id: n.id })}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar novedad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Origen -> Destino */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-800">{n.origenDelegacionNombre}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span
                        className={`font-bold ${
                          n.destinoDelegacionId === 'TODAS'
                            ? 'text-blue-900'
                            : 'text-amber-800'
                        }`}
                      >
                        {n.destinoDelegacionNombre}
                      </span>
                    </div>

                    {/* Contenido del mensaje */}
                    <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      {n.mensaje}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>
                        Emitido por: <strong>{n.emisorNombre}</strong>
                      </span>
                      {esParaMi && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Notificado a su delegación</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Traslado de Personal */}
      {isTrasladoModalOpen && personalParaTraslado && (
        <TrasladarPersonalModal
          personal={personalParaTraslado}
          delegacionesList={delegacionesList}
          onConfirmTransfer={handleCompletarTraslado}
          onClose={() => {
            setIsTrasladoModalOpen(false);
            setPersonalParaTraslado(null);
          }}
        />
      )}

      {/* Confirmar Eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Aviso / Novedad"
        message="¿Confirma eliminar este comunicado oficial del registro de novedades entre delegaciones?"
        confirmLabel="Eliminar Aviso"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirm.id && onEliminarNovedad) {
            onEliminarNovedad(deleteConfirm.id);
          }
          setDeleteConfirm({ isOpen: false, id: null });
        }}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </div>
  );
};

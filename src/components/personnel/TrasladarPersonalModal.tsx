import React, { useState, useMemo, useEffect } from 'react';
import { Personal, DelegacionPolicial, PrioridadNovedad } from '../../types/police';
import {
  X,
  ArrowRightLeft,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Search,
  User,
} from 'lucide-react';

interface TrasladarPersonalModalProps {
  personal?: Personal | null;
  personalList?: Personal[];
  delegacionesList: DelegacionPolicial[];
  onConfirmTransfer: (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string,
    prioridadNotificacion?: PrioridadNovedad
  ) => Promise<void> | void;
  onClose: () => void;
}

export const TrasladarPersonalModal: React.FC<TrasladarPersonalModalProps> = ({
  personal,
  personalList = [],
  delegacionesList,
  onConfirmTransfer,
  onClose,
}) => {
  const selectablePersonal = useMemo(() => {
    if (personalList.length > 0) return personalList;
    return personal ? [personal] : [];
  }, [personalList, personal]);

  const [selectedPersonalId, setSelectedPersonalId] = useState<string>(
    personal?.id || selectablePersonal[0]?.id || ''
  );
  const [personalSearch, setPersonalSearch] = useState<string>('');

  const activePersonal = useMemo(() => {
    return (
      selectablePersonal.find((p) => p.id === selectedPersonalId) ||
      personal ||
      selectablePersonal[0] ||
      null
    );
  }, [selectablePersonal, selectedPersonalId, personal]);

  const filteredSelectablePersonal = useMemo(() => {
    const term = personalSearch.trim().toLowerCase();
    if (!term) return selectablePersonal;
    return selectablePersonal.filter(
      (p) =>
        p.apellidoYNombre.toLowerCase().includes(term) ||
        p.dni.includes(term) ||
        p.jerarquia.toLowerCase().includes(term) ||
        (p.plaza || '').toLowerCase().includes(term)
    );
  }, [selectablePersonal, personalSearch]);

  const currentDelegacionId = activePersonal?.delegacionId || 'del-laguna-blanca';
  const currentDel = delegacionesList.find((d) => d.id === currentDelegacionId);

  const availableDestinos = useMemo(
    () => delegacionesList.filter((d) => d.id !== currentDelegacionId),
    [delegacionesList, currentDelegacionId]
  );

  const [destinoId, setDestinoId] = useState<string>(
    availableDestinos[0]?.id || ''
  );

  useEffect(() => {
    if (!availableDestinos.some((d) => d.id === destinoId)) {
      setDestinoId(availableDestinos[0]?.id || '');
    }
  }, [availableDestinos, destinoId]);

  const [fechaTraslado, setFechaTraslado] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [disposicion, setDisposicion] = useState<string>('Disp. N° /2026 - J.P.');
  const [motivo, setMotivo] = useState<string>(
    'Pase y traslado por razones del servicio operativo pericial.'
  );
  const [prioridadNotificacion, setPrioridadNotificacion] =
    useState<PrioridadNovedad>('Urgente');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activePersonal) {
      setErrorMsg('Seleccione el efectivo policial a trasladar.');
      return;
    }
    if (!destinoId) {
      setErrorMsg('Seleccione la Delegación de destino.');
      return;
    }
    if (!disposicion.trim()) {
      setErrorMsg('Ingrese la disposición o memorándum oficial de pase.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(
        activePersonal,
        destinoId,
        motivo.trim(),
        disposicion.trim(),
        fechaTraslado,
        prioridadNotificacion
      );
      onClose();
    } catch (err: any) {
      setErrorMsg('Error al realizar el traslado: ' + (err?.message || 'Error inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetDelObj = delegacionesList.find((d) => d.id === destinoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-xl text-blue-200">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Traslado de Efectivo a otra Delegación
              </h3>
              <p className="text-[11px] text-slate-400">
                Pase de dotación desde Personal y Legajos con notificación automática a destino
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de efectivo cuando hay nómina disponible (ej. botón principal) */}
          {selectablePersonal.length > 1 && !personal && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-800" />
                <span>Seleccionar Efectivo a Trasladar: *</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={personalSearch}
                  onChange={(e) => setPersonalSearch(e.target.value)}
                  placeholder="Buscar por apellido, nombre, DNI o jerarquía..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <select
                value={activePersonal?.id || ''}
                onChange={(e) => setSelectedPersonalId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {filteredSelectablePersonal.length === 0 ? (
                  <option value="">Sin coincidencias en la nómina...</option>
                ) : (
                  filteredSelectablePersonal.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jerarquia} {p.apellidoYNombre} — DNI {p.dni} ({p.seccionGrupo})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Tarjeta del Efectivo */}
          {activePersonal && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {activePersonal.apellidoYNombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-blue-900 uppercase">
                  {activePersonal.jerarquia}
                </div>
                <div className="font-bold text-slate-900 text-sm truncate">
                  {activePersonal.apellidoYNombre}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  DNI: {activePersonal.dni}
                  {activePersonal.cedulaProvincial ? ` • CP: ${activePersonal.cedulaProvincial}` : ''} • Plaza:{' '}
                  {activePersonal.plaza || 's/p'}
                </div>
              </div>
            </div>
          )}

          {/* Comparación Origen -> Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Delegación Origen (Actual)
              </span>
              <div className="font-bold text-slate-800 leading-tight">
                {currentDel?.nombre || 'Delegación Actual'}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentDel?.ciudad || 'Sin ciudad asignada'}
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border-2 border-blue-400 space-y-1">
              <span className="text-[10px] font-bold text-blue-900 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-700" /> Delegación Destino (Notificada)
              </span>
              {availableDestinos.length === 0 ? (
                <div className="text-[11px] text-red-700 font-semibold py-1">
                  No existen otras delegaciones registradas para trasladar.
                </div>
              ) : (
                <>
                  <select
                    required
                    value={destinoId}
                    onChange={(e) => setDestinoId(e.target.value)}
                    className="w-full text-xs font-bold text-blue-950 bg-white border border-blue-300 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {availableDestinos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.ciudad})
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-blue-700 font-semibold truncate">
                    Recibirá legajo y notificación: {targetDelObj?.ciudad || 'Ciudad destino'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fecha del Traslado y Disposición */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha Oficial de Traslado / Pase:
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="date"
                  required
                  value={fechaTraslado}
                  onChange={(e) => setFechaTraslado(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Disposición / Memorándum N°:
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={disposicion}
                  onChange={(e) => setDisposicion(e.target.value)}
                  placeholder="ej. Disp. N° 44/26 - J.P."
                  className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Motivo de Traslado */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo o Fundamentación del Pase:
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describa el motivo del traslado del efectivo..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
            />
          </div>

          {/* Prioridad y Vista Previa de Notificación a la Delegación Destino */}
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                <Bell className="w-4 h-4 text-indigo-700" />
                <span>Notificación Automática a Delegación Destino</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-indigo-800">Prioridad:</span>
                <select
                  value={prioridadNotificacion}
                  onChange={(e) => setPrioridadNotificacion(e.target.value as PrioridadNovedad)}
                  className="text-[11px] font-bold bg-white border border-indigo-300 text-indigo-950 rounded-md px-2 py-1 focus:outline-none"
                >
                  <option value="Urgente">Urgente</option>
                  <option value="Alta">Alta</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-indigo-900 leading-relaxed">
              Al confirmar el traslado, el legajo de{' '}
              <strong>{activePersonal?.apellidoYNombre || 'el efectivo'}</strong> pasará a la dotación de{' '}
              <strong>{targetDelObj?.nombre || 'la delegación seleccionada'}</strong> y se enviará una
              notificación oficial directa a esa delegación (visible en la campana superior de{' '}
              <strong>Notificaciones</strong> y en <strong>Novedades y Avisos</strong>).
            </p>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableDestinos.length === 0 || !activePersonal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Procesando Traslado...' : 'Confirmar Traslado y Notificar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

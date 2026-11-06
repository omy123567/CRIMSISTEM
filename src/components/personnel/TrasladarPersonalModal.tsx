import React, { useState } from 'react';
import { Personal, DelegacionPolicial } from '../../types/police';
import {
  X,
  ArrowRightLeft,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Shield,
  User,
} from 'lucide-react';

interface TrasladarPersonalModalProps {
  personal: Personal;
  delegacionesList: DelegacionPolicial[];
  onConfirmTransfer: (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string
  ) => Promise<void> | void;
  onClose: () => void;
}

export const TrasladarPersonalModal: React.FC<TrasladarPersonalModalProps> = ({
  personal,
  delegacionesList,
  onConfirmTransfer,
  onClose,
}) => {
  const currentDel = delegacionesList.find(
    (d) => d.id === (personal.delegacionId || 'del-laguna-blanca')
  );

  const availableDestinos = delegacionesList.filter(
    (d) => d.id !== (personal.delegacionId || 'del-laguna-blanca')
  );

  const [destinoId, setDestinoId] = useState<string>(
    availableDestinos[0]?.id || ''
  );
  const [fechaTraslado, setFechaTraslado] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [disposicion, setDisposicion] = useState<string>('Disp. N° /2026 - J.P.');
  const [motivo, setMotivo] = useState<string>(
    'Pase y traslado por razones del servicio operativo pericial.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinoId) {
      alert('Seleccione la Delegación de destino.');
      return;
    }
    if (!disposicion.trim()) {
      alert('Ingrese la disposición o memorándum oficial de pase.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(
        personal,
        destinoId,
        motivo,
        disposicion,
        fechaTraslado
      );
      onClose();
    } catch (err: any) {
      alert('Error al realizar el traslado: ' + err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetDelObj = delegacionesList.find((d) => d.id === destinoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-xl text-blue-200">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Traslado de Efectivo a otra Delegación
              </h3>
              <p className="text-[11px] text-slate-400">
                Pase de dotación oficial de la Policía de Formosa
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
        <form onSubmit={handleConfirm} className="p-5 space-y-4 text-xs">
          {/* Tarjeta del Efectivo */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {personal.apellidoYNombre.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-blue-900 uppercase">
                {personal.jerarquia}
              </div>
              <div className="font-bold text-slate-900 text-sm truncate">
                {personal.apellidoYNombre}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                DNI: {personal.dni} • Plaza: {personal.plaza || 's/p'}
              </div>
            </div>
          </div>

          {/* Comparación Origen -> Destino */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Delegación Origen (Actual)
              </span>
              <div className="font-bold text-slate-800 leading-tight">
                {currentDel?.nombre || 'Delegación Policía Científica Laguna Blanca'}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentDel?.ciudad || 'Laguna Blanca'}
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border-2 border-blue-400 space-y-1">
              <span className="text-[10px] font-bold text-blue-900 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-700" /> Delegación Destino (Nueva)
              </span>
              <select
                required
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full text-xs font-bold text-blue-950 bg-white border border-blue-300 rounded p-1.5 focus:outline-none"
              >
                {availableDestinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.ciudad})
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-blue-700 font-semibold truncate">
                {targetDelObj?.ciudad || 'Ciudad destino'}
              </div>
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

          {/* Aviso informativo */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Aviso de Pase Inter-Delegacional:</strong> Al confirmar,
              el legajo completo de <strong>{personal.apellidoYNombre}</strong> pasará
              a formar parte de la dotación de la <strong>{targetDelObj?.nombre}</strong>.
              Se conservará el asiento en su historial de traslados.
            </div>
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
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Confirmar Traslado Policial</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

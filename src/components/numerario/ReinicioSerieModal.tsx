import React, { useState } from 'react';
import { SerieNumerario } from '../../types/police';
import { AlertTriangle, RotateCcw, X, ShieldAlert, Check } from 'lucide-react';

interface ReinicioSerieModalProps {
  isOpen: boolean;
  serie: SerieNumerario;
  totalOcupados: number;
  onConfirmReset: () => Promise<void> | void;
  onClose: () => void;
}

export const ReinicioSerieModal: React.FC<ReinicioSerieModalProps> = ({
  isOpen,
  serie,
  totalOcupados,
  onConfirmReset,
  onClose,
}) => {
  const [palabraClave, setPalabraClave] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const isAuthorized = palabraClave.trim().toUpperCase() === 'REINICIAR';

  const handleReset = async () => {
    if (!isAuthorized) return;
    try {
      setIsProcessing(true);
      await onConfirmReset();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-red-950 text-white px-6 py-4 flex items-center justify-between border-b border-red-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg text-white">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Reinicio Seguro de Numerario</h2>
              <p className="text-xs text-red-200">Serie: {serie.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>¡ADVERTENCIA DE SEGURIDAD!</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Esta acción <strong>eliminará todos los {totalOcupados} folios asignados</strong> de la serie activa{' '}
              <strong>"{serie.nombre}"</strong> ({serie.prefijo}) devolviendo la cuadrícula numérica completa a estado libre (del 1 al {serie.limiteFolios || 1000}).
            </p>
            <p className="text-[11px] font-semibold text-red-900">
              ✓ Las demás series independientes permanecerán intactas y no se verán afectadas.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              Para autorizar el reinicio, escriba la palabra exacta <span className="text-red-700 font-mono">REINICIAR</span>:
            </label>
            <input
              type="text"
              value={palabraClave}
              onChange={(e) => setPalabraClave(e.target.value)}
              placeholder="Escriba REINICIAR"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-center tracking-wider text-sm focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isAuthorized || isProcessing}
              className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors ${
                isAuthorized
                  ? 'bg-red-700 hover:bg-red-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Reiniciando...' : 'Confirmar Reinicio'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

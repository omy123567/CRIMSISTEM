import React, { useState } from 'react';
import { X, Printer, FileText, Check } from 'lucide-react';

export type OrientacionPapel = 'portrait' | 'landscape';
export type TamanoPapel = 'a4' | 'legal' | 'letter';

export interface OpcionesImpresion {
  orientacion: OrientacionPapel;
  tamano: TamanoPapel;
  incluirFirmaJefe: boolean;
}

interface ModalOpcionesImpresionProps {
  isOpen: boolean;
  titulo?: string;
  orientacionDefault?: OrientacionPapel;
  tamanoDefault?: TamanoPapel;
  onGenerar: (opciones: OpcionesImpresion) => void;
  onClose: () => void;
}

export const ModalOpcionesImpresion: React.FC<ModalOpcionesImpresionProps> = ({
  isOpen,
  titulo = 'Configuración de Impresión / Exportación PDF',
  orientacionDefault = 'landscape',
  tamanoDefault = 'a4',
  onGenerar,
  onClose,
}) => {
  const [orientacion, setOrientacion] = useState<OrientacionPapel>(orientacionDefault);
  const [tamano, setTamano] = useState<TamanoPapel>(tamanoDefault);
  const [incluirFirmaJefe, setIncluirFirmaJefe] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerar({
      orientacion,
      tamano,
      incluirFirmaJefe,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">{titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Orientación */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">
              Orientación de Página
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${
                  orientacion === 'portrait'
                    ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="orientacion"
                  value="portrait"
                  checked={orientacion === 'portrait'}
                  onChange={() => setOrientacion('portrait')}
                  className="hidden"
                />
                <div className="w-4 h-6 border-2 border-current rounded-xs" />
                <span>Vertical (Portrait)</span>
              </label>

              <label
                className={`p-3 rounded-lg border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${
                  orientacion === 'landscape'
                    ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                }`}
              >
                <input
                  type="radio"
                  name="orientacion"
                  value="landscape"
                  checked={orientacion === 'landscape'}
                  onChange={() => setOrientacion('landscape')}
                  className="hidden"
                />
                <div className="w-6 h-4 border-2 border-current rounded-xs" />
                <span>Horizontal (Landscape)</span>
              </label>
            </div>
          </div>

          {/* Tamaño de Papel */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">
              Tamaño de Papel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'a4', label: 'A4 (210 x 297 mm)', desc: 'Estándar oficial' },
                { id: 'legal', label: 'Oficio / Legal (216 x 356 mm)', desc: 'Expedientes' },
                { id: 'letter', label: 'Carta / Letter (216 x 279 mm)', desc: 'Formato carta' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-2.5 rounded-lg border-2 cursor-pointer text-center flex flex-col items-center justify-center transition-all ${
                    tamano === opt.id
                      ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="tamano"
                    value={opt.id}
                    checked={tamano === opt.id}
                    onChange={() => setTamano(opt.id as TamanoPapel)}
                    className="hidden"
                  />
                  <span className="text-[11px] font-bold block">{opt.id.toUpperCase()}</span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                    {opt.desc}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generar Documento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

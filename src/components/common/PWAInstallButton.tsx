import React from 'react';
import { Download, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, showIOSGuide, setShowIOSGuide, install } =
    usePWAInstall();

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Sis.Pol. App instalada en este dispositivo</span>
        </div>
      );
    }
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        title="Instalar Sis.Pol. como App Nativa en este dispositivo (Multiplataforma)"
        className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 ${className}`}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>{variant === 'full' ? 'Instalar Aplicación en Dispositivo' : 'Instalar App'}</span>
      </button>

      {/* Modal Guía iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900/60 border border-blue-500/40 flex items-center justify-center">
                <img src="/apple-touch-icon.png" alt="Sis.Pol" className="w-9 h-9 rounded-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Instalar Sis.Pol. en iOS</h3>
                <p className="text-[11px] text-slate-400">iPhone / iPad</p>
              </div>
            </div>

            <ol className="text-xs space-y-2.5 text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Toca el botón <Share className="w-4 h-4 text-blue-400 inline" /> <strong>Compartir</strong> en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Desliza hacia abajo y elige <PlusSquare className="w-4 h-4 text-blue-400 inline" /> <strong>Agregar a pantalla de inicio</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>Toca <strong>Agregar</strong> en la esquina superior derecha.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirmar Acción',
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive,
  isDanger,
  danger,
  onConfirm,
  onClose,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleClose = onClose || onCancel || (() => {});
  const finalConfirmLabel = confirmText || confirmLabel || 'Eliminar';
  const finalCancelLabel = cancelText || cancelLabel || 'Cancelar';
  const destructiveMode = isDestructive !== undefined ? isDestructive : (danger !== undefined ? danger : (isDanger !== undefined ? isDanger : true));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                destructiveMode ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {destructiveMode ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {finalCancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              destructiveMode
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-900 hover:bg-blue-950'
            }`}
          >
            {destructiveMode && <Trash2 className="w-3.5 h-3.5" />}
            <span>{finalConfirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UsuarioSistema } from '../../types/police';
import { X, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface CambiarPasswordModalProps {
  currentUser: UsuarioSistema;
  onSavePassword: (userId: string, newPass: string) => Promise<void> | void;
  onClose: () => void;
}

export const CambiarPasswordModal: React.FC<CambiarPasswordModalProps> = ({
  currentUser,
  onSavePassword,
  onClose,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentPass !== currentUser.password) {
      setErrorMsg('La contraseña actual ingresada es incorrecta.');
      return;
    }

    if (!newPass || newPass.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (newPass === currentPass) {
      setErrorMsg('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    await onSavePassword(currentUser.id, newPass);
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-xl text-blue-200">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Cambiar Contraseña</h2>
              <p className="text-[11px] text-slate-300">
                Usuario: <strong>{currentUser.username}</strong> ({currentUser.apellidoYNombre})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-slate-900">
                ¡Contraseña Modificada con Éxito!
              </h3>
              <p className="text-xs text-slate-500">
                Sus nuevas credenciales se han actualizado en la base de datos.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Ingrese su contraseña actual"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                >
                  Guardar Nueva Contraseña
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

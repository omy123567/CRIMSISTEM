import React, { useState } from 'react';
import { UsuarioSistema } from '../../types/police';
import {
  adminChangePasswordOnServer,
  adminSetupUser2faOnServer,
  adminEnableUser2faOnServer,
  adminResetUser2faOnServer,
} from '../../services/apiService';
import { evaluarFortalezaPassword } from '../../services/securityClient';
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Download,
  ShieldAlert,
  ShieldCheck,
  Laptop,
} from 'lucide-react';

interface AdminChangePasswordModalProps {
  targetUser: UsuarioSistema;
  onUserUpdated: (user: UsuarioSistema) => void;
  onClose: () => void;
}

export const AdminChangePasswordModal: React.FC<AdminChangePasswordModalProps> = ({
  targetUser,
  onUserUpdated,
  onClose,
}) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = evaluarFortalezaPassword(newPass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPass || newPass.trim().length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminChangePasswordOnServer(targetUser.id, newPass.trim());
    setIsSubmitting(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo actualizar la contraseña del usuario.');
      return;
    }

    onUserUpdated(res.user);
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-700/80 rounded-xl text-amber-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Cambiar Contraseña de Usuario</h2>
              <p className="text-[11px] text-slate-300">
                Cuenta: <strong>@{targetUser.username}</strong> ({targetUser.apellidoYNombre})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                ¡Contraseña Actualizada!
              </h3>
              <p className="text-xs text-slate-500">
                La nueva contraseña de <strong>@{targetUser.username}</strong> fue cifrada (scrypt) y guardada en el servidor central.
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Nueva Contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPass ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres (mayúscula, minúscula, número)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {newPass.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Fortaleza:</span>
                      <span className={`font-bold ${strength.colorClass}`}>{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.barColor}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

interface AdminUser2faModalProps {
  targetUser: UsuarioSistema;
  onUserUpdated: (user: UsuarioSistema) => void;
  onClose: () => void;
}

export const AdminUser2faModal: React.FC<AdminUser2faModalProps> = ({
  targetUser,
  onUserUpdated,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  // Backup codes after activation
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Confirm disable toggle
  const [confirmingDisable, setConfirmingDisable] = useState(false);

  const handleGenerateQr = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    const res = await adminSetupUser2faOnServer(targetUser.id);
    setIsLoading(false);

    if (!res.success || !res.qrDataUrl || !res.secret) {
      setErrorMsg(res.error || 'No se pudo generar el código QR para este usuario.');
      return;
    }

    setQrDataUrl(res.qrDataUrl);
    setManualSecret(res.secret);
  };

  const handleCopySecret = async () => {
    if (!manualSecret) return;
    try {
      await navigator.clipboard.writeText(manualSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleEnableForUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!verifyCode.trim()) {
      setErrorMsg('Ingrese el código de 6 dígitos generado en el celular del usuario.');
      return;
    }

    setIsLoading(true);
    const res = await adminEnableUser2faOnServer(targetUser.id, verifyCode.trim());
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo activar 2FA para el usuario.');
      return;
    }

    onUserUpdated(res.user);
    setBackupCodes(res.backupCodes || []);
    setQrDataUrl(null);
    setManualSecret(null);
    setVerifyCode('');
  };

  const handleDisableForUser = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    const res = await adminResetUser2faOnServer(targetUser.id);
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo desactivar el 2FA del usuario.');
      return;
    }

    onUserUpdated(res.user);
    setConfirmingDisable(false);
    setSuccessMsg(`Se desactivó Google Authenticator (2FA) para @${res.user.username}.`);
  };

  const handleCopyBackupCodes = async () => {
    if (!backupCodes || backupCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return;
    const content = [
      'POLICÍA DE LA PROVINCIA DE FORMOSA - D.G.P.C.',
      'SISTEMA CRIMINI-SISTEM • CÓDIGOS DE RESPALDO 2FA',
      `Usuario: @${targetUser.username} (${targetUser.apellidoYNombre})`,
      `Fecha de generación: ${new Date().toLocaleString('es-AR')}`,
      '--------------------------------------------------------',
      'Códigos de un solo uso en caso de extravío del celular:',
      '',
      ...backupCodes.map((c, idx) => `${idx + 1}. ${c}`),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-respaldo-2fa-${targetUser.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-200 border border-emerald-600/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Gestionar 2FA (Google Authenticator)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    targetUser.totpEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  {targetUser.totpEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Usuario: <strong>@{targetUser.username}</strong> ({targetUser.apellidoYNombre})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {backupCodes ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    ¡2FA Activado para @{targetUser.username}!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Entregue al usuario estos <strong>8 códigos de respaldo de un solo uso</strong> por si extravía su teléfono.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-300 rounded-xl p-4 border border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-sm font-bold text-center">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 tracking-widest"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer"
                  >
                    {copiedBackup ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedBackup ? '¡Copiados!' : 'Copiar Códigos'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .TXT</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setBackupCodes(null)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : !targetUser.totpEnabled ? (
            /* ACTIVAR 2FA PARA EL USUARIO */
            <div className="space-y-4">
              {!qrDataUrl ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3 px-4">
                  <QrCode className="w-12 h-12 text-blue-800 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Activar Google Authenticator para @{targetUser.username}
                    </h3>
                    <p className="text-[11px] text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                      Genere el código QR para que el titular de la cuenta lo escanee con <strong>Google Authenticator</strong> en su teléfono y luego ingrese el código de 6 dígitos para confirmar la vinculación.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGenerateQr}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{isLoading ? 'Generando QR...' : 'Generar Código QR de Vinculación'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnableForUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="sm:col-span-5 flex flex-col items-center">
                      <div className="p-2 bg-white border border-slate-300 rounded-xl shadow-xs">
                        <img
                          src={qrDataUrl}
                          alt="QR Google Authenticator"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 font-medium">
                        Escanear con el celular del usuario
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-3">
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        Solicite al usuario <strong>@{targetUser.username}</strong> que escanee este código QR desde Google Authenticator o ingrese la clave manual:
                      </p>

                      {manualSecret && (
                        <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                            Clave Manual (Base32)
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <code className="font-mono text-xs font-bold text-slate-900 break-all tracking-wider">
                              {manualSecret}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 shrink-0 cursor-pointer"
                              title="Copiar clave manual"
                            >
                              {copiedSecret ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <label className="block font-bold text-slate-800">
                      Código de 6 dígitos mostrado en el teléfono de @{targetUser.username} *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={8}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="Ej: 123456"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold tracking-widest text-sm"
                      />
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer"
                      >
                        {isLoading ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* 2FA ACTIVO: ESTADO Y OPCIÓN DE DESACTIVAR */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-950 text-sm">
                    Google Authenticator (2FA) está ACTIVO
                  </div>
                  <div className="text-[11px] text-emerald-800 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {targetUser.totpActivatedAt && (
                      <span>
                        Activado el{' '}
                        {new Date(targetUser.totpActivatedAt).toLocaleString('es-AR')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Laptop className="w-3.5 h-3.5" />
                      {(targetUser.trustedDevices || []).length} dispositivo(s) de confianza
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-950 text-xs">
                      Desactivar / Restablecer 2FA del Usuario
                    </h4>
                    <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                      Al desactivar el doble factor se eliminará la vinculación con Google Authenticator, los códigos de respaldo y todos los dispositivos de confianza de <strong>@{targetUser.username}</strong>.
                    </p>
                  </div>
                </div>

                {!confirmingDisable ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmingDisable(true)}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Desactivar 2FA de este Usuario
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200">
                    <button
                      type="button"
                      onClick={() => setConfirmingDisable(false)}
                      className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleDisableForUser}
                      className="px-4 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer"
                    >
                      {isLoading ? 'Desactivando...' : 'Confirmar Desactivación de 2FA'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

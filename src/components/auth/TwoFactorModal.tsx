import React, { useState } from 'react';
import { DispositivoConfiableInfo, UsuarioSistema } from '../../types/police';
import {
  setup2faOnServer,
  enable2faOnServer,
  disable2faOnServer,
  trustCurrentDeviceOnServer,
  revokeTrustedDeviceOnServer,
} from '../../services/apiService';
import {
  getLocalTrustedDeviceIdForUser,
  removeTrustedDeviceTokenForUser,
} from '../../services/securityClient';
import {
  X,
  ShieldCheck,
  Smartphone,
  QrCode,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Laptop,
  Trash2,
  Clock,
  ShieldAlert,
  Eye,
  EyeOff,
  PlusCircle,
} from 'lucide-react';

interface TwoFactorModalProps {
  currentUser: UsuarioSistema;
  onUserUpdated: (user: UsuarioSistema) => void;
  onClose: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateTimeAr(iso?: string): string {
  if (!iso) return 'S/D';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'S/D';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDeviceExpiryInfo(lastUsedAt?: string): { expiresText: string; daysLeft: number } {
  const baseMs = lastUsedAt ? new Date(lastUsedAt).getTime() : Date.now();
  const expiresAt = new Date((Number.isNaN(baseMs) ? Date.now() : baseMs) + SEVEN_DAYS_MS);
  const diffMs = expiresAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  return {
    expiresText: formatDateTimeAr(expiresAt.toISOString()),
    daysLeft,
  };
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  currentUser,
  onUserUpdated,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup state (cuando 2FA está inactivo)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [enablePassword, setEnablePassword] = useState('');
  const [enableCode, setEnableCode] = useState('');
  const [showEnablePass, setShowEnablePass] = useState(false);
  const [trustOnEnable, setTrustOnEnable] = useState(true);
  const [deviceLabelOnEnable, setDeviceLabelOnEnable] = useState('');

  // Códigos de respaldo recién generados
  const [justActivatedBackupCodes, setJustActivatedBackupCodes] = useState<string[] | null>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Confiar dispositivo actual (cuando 2FA ya está activo)
  const [showTrustForm, setShowTrustForm] = useState(false);
  const [trustCode, setTrustCode] = useState('');
  const [trustDeviceLabel, setTrustDeviceLabel] = useState('');

  // Desactivar 2FA
  const [showDisableSection, setShowDisableSection] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisablePass, setShowDisablePass] = useState(false);

  const localDeviceId = getLocalTrustedDeviceIdForUser(currentUser.id);
  const trustedDevices: DispositivoConfiableInfo[] = currentUser.trustedDevices || [];
  const isCurrentDeviceTrusted = Boolean(
    localDeviceId && trustedDevices.some((d) => d.id === localDeviceId)
  );

  const handleGenerateQr = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    const res = await setup2faOnServer();
    setIsLoading(false);

    if (!res.success || !res.qrDataUrl || !res.secret) {
      setErrorMsg(res.error || 'No se pudo generar el código QR de vinculación.');
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

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!enablePassword.trim()) {
      setErrorMsg('Ingrese su contraseña actual para confirmar.');
      return;
    }
    if (!enableCode.trim()) {
      setErrorMsg('Ingrese el código de 6 dígitos mostrado en Google Authenticator.');
      return;
    }

    setIsLoading(true);
    const res = await enable2faOnServer({
      currentPassword: enablePassword.trim(),
      code: enableCode.trim(),
      trustCurrentDevice: trustOnEnable,
      deviceLabel: deviceLabelOnEnable.trim() || undefined,
    });
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo activar la verificación en dos pasos.');
      return;
    }

    onUserUpdated(res.user);
    setJustActivatedBackupCodes(res.backupCodes || []);
    setEnablePassword('');
    setEnableCode('');
    setQrDataUrl(null);
    setManualSecret(null);
  };

  const handleCopyBackupCodes = async () => {
    if (!justActivatedBackupCodes || justActivatedBackupCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(justActivatedBackupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!justActivatedBackupCodes || justActivatedBackupCodes.length === 0) return;
    const content = [
      'POLICÍA DE LA PROVINCIA DE FORMOSA - D.G.P.C.',
      'SISTEMA CRIMINI-SISTEM • CÓDIGOS DE RESPALDO 2FA',
      `Usuario: @${currentUser.username} (${currentUser.apellidoYNombre})`,
      `Fecha de generación: ${new Date().toLocaleString('es-AR')}`,
      '--------------------------------------------------------',
      'Cada código es de UN SOLO USO en caso de extravío del teléfono:',
      '',
      ...justActivatedBackupCodes.map((c, idx) => `${idx + 1}. ${c}`),
      '',
      'Guarde este archivo en un lugar seguro y confidencial.',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-respaldo-2fa-${currentUser.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTrustCurrentDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!trustCode.trim()) {
      setErrorMsg('Ingrese el código actual de 6 dígitos de Google Authenticator.');
      return;
    }

    setIsLoading(true);
    const res = await trustCurrentDeviceOnServer(
      trustCode.trim(),
      trustDeviceLabel.trim() || undefined
    );
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo autorizar este dispositivo.');
      return;
    }

    onUserUpdated(res.user);
    setShowTrustForm(false);
    setTrustCode('');
    setTrustDeviceLabel('');
    setSuccessMsg(
      'Dispositivo agregado como de confianza. No pedirá 2FA salvo que pasen 7 días sin iniciar sesión.'
    );
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    const res = await revokeTrustedDeviceOnServer(deviceId, currentUser.id);
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo revocar el dispositivo.');
      return;
    }

    if (deviceId === 'all' || deviceId === localDeviceId) {
      removeTrustedDeviceTokenForUser(currentUser.id);
    }
    onUserUpdated(res.user);
    setSuccessMsg(
      deviceId === 'all'
        ? 'Se revocaron todos los dispositivos de confianza.'
        : 'Dispositivo revocado correctamente.'
    );
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!disablePassword.trim() || !disableCode.trim()) {
      setErrorMsg('Ingrese su contraseña actual y un código válido de Google Authenticator o respaldo.');
      return;
    }

    setIsLoading(true);
    const res = await disable2faOnServer(disablePassword.trim(), disableCode.trim());
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'No se pudo desactivar Google Authenticator.');
      return;
    }

    onUserUpdated(res.user);
    setShowDisableSection(false);
    setDisablePassword('');
    setDisableCode('');
    setSuccessMsg('Google Authenticator (2FA) fue desactivado de su cuenta.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-emerald-200 border border-emerald-600/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Google Authenticator (2FA) y Dispositivos de Confianza</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentUser.totpEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  {currentUser.totpEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Cuenta: <strong>@{currentUser.username}</strong> ({currentUser.apellidoYNombre})
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

        {/* Body */}
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

          {/* PANTALLA 1: CÓDIGOS DE RESPALDO TRAS ACTIVACIÓN RECIENTE */}
          {justActivatedBackupCodes ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    ¡Google Authenticator activado correctamente!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Guarde estos <strong>8 códigos de respaldo de un solo uso</strong> en un lugar seguro. Le permitirán ingresar al sistema si pierde o cambia su teléfono celular.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-300 rounded-xl p-4 border border-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-sm font-bold text-center">
                  {justActivatedBackupCodes.map((code, i) => (
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
                  onClick={() => setJustActivatedBackupCodes(null)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Entendido, ya guardé mis códigos
                </button>
              </div>
            </div>
          ) : !currentUser.totpEnabled ? (
            /* PANTALLA 2: CONFIGURAR Y ACTIVAR 2FA */
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-blue-950">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>¿Cómo funciona la protección con Google Authenticator?</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Al activarlo, su cuenta requerirá un código temporal de 6 dígitos generado en su celular. Podrá marcar equipos habituales como <strong>Dispositivos de Confianza</strong> para no volver a ingresar el código, salvo que transcurran <strong>7 días (1 semana) sin iniciar sesión</strong> en ese equipo.
                </p>
              </div>

              {!qrDataUrl ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <QrCode className="w-12 h-12 text-blue-800 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Paso 1: Vincular aplicación Google Authenticator
                    </h3>
                    <p className="text-[11px] text-slate-600 max-w-md mx-auto mt-1">
                      Descargue <strong>Google Authenticator</strong> en Android o iOS y genere el código QR oficial para escanearlo desde su dispositivo.
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
                <form onSubmit={handleEnable2fa} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="sm:col-span-5 flex flex-col items-center">
                      <div className="p-2 bg-white border border-slate-300 rounded-xl shadow-xs">
                        <img
                          src={qrDataUrl}
                          alt="Código QR Google Authenticator"
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 font-medium">
                        Escanear con Google Authenticator
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-3">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          Paso 1: Escanee el QR o ingrese la clave manual
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          En Google Authenticator seleccione <strong>"+" → "Escanear un código QR"</strong> o <strong>"Ingresar clave de configuración"</strong>.
                        </p>
                      </div>

                      {manualSecret && (
                        <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                            Clave Secreta Manual (Base32)
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

                  {/* Paso 2: Verificar contraseña y código */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                    <div className="font-bold text-slate-900">
                      Paso 2: Confirmar activación
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700">
                            Contraseña Actual *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowEnablePass((v) => !v)}
                            className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {showEnablePass ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            <span>{showEnablePass ? 'Ocultar' : 'Mostrar'}</span>
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type={showEnablePass ? 'text' : 'password'}
                            required
                            value={enablePassword}
                            onChange={(e) => setEnablePassword(e.target.value)}
                            placeholder="Su contraseña de acceso"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Código de 6 dígitos (App) *
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            maxLength={8}
                            value={enableCode}
                            onChange={(e) => setEnableCode(e.target.value)}
                            placeholder="Ej: 123456"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold tracking-widest text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Opción Dispositivo de Confianza */}
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trustOnEnable}
                          onChange={(e) => setTrustOnEnable(e.target.checked)}
                          className="w-4 h-4 text-emerald-700 rounded border-slate-300 mt-0.5"
                        />
                        <div>
                          <span className="font-bold text-emerald-950 block">
                            Agregar este dispositivo como de confianza
                          </span>
                          <span className="text-[11px] text-emerald-800 block leading-snug">
                            No volverá a solicitar el código 2FA en este navegador, salvo que no inicie sesión durante 1 semana (7 días).
                          </span>
                        </div>
                      </label>

                      {trustOnEnable && (
                        <div>
                          <input
                            type="text"
                            maxLength={60}
                            value={deviceLabelOnEnable}
                            onChange={(e) => setDeviceLabelOnEnable(e.target.value)}
                            placeholder="Nombre opcional del equipo (ej: PC Guardia Delegación)"
                            className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 text-xs"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setQrDataUrl(null);
                          setManualSecret(null);
                        }}
                        className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                      >
                        {isLoading ? 'Verificando...' : 'Activar Google Authenticator'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* PANTALLA 3: 2FA ACTIVO — DISPOSITIVOS DE CONFIANZA Y DESACTIVACIÓN */
            <div className="space-y-4">
              {/* Estado Activo */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-950 text-sm">
                      Google Authenticator (2FA) Activo
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Activado el {formatDateTimeAr(currentUser.totpActivatedAt)}. Esta cuenta no permite inicio de sesión offline sin verificación del servidor.
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección Dispositivos de Confianza */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-blue-800" />
                      <span>Dispositivos de Confianza ({trustedDevices.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Los equipos autorizados omiten el código 2FA mientras se inicie sesión al menos una vez cada 7 días.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrentDeviceTrusted && !showTrustForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowTrustForm(true);
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Confiar en Este Equipo</span>
                      </button>
                    )}

                    {trustedDevices.length > 0 && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRevokeDevice('all')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revocar Todos</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Formulario inline para confiar en este dispositivo */}
                {showTrustForm && (
                  <form
                    onSubmit={handleTrustCurrentDevice}
                    className="p-4 bg-blue-50/70 border-b border-blue-200 space-y-2.5"
                  >
                    <div className="font-bold text-blue-950">
                      Autorizar este navegador como Dispositivo de Confianza
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={8}
                        value={trustCode}
                        onChange={(e) => setTrustCode(e.target.value)}
                        placeholder="Código 6 dígitos Google Auth *"
                        className="px-3 py-2 bg-white border border-blue-300 rounded-lg font-mono font-bold text-xs"
                      />
                      <input
                        type="text"
                        maxLength={60}
                        value={trustDeviceLabel}
                        onChange={(e) => setTrustDeviceLabel(e.target.value)}
                        placeholder="Nombre del equipo (opcional)"
                        className="px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTrustForm(false)}
                        className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold cursor-pointer"
                      >
                        Confirmar y Confiar
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Dispositivos */}
                <div className="divide-y divide-slate-100">
                  {trustedDevices.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 space-y-1">
                      <Laptop className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-semibold text-slate-700">
                        No hay dispositivos de confianza activos
                      </div>
                      <p className="text-[11px]">
                        Puede marcar "Agregar este dispositivo como de confianza" al iniciar sesión o usando el botón superior.
                      </p>
                    </div>
                  ) : (
                    trustedDevices.map((dev) => {
                      const isThisBrowser = dev.id === localDeviceId;
                      const expiry = getDeviceExpiryInfo(dev.lastUsedAt);
                      return (
                        <div
                          key={dev.id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isThisBrowser ? 'bg-blue-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Laptop className="w-4 h-4 text-slate-600" />
                              <span className="font-bold text-slate-900">{dev.label}</span>
                              {isThisBrowser && (
                                <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full font-bold">
                                  Este navegador
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>Último acceso: {formatDateTimeAr(dev.lastUsedAt)}</span>
                              {dev.ipOrigen && <span>IP: {dev.ipOrigen}</span>}
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                <Clock className="w-3 h-3" />
                                Caduca sin uso el {expiry.expiresText} ({expiry.daysLeft}d)
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRevokeDevice(dev.id)}
                            className="self-start sm:self-center flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revocar</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sección Desactivar 2FA */}
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDisableSection((prev) => !prev)}
                  className="w-full px-4 py-3 bg-red-50/60 hover:bg-red-50 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-red-900 font-bold">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Desactivar Google Authenticator (2FA)</span>
                  </div>
                  <span className="text-[11px] text-red-700 font-semibold">
                    {showDisableSection ? 'Ocultar' : 'Expandir'}
                  </span>
                </button>

                {showDisableSection && (
                  <form onSubmit={handleDisable2fa} className="p-4 bg-white space-y-3 border-t border-red-100">
                    <p className="text-[11px] text-slate-600">
                      Al desactivar 2FA se eliminarán también todos sus dispositivos de confianza y códigos de respaldo.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700">Contraseña Actual *</label>
                          <button
                            type="button"
                            onClick={() => setShowDisablePass((v) => !v)}
                            className="text-[11px] text-blue-700 hover:underline cursor-pointer"
                          >
                            {showDisablePass ? 'Ocultar' : 'Mostrar'}
                          </button>
                        </div>
                        <input
                          type={showDisablePass ? 'text' : 'password'}
                          required
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Contraseña actual"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Código 2FA o de Respaldo *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={disableCode}
                          onChange={(e) => setDisableCode(e.target.value)}
                          placeholder="6 dígitos o respaldo"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer"
                      >
                        Confirmar Desactivación de 2FA
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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

import React, { useState } from 'react';
import { UsuarioSistema, DelegacionPolicial } from '../../types/police';
import { DEFAULT_USUARIOS } from '../../db/database';
import { loginOnServer, verify2faLoginOnServer } from '../../services/apiService';
import { verificarOfflineVerifier } from '../../services/securityClient';
import {
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  WifiOff,
  Smartphone,
  KeyRound,
  Laptop,
  AlertTriangle,
} from 'lucide-react';

interface LoginViewProps {
  usuariosList: UsuarioSistema[];
  delegacionesList: DelegacionPolicial[];
  onLoginSuccess: (user: UsuarioSistema) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  usuariosList,
  onLoginSuccess,
}) => {
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estado Paso 2: Google Authenticator + Dispositivo de Confianza
  const [pendingToken, setPendingToken] = useState('');
  const [pendingUserLabel, setPendingUserLabel] = useState('');
  const [expiredTrustedDevice, setExpiredTrustedDevice] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shieldImg =
    '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png';

  const effectiveUsersList =
    usuariosList && usuariosList.length > 0 ? usuariosList : DEFAULT_USUARIOS;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setOfflineNotice(false);

    const term = usernameOrEmail.trim().toLowerCase();
    const pass = password.trim();

    if (!term || !pass) {
      setErrorMsg('Por favor, ingrese su usuario/correo y contraseña institucional.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Autenticación prioritaria contra el servidor central (scrypt + token firmado + anti-fuerza bruta + trusted device)
      const serverRes = await loginOnServer(term, pass);

      if (serverRes.ok && serverRes.user) {
        setIsLoading(false);
        onLoginSuccess(serverRes.user);
        return;
      }

      // Si la cuenta requiere Google Authenticator (2FA)
      if (serverRes.requires2fa && serverRes.pendingToken) {
        setIsLoading(false);
        setPendingToken(serverRes.pendingToken);
        setPendingUserLabel(
          serverRes.apellidoYNombre
            ? `${serverRes.apellidoYNombre} (@${serverRes.username || term})`
            : `@${serverRes.username || term}`
        );
        setExpiredTrustedDevice(Boolean(serverRes.expiredTrustedDevice));
        setTotpCode('');
        setTrustDevice(false);
        setDeviceLabel('');
        setStep('2fa');
        return;
      }

      // Si el servidor respondió rechazando credenciales o bloqueando por fuerza bruta (401/429)
      if (!serverRes.offline) {
        setIsLoading(false);
        setErrorMsg(serverRes.error || 'Credenciales incorrectas o usuario inactivo.');
        return;
      }

      // 2. Fallback exclusivo en modo Offline PWA (sin conectividad al servidor central)
      setOfflineNotice(true);
      const candidate = effectiveUsersList.find(
        (u) =>
          u &&
          u.activo &&
          ((u.username && u.username.toLowerCase() === term) ||
            (u.email && u.email.toLowerCase() === term))
      );

      if (candidate?.totpEnabled) {
        setIsLoading(false);
        setErrorMsg(
          'Esta cuenta posee Google Authenticator (2FA) activo. Requiere conexión con el servidor central para verificar el segundo factor.'
        );
        return;
      }

      if (candidate) {
        const matchVerifier = candidate.offlineVerifier
          ? await verificarOfflineVerifier(candidate.username, pass, candidate.offlineVerifier)
          : false;
        const matchLegacy = !candidate.offlineVerifier && candidate.password === pass;

        if (matchVerifier || matchLegacy) {
          setIsLoading(false);
          onLoginSuccess({ ...candidate, password: '' });
          return;
        }
      }

      // Fallback de emergencia solo offline sobre cuentas iniciales si no existe aún en IndexedDB
      const defCandidate = DEFAULT_USUARIOS.find(
        (u) =>
          u &&
          ((u.username && u.username.toLowerCase() === term) ||
            (u.email && u.email.toLowerCase() === term)) &&
          u.password === pass
      );

      if (defCandidate && !candidate) {
        setIsLoading(false);
        onLoginSuccess({ ...defCandidate, password: '' });
        return;
      }

      setIsLoading(false);
      setErrorMsg('Sin conexión al servidor y credenciales offline no verificadas.');
    } catch {
      setIsLoading(false);
      setErrorMsg('Error al intentar iniciar sesión.');
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = totpCode.trim();
    if (!cleanCode) {
      setErrorMsg('Ingrese el código de 6 dígitos de Google Authenticator o un código de respaldo.');
      return;
    }

    setIsLoading(true);
    const res = await verify2faLoginOnServer({
      pendingToken,
      code: cleanCode,
      trustDevice,
      deviceLabel: deviceLabel.trim() || undefined,
      rawPassword: password.trim(),
    });
    setIsLoading(false);

    if (!res.ok || !res.user) {
      setErrorMsg(res.error || 'Código inválido o expirado.');
      return;
    }

    onLoginSuccess(res.user);
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setPendingToken('');
    setTotpCode('');
    setExpiredTrustedDevice(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Fondo con patrones tecnológicos y patrulla */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Tarjeta Central de Login */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md p-6 sm:p-8 relative z-10 space-y-5">
        {/* Cabecera con Escudo Oficial D.G.P.C. */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="relative group cursor-pointer transition-transform hover:scale-105 duration-300">
            <div className="absolute inset-0 bg-blue-500/25 blur-xl rounded-full" />
            <img
              src={shieldImg}
              alt="Escudo Oficial D.G.P.C. Policía de Formosa"
              className="w-28 h-auto object-contain drop-shadow-[0_10px_15px_rgba(30,58,138,0.5)] relative z-10 mx-auto"
            />
          </div>

          <div className="pt-2">
            <h1 className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              POLICÍA DE LA PROVINCIA DE FORMOSA
            </h1>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide mt-0.5">
              DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA
            </h2>
            <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 bg-blue-950/80 border border-blue-500/40 rounded-full text-[11px] font-bold text-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>CRIMINI-SISTEM • Sistema de Gestión Multi-Delegación</span>
            </div>
          </div>
        </div>

        {/* Aviso Offline */}
        {offlineNotice && (
          <div className="bg-amber-950/70 border border-amber-700 text-amber-200 px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Modo Offline detectado: verificando credenciales locales cifradas.</span>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'credentials' ? (
          /* PASO 1: CREDENCIALES */
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Usuario institucional o Correo:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  name="sispol_user"
                  id="sispol_user"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="ej: usuario o correo institucional"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  Contraseña de acceso:
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Scrypt + HMAC-SHA256</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  name="sispol_password"
                  id="sispol_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer mt-1"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* PASO 2: VERIFICACIÓN GOOGLE AUTHENTICATOR + DISPOSITIVO DE CONFIANZA */
          <form onSubmit={handleVerify2fa} autoComplete="off" className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="p-3 bg-slate-950/90 border border-slate-700 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-700/60 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate">
                  Verificación en Dos Pasos (2FA)
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {pendingUserLabel}
                </div>
              </div>
            </div>

            {expiredTrustedDevice && (
              <div className="p-3 bg-amber-950/70 border border-amber-700/80 rounded-xl text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Este dispositivo de confianza superó los <strong>7 días sin iniciar sesión</strong> y caducó por seguridad. Ingrese el código de Google Authenticator para validarlo nuevamente.
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  Código de Google Authenticator:
                </label>
                <span className="text-[10px] text-slate-400">6 dígitos o código respaldo</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={12}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono font-bold tracking-[0.3em] text-center text-sm"
                />
              </div>
            </div>

            {/* Opción de Dispositivo de Confianza */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Agregar este dispositivo como de confianza</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed">
                    No pedirá el código 2FA en futuros ingresos desde este equipo. Si pasa <strong>1 semana (7 días) sin iniciar sesión</strong>, volverá a solicitarlo.
                  </span>
                </div>
              </label>

              {trustDevice && (
                <input
                  type="text"
                  maxLength={60}
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="Nombre del equipo (opcional, ej: Oficina Criminalística)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verificar e Ingresar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToCredentials}
                className="w-full py-2 text-slate-400 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver e ingresar con otra cuenta</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Pie de página institucional */}
      <footer className="mt-6 text-center text-[11px] text-slate-500 space-y-1 relative z-10">
        <p>Dirección General de Policía Científica • Policía de la Provincia de Formosa</p>
        <p className="text-[10px] text-slate-600 font-mono">
          Acceso Restringido a Personal Policial y Pericial Autorizado
        </p>
      </footer>
    </div>
  );
};


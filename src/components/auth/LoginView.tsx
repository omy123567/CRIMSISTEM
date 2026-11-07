import React, { useState } from 'react';
import { UsuarioSistema, DelegacionPolicial } from '../../types/police';
import { DEFAULT_USUARIOS } from '../../db/database';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
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
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const shieldImg =
    '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png';

  const effectiveUsersList =
    usuariosList && usuariosList.length > 0 ? usuariosList : DEFAULT_USUARIOS;

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const term = usernameOrEmail.trim().toLowerCase();
    const pass = password.trim();

    if (!term || !pass) {
      setErrorMsg('Por favor, ingrese su usuario/correo y contraseña institucional.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Buscar en lista activa o en lista por defecto
      const user =
        effectiveUsersList.find(
          (u) =>
            u &&
            u.activo &&
            ((u.username && u.username.toLowerCase() === term) ||
              (u.email && u.email.toLowerCase() === term)) &&
            u.password === pass
        ) ||
        DEFAULT_USUARIOS.find(
          (u) =>
            u &&
            ((u.username && u.username.toLowerCase() === term) ||
              (u.email && u.email.toLowerCase() === term)) &&
            u.password === pass
        );

      if (!user) {
        setIsLoading(false);
        setErrorMsg('Credenciales incorrectas o usuario inactivo en el sistema.');
        return;
      }

      setIsLoading(false);
      onLoginSuccess(user);
    }, 300);
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

        {/* Error Feedback */}
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Login */}
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
              <span className="text-[10px] text-slate-400">Seguridad Encriptada</span>
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

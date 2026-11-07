import React, { useState, useEffect } from 'react';
import { PoliceShieldIcon } from '../common/PoliceShieldIcon';
import { ConfiguracionSistema, UsuarioSistema, DelegacionPolicial } from '../../types/police';
import {
  Wifi,
  WifiOff,
  Clock,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Lock,
  LogOut,
  ChevronDown,
  Shield,
  KeyRound,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { OfflineIndicator } from '../common/OfflineIndicator';

interface NavbarProps {
  config: ConfiguracionSistema;
  currentUser: UsuarioSistema | null;
  activeDelegacionId: string;
  delegacionesList: DelegacionPolicial[];
  onSelectDelegacion: (delegacionId: string) => void;
  onOpenCambiarPassword: () => void;
  onLogout: () => void;
  onOpenBackups: () => void;
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  currentUser,
  activeDelegacionId,
  delegacionesList,
  onSelectDelegacion,
  onOpenCambiarPassword,
  onLogout,
  onOpenBackups,
  isSidebarVisible = true,
  onToggleSidebar,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('es-AR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeDelegacion =
    delegacionesList.find((d) => d.id === activeDelegacionId) || delegacionesList[0];

  // Determinar si el usuario tiene permiso para cambiar de delegación
  const puedeCambiarDelegacion = Boolean(
    currentUser &&
      (currentUser.rol === 'superusuario' || currentUser.puedeVerOtrasDelegaciones)
  );

  // Lista de delegaciones permitidas para este usuario
  const delegacionesDisponibles = delegacionesList.filter((d) => {
    if (!currentUser) return false;
    if (currentUser.rol === 'superusuario') return true;
    if (!currentUser.puedeVerOtrasDelegaciones) return d.id === currentUser.delegacionId;
    if (currentUser.delegacionesPermitidas && currentUser.delegacionesPermitidas.length > 0) {
      return (
        d.id === currentUser.delegacionId ||
        currentUser.delegacionesPermitidas.includes(d.id)
      );
    }
    return true;
  });

  const getRoleBadgeStyle = (rol?: string) => {
    switch (rol) {
      case 'superusuario':
        return 'bg-purple-900/60 text-purple-200 border-purple-500/50';
      case 'Administrador':
        return 'bg-amber-900/60 text-amber-200 border-amber-500/50';
      case 'Operador':
      default:
        return 'bg-blue-900/60 text-blue-200 border-blue-500/50';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-18 py-2">
          {/* Logo & Header Info con Nombre de Delegación correspondiente */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  isSidebarVisible
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-sm ring-2 ring-blue-400/50'
                }`}
                title={isSidebarVisible ? 'Ocultar menú de módulos' : 'Mostrar menú de módulos'}
                aria-label="Alternar menú de módulos"
              >
                {isSidebarVisible ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5 text-white animate-pulse" />
                )}
              </button>
            )}

            <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-600/50 flex items-center justify-center text-blue-400 shadow-inner shrink-0 overflow-hidden">
              {activeDelegacion?.logoDerechoUrl ? (
                <img
                  src={activeDelegacion.logoDerechoUrl}
                  alt="Escudo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <PoliceShieldIcon className="w-6 h-6 text-blue-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base tracking-wider text-blue-100 uppercase">
                  Crimini-Sistem
                </span>
                <span className="bg-blue-600/30 text-blue-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold border border-blue-500/40 shrink-0">
                  {activeDelegacion?.siglas || config.siglasDependencia || 'DPC'}
                </span>
                {/* Nombre de la Delegación correspondiente */}
                <span className="text-xs font-bold text-amber-300 border-l border-slate-700 pl-2 truncate tracking-wide max-w-xs sm:max-w-md lg:max-w-lg">
                  {activeDelegacion?.nombre || config.dependencia}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {activeDelegacion?.ciudad ? `Jurisdicción: ${activeDelegacion.ciudad}` : config.unidadRegional} • {config.nombreInstitucion}
              </div>
            </div>
          </div>

          {/* Controls: Reloj + Selector de Delegación debajo + Badges + Usuario */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Bloque: Fecha/Hora y DEBAJO Selector de Delegación si cuenta con permisos */}
            <div className="flex flex-col items-end gap-1">
              {/* Reloj Oficial */}
              <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-slate-800/90 px-2.5 py-1 rounded border border-slate-700 font-mono shadow-inner">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] sm:text-xs font-semibold">{currentTime}</span>
              </div>

              {/* Debajo de la Fecha y Hora: Visualizar datos de otra Delegación si tiene permisos */}
              {puedeCambiarDelegacion ? (
                <div className="flex items-center gap-1.5 bg-blue-950/90 text-blue-200 text-xs px-2 py-0.5 rounded border border-blue-600/60 shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-blue-300 hidden sm:inline">
                    Delegación:
                  </span>
                  <select
                    value={activeDelegacionId}
                    onChange={(e) => onSelectDelegacion(e.target.value)}
                    aria-label="Seleccionar Delegación a visualizar"
                    className="bg-slate-900 text-amber-300 text-xs font-semibold py-0.5 px-1 rounded border border-blue-500/50 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
                  >
                    {delegacionesDisponibles.map((del) => (
                      <option key={del.id} value={del.id} className="bg-slate-900 text-white">
                        {del.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div
                  title="Delegación Asignada a su usuario institucional"
                  className="flex items-center gap-1 bg-slate-800/80 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700"
                >
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px] font-medium text-slate-300">
                    {activeDelegacion?.ciudad || activeDelegacion?.nombre || 'Delegación Oficial'}
                  </span>
                </div>
              )}
            </div>

            {/* Indicador de Sincronización con Servidor Central / Modo Offline */}
            <OfflineIndicator />

            {/* Botón de Instalación Multiplataforma (PWA Android, Windows, iOS, Mac, Linux) */}
            <PWAInstallButton />

            {/* Usuario Actual & Menú de Sesión */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-700 border border-blue-400/50 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {(currentUser.apellidoYNombre || currentUser.username || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="font-semibold text-slate-200 text-xs leading-tight truncate max-w-[120px]">
                      {(currentUser.apellidoYNombre || currentUser.username || 'Usuario').split(
                        ','
                      )[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      @{currentUser.username || 'usuario'}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getRoleBadgeStyle(
                      currentUser.rol
                    )}`}
                  >
                    {currentUser.rol || 'Operador'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="p-3 bg-slate-800/80 border-b border-slate-700">
                      <div className="font-bold text-white text-sm">
                        {currentUser.apellidoYNombre || currentUser.username || 'Usuario Institucional'}
                      </div>
                      <div className="text-xs text-slate-400">@{currentUser.username || 'usuario'}</div>
                      <div className="text-[11px] text-blue-300 mt-1">{currentUser.email || ''}</div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getRoleBadgeStyle(
                            currentUser.rol
                          )}`}
                        >
                          Rol: {currentUser.rol || 'Operador'}
                        </span>
                        {currentUser.puedeEliminar && (
                          <span className="text-[10px] bg-red-950/60 text-red-300 border border-red-700/50 px-1.5 py-0.5 rounded">
                            Permiso Eliminar
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenCambiarPassword();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        <span>Cambiar mi Contraseña</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-950/50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


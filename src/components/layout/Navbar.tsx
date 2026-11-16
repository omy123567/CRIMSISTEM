import React, { useState, useEffect } from 'react';
import { PoliceShieldIcon } from '../common/PoliceShieldIcon';
import {
  ConfiguracionSistema,
  UsuarioSistema,
  DelegacionPolicial,
  AvisoNovedad,
  MovilPolicial,
} from '../../types/police';
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
  Bell,
  Flame,
  AlertTriangle,
  ArrowRight,
  Car,
  Wrench,
  Gauge,
  Calendar,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { OfflineIndicator } from '../common/OfflineIndicator';

interface NavbarProps {
  config: ConfiguracionSistema;
  currentUser: UsuarioSistema | null;
  activeDelegacionId: string;
  delegacionesList: DelegacionPolicial[];
  novedadesList?: AvisoNovedad[];
  movilesList?: MovilPolicial[];
  onNavigateToNovedades?: () => void;
  onNavigateToMoviles?: () => void;
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
  novedadesList = [],
  movilesList = [],
  onNavigateToNovedades,
  onNavigateToMoviles,
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
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'novedades' | 'moviles'>('novedades');

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

  const notificacionesRelevantes = (novedadesList || []).filter(
    (n) =>
      n.destinoDelegacionId === 'TODAS' ||
      n.destinoDelegacionId === activeDelegacionId ||
      n.destinoDelegacionId === currentUser?.delegacionId
  );

  // Cálculo de Alertas de Mantenimiento de Móviles (RTO y Servis)
  const diasAvisoRto = config.recordatorioRtoDias ?? 30;
  const kmAvisoService = config.recordatorioServiceKm ?? 500;
  const intervaloServiceKm = config.intervaloServiceKm ?? 10000;

  const alertasVehiculos = (movilesList || [])
    .filter((m) => {
      if (!currentUser?.delegacionId || currentUser.rol === 'superusuario' || currentUser.puedeVerOtrasDelegaciones) return true;
      return m.delegacionId === activeDelegacionId || m.delegacionId === currentUser.delegacionId;
    })
    .flatMap((m) => {
      const items: Array<{
        id: string;
        tipo: 'RTO' | 'SERVICE';
        titulo: string;
        mensaje: string;
        urgente: boolean;
        vencido: boolean;
      }> = [];

      // 1. RTO (Excepto Motovehículos / Motocicletas según requerimiento)
      const esMoto = m.tipo === 'Motovehículo' || (m.tipo as any) === 'Motocicleta';
      if (!esMoto && m.vencimientoRTO) {
        const diffMs = new Date(m.vencimientoRTO).getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= diasAvisoRto) {
          const vencido = diffDays <= 0;
          items.push({
            id: 'rto-' + m.id,
            tipo: 'RTO',
            urgente: vencido || diffDays <= 7,
            vencido,
            titulo: vencido ? '¡RTO Vencido!' : 'RTO Próximo a Vencer',
            mensaje: `Móvil ${m.nroMovilInterno} (${m.marca} ${m.modelo} - ${m.dominioPatente}) ${
              vencido
                ? `venció hace ${Math.abs(diffDays)} días (${m.vencimientoRTO})`
                : `vence en ${diffDays} días (${m.vencimientoRTO})`
            }`,
          });
        }
      }

      // 2. Service Preventivo
      const proxService = m.proximoServiceKm || (m.ultimoServiceKm ? m.ultimoServiceKm + intervaloServiceKm : 10000);
      const kmFaltantes = proxService - (m.kilometrajeActual || 0);
      if (kmFaltantes <= kmAvisoService) {
        const vencido = kmFaltantes <= 0;
        items.push({
          id: 'serv-' + m.id,
          tipo: 'SERVICE',
          urgente: vencido,
          vencido,
          titulo: vencido ? '¡Service Vencido!' : 'Service Preventivo Próximo',
          mensaje: `Móvil ${m.nroMovilInterno} (${m.marca} ${m.modelo}) ${
            vencido
              ? `superó el kilometraje por ${Math.abs(kmFaltantes)} km (Actual: ${m.kilometrajeActual} km / Límite: ${proxService} km)`
              : `a ${kmFaltantes} km del service programado (Actual: ${m.kilometrajeActual} km / Límite: ${proxService} km)`
          }`,
        });
      }

      return items;
    });

  const cantUrgentesNovedades = notificacionesRelevantes.filter(
    (n) => n.prioridad === 'Urgente' || n.prioridad === 'Alta'
  ).length;

  const cantUrgentesVehiculos = alertasVehiculos.filter((a) => a.urgente).length;
  const cantUrgentes = cantUrgentesNovedades + cantUrgentesVehiculos;
  const totalNotificaciones = notificacionesRelevantes.length + alertasVehiculos.length;


  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 border-t-2 border-t-blue-600 sticky top-0 z-40 shadow-md">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Logo & Header Info con Nombre de Delegación correspondiente */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  isSidebarVisible
                    ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-sm ring-2 ring-blue-400/40'
                }`}
                title={isSidebarVisible ? 'Ocultar menú de módulos' : 'Mostrar menú de módulos'}
                aria-label="Alternar menú de módulos"
              >
                {isSidebarVisible ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-white animate-pulse" />
                )}
              </button>
            )}

            <div className="w-9 h-9 rounded-lg bg-blue-950/70 border border-blue-600/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0 overflow-hidden">
              {activeDelegacion?.logoDerechoUrl ? (
                <img
                  src={activeDelegacion.logoDerechoUrl}
                  alt="Escudo"
                  className="w-7 h-7 object-contain"
                />
              ) : (
                <PoliceShieldIcon className="w-5 h-5 text-blue-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-widest text-white uppercase whitespace-nowrap">
                  CRIMINI-SISTEM
                </span>
                <span className="bg-sky-500/15 text-sky-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-sky-500/30 shrink-0">
                  {activeDelegacion?.siglas || config.siglasDependencia || 'DPC'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[220px] xl:max-w-[280px]">
                {activeDelegacion?.nombre || config.dependencia}
              </div>
            </div>
          </div>

          {/* Centro: Barra Unificada de Delegación y Reloj Oficial */}
          <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-inner gap-2.5 min-w-0">
            {puedeCambiarDelegacion ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="hidden xl:inline text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">
                  Delegación:
                </span>
                <select
                  value={activeDelegacionId}
                  onChange={(e) => onSelectDelegacion(e.target.value)}
                  aria-label="Seleccionar Delegación a visualizar"
                  className="bg-slate-950 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded border border-slate-700 focus:border-sky-500 focus:outline-none cursor-pointer max-w-[165px] xl:max-w-[225px] truncate"
                >
                  {delegacionesDisponibles.map((del) => (
                    <option key={del.id} value={del.id} className="bg-slate-900 text-white">
                      {del.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[165px] xl:max-w-[225px]">
                  {activeDelegacion?.nombre || 'Delegación Oficial'}
                </span>
              </div>
            )}

            <div className="w-px h-4 bg-slate-700 shrink-0" />

            {/* Reloj Oficial */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-200 shrink-0">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">{currentTime}</span>
            </div>
          </div>

          {/* Controls: Selector móvil + Notificaciones + Offline + PWA + Usuario */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Selector de Delegación en pantallas medianas */}
            {puedeCambiarDelegacion && (
              <div className="lg:hidden flex items-center">
                <select
                  value={activeDelegacionId}
                  onChange={(e) => onSelectDelegacion(e.target.value)}
                  className="bg-slate-900 text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer max-w-[125px] sm:max-w-[160px] truncate"
                >
                  {delegacionesDisponibles.map((del) => (
                    <option key={del.id} value={del.id} className="bg-slate-900 text-white">
                      {del.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notificaciones de Novedades e Inter-Delegaciones & Alertas de Parque Automotor */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotificationsMenu(!showNotificationsMenu);
                  setShowUserMenu(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  cantUrgentes > 0
                    ? 'bg-rose-950/70 text-rose-200 border-rose-600/70 animate-pulse'
                    : totalNotificaciones > 0
                    ? 'bg-slate-900 text-sky-300 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
                title="Notificaciones: Novedades inter-delegaciones y Alertas de Servis/RTO"
              >
                <div className="relative">
                  <Bell className="w-4 h-4" />
                  {cantUrgentes > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-ping" />
                  ) : null}
                </div>
                <span className="hidden sm:inline">Notificaciones</span>
                {totalNotificaciones > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      cantUrgentes > 0 ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                    }`}
                  >
                    {totalNotificaciones}
                  </span>
                )}
              </button>

              {showNotificationsMenu && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150"
                  onMouseLeave={() => setShowNotificationsMenu(false)}
                >
                  {/* Cabecera del Menú con Pestañas */}
                  <div className="p-3 bg-slate-800 border-b border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white text-xs">
                          Centro de Notificaciones ({totalNotificaciones})
                        </span>
                      </div>
                      {cantUrgentes > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{cantUrgentes} Urgente(s)</span>
                        </span>
                      )}
                    </div>

                    {/* Selector de Pestaña */}
                    <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveNotifTab('novedades')}
                        className={`py-1 px-2 rounded-md font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          activeNotifTab === 'novedades'
                            ? 'bg-blue-800 text-white shadow-2xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Avisos ({notificacionesRelevantes.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveNotifTab('moviles')}
                        className={`py-1 px-2 rounded-md font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          activeNotifTab === 'moviles'
                            ? 'bg-amber-800 text-white shadow-2xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Móviles / RTO ({alertasVehiculos.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Contenido Pestaña 1: Novedades entre Delegaciones */}
                  {activeNotifTab === 'novedades' && (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 p-1">
                      {notificacionesRelevantes.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No hay novedades pendientes ni avisos para esta delegación.
                        </div>
                      ) : (
                        notificacionesRelevantes.slice(0, 5).map((n) => (
                          <div key={n.id} className="p-2.5 hover:bg-slate-800/60 rounded-lg transition-colors space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  n.prioridad === 'Urgente'
                                    ? 'bg-red-900/80 text-red-200 border border-red-700'
                                    : n.prioridad === 'Alta'
                                    ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                                    : 'bg-blue-900/80 text-blue-200 border border-blue-700'
                                }`}
                              >
                                {n.prioridad}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(n.fechaHora || n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                              {n.mensaje}
                            </p>
                            <div className="text-[10px] text-slate-400 flex items-center justify-between">
                              <span>De: <strong>{n.origenDelegacionNombre}</strong></span>
                              <span>A: <strong>{n.destinoDelegacionNombre || n.destinatarioDelegacionNombre || 'Todas'}</strong></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Contenido Pestaña 2: Alertas de Mantenimiento de Móviles (RTO y Servis) */}
                  {activeNotifTab === 'moviles' && (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 p-1">
                      {alertasVehiculos.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          ✓ Todo en regla. No hay vencimientos de RTO ni servicios preventivos inmediatos.
                        </div>
                      ) : (
                        alertasVehiculos.map((al) => (
                          <div key={al.id} className="p-2.5 hover:bg-slate-800/60 rounded-lg transition-colors space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                                  al.vencido
                                    ? 'bg-red-900 text-red-200 border border-red-700'
                                    : 'bg-amber-900 text-amber-200 border border-amber-700'
                                }`}
                              >
                                {al.tipo === 'RTO' ? <Calendar className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                                <span>{al.titulo}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold">
                                {al.tipo}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-relaxed">
                              {al.mensaje}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Acciones de Navegación Rápida */}
                  <div className="p-2 bg-slate-800/90 border-t border-slate-700 flex items-center gap-2">
                    {onNavigateToNovedades && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotificationsMenu(false);
                          onNavigateToNovedades();
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Novedades</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {onNavigateToMoviles && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotificationsMenu(false);
                          onNavigateToMoviles();
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Parque Automotor</span>
                      </button>
                    )}
                  </div>
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
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
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


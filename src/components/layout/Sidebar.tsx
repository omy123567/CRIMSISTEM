import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Car,
  ClockAlert,
  ClipboardList,
  Stethoscope,
  Settings,
  ShieldAlert,
  Database,
  Layers,
  Camera,
  PanelLeftClose,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  FileCheck2,
  Activity,
  Sliders,
  ChevronDown,
  ChevronRight,
  FolderTree,
  BookmarkCheck,
} from 'lucide-react';
import { UsuarioSistema, ConfiguracionSistema, ModuloEstructuraConfig } from '../../types/police';
import { AdministrarModulosModal } from './AdministrarModulosModal';

export type ActiveTab =
  | 'dashboard'
  | 'personal'
  | 'grupos'
  | 'expedientes'
  | 'falta-oficio'
  | 'moviles'
  | 'recargos'
  | 'guardias'
  | 'inspecciones'
  | 'intervenciones'
  | 'causas-policiales'
  | 'personas'
  | 'vehiculos'
  | 'forense'
  | 'licenciados'
  | 'informes-tecnicos'
  | 'accidentologia'
  | 'numerario'
  | 'usuarios'
  | 'auditoria'
  | 'config';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser?: UsuarioSistema | null;
  onToggleCollapse?: () => void;
  config?: ConfiguracionSistema;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
  badgeCounts?: {
    faltaOficio?: number;
    movilesTaller?: number;
    armasRetenidas?: number;
    inspecciones?: number;
    personasTotal?: number;
    vehiculosTotal?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onToggleCollapse,
  config,
  onSaveConfig,
  badgeCounts = {},
}) => {
  const [isAdminModulosOpen, setIsAdminModulosOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Ejecutivo',
      icon: LayoutDashboard,
      desc: 'KPIs y Estadísticas',
    },
    {
      id: 'personal',
      label: 'Personal y Legajos',
      icon: Users,
      desc: 'Nómina, Armas y Chalecos',
      badge: badgeCounts.armasRetenidas ? `${badgeCounts.armasRetenidas} ret.` : undefined,
      badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-600/50',
    },
    {
      id: 'grupos',
      label: 'Grupos',
      icon: Layers,
      desc: 'Secciones de Guardia & Nómina',
    },
    {
      id: 'expedientes',
      label: 'Expedientes Judiciales',
      icon: FileText,
      desc: 'Oficios, Tareas y PPI',
    },
    {
      id: 'falta-oficio',
      label: 'Casos Falta de Oficio',
      icon: ShieldAlert,
      desc: 'Urgencias preliminares',
      badge: badgeCounts.faltaOficio ? `${badgeCounts.faltaOficio}` : undefined,
      badgeColor: 'bg-red-600/30 text-red-300 border-red-600/50',
    },
    {
      id: 'moviles',
      label: 'Parque Automotor',
      icon: Car,
      desc: 'Móviles y Reparaciones',
      badge: badgeCounts.movilesTaller ? `${badgeCounts.movilesTaller} taller` : undefined,
      badgeColor: 'bg-orange-600/30 text-orange-300 border-orange-600/50',
    },
    {
      id: 'recargos',
      label: 'Recargos Operativos',
      icon: ClockAlert,
      desc: 'Servicios extraordinarios',
    },
    {
      id: 'guardias',
      label: 'Parte de Novedades',
      icon: ClipboardList,
      desc: 'Guardia & Criminalística',
    },
    {
      id: 'inspecciones',
      label: 'Inspecciones Oculares',
      icon: Camera,
      desc: 'Intervenciones Criminalísticas',
      badge: badgeCounts.inspecciones ? `${badgeCounts.inspecciones}` : undefined,
      badgeColor: 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50',
    },
    {
      id: 'intervenciones',
      label: 'Intervenciones',
      icon: Activity,
      desc: 'LC & Siniestros Viales',
    },
    {
      id: 'causas-policiales',
      label: 'Causas c/ Pers. Policial',
      icon: ShieldAlert,
      desc: 'Hechos con Efectivos Policiales',
    },
    {
      id: 'personas',
      label: 'Personas',
      icon: Users,
      desc: 'Involucrados & Testigos',
    },
    {
      id: 'vehiculos',
      label: 'Vehículos',
      icon: Car,
      desc: 'Rodados en Siniestros Viales',
    },
    {
      id: 'forense',
      label: 'Forense Policial',
      icon: Stethoscope,
      desc: 'Médico y Examinados',
    },
    {
      id: 'licenciados',
      label: 'Licenciado',
      icon: GraduationCap,
      desc: 'Personal Profesional',
    },
    {
      id: 'informes-tecnicos',
      label: 'Informes Técnicos',
      icon: FileCheck2,
      desc: 'Oficios, Dictámenes & Elevación',
    },
    {
      id: 'accidentologia',
      label: 'Accidentología',
      icon: Car,
      desc: 'Siniestros c/ Personal Policial',
    },
    {
      id: 'numerario',
      label: 'Control de Folios',
      icon: BookmarkCheck,
      desc: 'Numerario y Asignación de Folios',
    },
    {
      id: 'usuarios',
      label: 'Gestión de Usuarios',
      icon: ShieldCheck,
      desc: 'Roles, Permisos & Cuentas',
    },
    {
      id: 'auditoria',
      label: 'Auditoría del Sistema',
      icon: Activity,
      desc: 'Trazabilidad de Acciones (Superusuario)',
    },
    {
      id: 'config',
      label: 'Configuración & Membrete',
      icon: Settings,
      desc: 'Ajustes, Membrete & Backups',
    },
  ];

  // Verificar si un módulo está permitido para el usuario
  const isModuleAllowed = (id: string) => {
    if (!currentUser) return true;
    if (id === 'auditoria') {
      return currentUser.rol === 'superusuario';
    }
    if (currentUser.rol === 'superusuario') return true;
    if (currentUser.modulosPermitidos && currentUser.modulosPermitidos.length > 0) {
      return currentUser.modulosPermitidos.includes(id);
    }
    if (currentUser.rol === 'Administrador') return true;
    if (id === 'usuarios' || id === 'config') return false;
    return true;
  };

  // Mapear configuración de estructura personalizada
  const estructuraMap = new Map<string, ModuloEstructuraConfig>();
  if (config?.estructuraModulos && config.estructuraModulos.length > 0) {
    config.estructuraModulos.forEach((it) => estructuraMap.set(it.id, it));
  }

  // Ordenar todos los items según `orden` configurado
  const sortedItems = [...allMenuItems].sort((a, b) => {
    const ordA = estructuraMap.get(a.id)?.orden ?? 99;
    const ordB = estructuraMap.get(b.id)?.orden ?? 99;
    return ordA - ordB;
  });

  // Agrupar módulos principales y submódulos
  const submodulosMap = new Map<string, typeof allMenuItems>();
  const modulosPrincipales: typeof allMenuItems = [];

  sortedItems.forEach((item) => {
    // Si está explícitamente configurado como no visible y no es admin
    const conf = estructuraMap.get(item.id);
    if (conf && conf.visible === false) return;

    if (!isModuleAllowed(item.id)) return;

    const padreId = conf?.padreId;
    if (padreId && allMenuItems.some((m) => m.id === padreId)) {
      const list = submodulosMap.get(padreId) || [];
      list.push(item);
      submodulosMap.set(padreId, list);
    } else {
      modulosPrincipales.push(item);
    }
  });

  // Expandir automáticamente el padre si un submódulo está activo
  useEffect(() => {
    submodulosMap.forEach((children, parentId) => {
      if (children.some((c) => c.id === activeTab)) {
        setExpandedParents((prev) => ({ ...prev, [parentId]: true }));
      }
    });
  }, [activeTab]);

  const toggleExpand = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const canAdminModules =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeAdministrarModulos);

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 text-slate-200 shrink-0">
      <div className="p-3">
        {/* Cabecera del Menú */}
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Módulos Operativos</span>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
              title="Ocultar menú de módulos"
            >
              <span>Ocultar</span>
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botón de Administración de Módulos (Solo usuarios autorizados) */}
        {canAdminModules && config && onSaveConfig && (
          <div className="px-1 pt-1 pb-2">
            <button
              type="button"
              onClick={() => setIsAdminModulosOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-800/60 transition-colors shadow-2xs cursor-pointer"
              title="Organizar módulos, reordenar y configurar submódulos"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Administrar Módulos</span>
              </div>
              <span className="text-[10px] bg-indigo-900/80 text-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold">
                Orden / Submódulos
              </span>
            </button>
          </div>
        )}

        {/* Navegación con soporte para Jerarquía y Submódulos */}
        <nav className="mt-1 space-y-1">
          {modulosPrincipales.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const children = submodulosMap.get(item.id) || [];
            const hasChildren = children.length > 0;
            const isExpanded = expandedParents[item.id] ?? false;
            const isAnyChildActive = children.some((c) => c.id === activeTab);

            return (
              <div key={item.id} className="space-y-0.5">
                {/* Módulo Principal */}
                <div
                  className={`w-full flex items-center justify-between rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-800 text-white shadow-sm shadow-blue-900/50'
                      : isAnyChildActive
                      ? 'bg-slate-800/90 text-blue-200 border-l-2 border-blue-500'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id as ActiveTab);
                      if (hasChildren && !isExpanded) {
                        setExpandedParents((prev) => ({ ...prev, [item.id]: true }));
                      }
                    }}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left text-sm font-medium cursor-pointer min-w-0"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-200' : isAnyChildActive ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="leading-tight truncate">{item.label}</div>
                      <div
                        className={`text-[10px] leading-tight truncate ${
                          isActive ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                          item.badgeColor || 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Botón colapsar / expandir submódulos */}
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(item.id, e)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition-colors cursor-pointer"
                        title={isExpanded ? 'Ocultar submódulos' : 'Mostrar submódulos'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Submódulos Anidados */}
                {hasChildren && isExpanded && (
                  <div className="pl-4 ml-3 border-l border-slate-700/80 space-y-1 py-1 animate-in fade-in duration-150">
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = activeTab === child.id;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => onSelectTab(child.id as ActiveTab)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs font-medium transition-all cursor-pointer ${
                            isChildActive
                              ? 'bg-blue-700 text-white font-bold shadow-xs'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-500 font-mono text-[10px]">↳</span>
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isChildActive ? 'text-blue-100' : 'text-slate-500'
                              }`}
                            />
                            <span className="truncate">{child.label}</span>
                          </div>

                          {child.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                child.badgeColor || 'bg-blue-900 text-blue-200'
                              }`}
                            >
                              {child.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Modal de Administración de Módulos */}
      {config && onSaveConfig && (
        <AdministrarModulosModal
          isOpen={isAdminModulosOpen}
          onClose={() => setIsAdminModulosOpen(false)}
          config={config}
          onSaveConfig={onSaveConfig}
        />
      )}
    </aside>
  );
};

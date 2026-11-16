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
  Bell,
  Folder,
  FolderOpen,
  BookOpen,
} from 'lucide-react';
import { UsuarioSistema, ConfiguracionSistema, ModuloEstructuraConfig, TonalidadModulo } from '../../types/police';
import { AdministrarModulosModal } from './AdministrarModulosModal';
import { getTonalidadStyle } from '../../utils/moduleColors';

export type ActiveTab =
  | 'dashboard'
  | 'personal'
  | 'grupos'
  | 'expedientes'
  | 'falta-oficio'
  | 'moviles'
  | 'recargos'
  | 'guardias'
  | 'novedades-delegaciones'
  | 'charlas-prevencion'
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
    charlasProximas?: number;
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
      id: 'novedades-delegaciones',
      label: 'Novedades y Avisos',
      icon: Bell,
      desc: 'Avisos Inter-Delegaciones & Traslados',
    },
    {
      id: 'charlas-prevencion',
      label: 'Charlas y Prevención',
      icon: BookOpen,
      desc: 'Prevención Comunitaria & Agenda',
      badge: badgeCounts.charlasProximas ? `${badgeCounts.charlasProximas} próx.` : undefined,
      badgeColor: 'bg-emerald-600/30 text-emerald-300 border-emerald-600/50',
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

  const canAdminModules =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeAdministrarModulos);

  // Verificar si un módulo está permitido para el usuario
  const isModuleAllowed = (id: string, esGrupoPersonalizado?: boolean) => {
    if (esGrupoPersonalizado) return true; // Visibilidad de carpeta se evalúa según sus hijos permitidos
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

  const getFolderIconComponent = (iconoPersonalizado?: string) => {
    switch (iconoPersonalizado) {
      case 'shield':
        return ShieldCheck;
      case 'clipboard':
        return ClipboardList;
      case 'layers':
        return Layers;
      case 'car':
        return Car;
      case 'users':
        return Users;
      case 'folder':
      default:
        return Folder;
    }
  };

  const [draggedSidebarId, setDraggedSidebarId] = useState<string | null>(null);

  // Mapear configuración de estructura personalizada
  const estructuraMap = new Map<string, ModuloEstructuraConfig>();
  if (config?.estructuraModulos && config.estructuraModulos.length > 0) {
    config.estructuraModulos.forEach((it) => estructuraMap.set(it.id, it));
  }

  // Integrar carpetas personalizadas dinámicas creadas por el usuario
  const customFolders = (config?.estructuraModulos || [])
    .filter((it) => it.esGrupoPersonalizado)
    .map((folder) => ({
      id: folder.id,
      label: folder.label,
      icon: getFolderIconComponent(folder.iconoPersonalizado),
      desc: folder.desc || 'Carpeta Agrupadora',
      esGrupoPersonalizado: true,
      iconoPersonalizado: folder.iconoPersonalizado,
      colorTonalidad: folder.colorTonalidad as TonalidadModulo | undefined,
    }));

  // Aplicar nombres y tonalidades personalizadas a los módulos base
  const customizedBaseItems = allMenuItems.map((m) => {
    const conf = estructuraMap.get(m.id);
    return {
      ...m,
      label: conf?.label || m.label,
      colorTonalidad: conf?.colorTonalidad as TonalidadModulo | undefined,
    };
  });

  const fullItemsCatalog = [...customizedBaseItems, ...customFolders];

  // Ordenar todos los items según `orden` configurado
  const sortedItems = [...fullItemsCatalog].sort((a, b) => {
    const ordA = estructuraMap.get(a.id)?.orden ?? 99;
    const ordB = estructuraMap.get(b.id)?.orden ?? 99;
    return ordA - ordB;
  });

  // Agrupar módulos principales y submódulos
  const submodulosMap = new Map<string, typeof fullItemsCatalog>();
  const rawPrincipales: typeof fullItemsCatalog = [];

  sortedItems.forEach((item) => {
    const conf = estructuraMap.get(item.id);
    if (conf && conf.visible === false) return;

    const isCustomFolder = Boolean((item as any).esGrupoPersonalizado);
    if (!isModuleAllowed(item.id, isCustomFolder)) return;

    const padreId = conf?.padreId;
    const parentCatalogItem = padreId
      ? fullItemsCatalog.find((m) => m.id === padreId)
      : undefined;
    const isParentCustomFolder = Boolean((parentCatalogItem as any)?.esGrupoPersonalizado);
    const isParentPermitted = Boolean(
      parentCatalogItem && isModuleAllowed(parentCatalogItem.id, isParentCustomFolder)
    );

    if (!isCustomFolder && padreId && parentCatalogItem && isParentPermitted) {
      const parentConf = estructuraMap.get(padreId);
      // Si la carpeta padre está oculta, ocultar también sus hijos para mantener consistencia
      if (parentConf && parentConf.visible === false) return;
      const list = submodulosMap.get(padreId) || [];
      list.push(item);
      submodulosMap.set(padreId, list);
    } else {
      rawPrincipales.push(item);
    }
  });

  // Mostrar carpetas personalizadas a cualquier usuario que tenga al menos 1 módulo dentro, o a admins
  const modulosPrincipales = rawPrincipales.filter((item) => {
    if ((item as any).esGrupoPersonalizado) {
      const children = submodulosMap.get(item.id) || [];
      return children.length > 0 || canAdminModules;
    }
    return true;
  });

  const handleSidebarDrop = (fromId: string, toId: string) => {
    if (!fromId || fromId === toId || !config || !onSaveConfig) return;

    // Construir estructura completa sincronizada con el catálogo actual
    const mergedList: ModuloEstructuraConfig[] = sortedItems.map((m, idx) => {
      const existing = estructuraMap.get(m.id);
      const isCustom = Boolean((m as any).esGrupoPersonalizado);
      return {
        id: m.id,
        label: existing?.label || m.label,
        desc: existing?.desc || m.desc,
        orden: existing?.orden ?? idx + 1,
        padreId: existing?.padreId ?? null,
        visible: existing?.visible !== false,
        esGrupoPersonalizado: isCustom || existing?.esGrupoPersonalizado,
        iconoPersonalizado: (m as any).iconoPersonalizado || existing?.iconoPersonalizado,
        colorTonalidad: (m as any).colorTonalidad || existing?.colorTonalidad,
      };
    });

    // Agrupar jerárquicamente: cada elemento de nivel superior con sus hijos inmediatos
    const itemIds = new Set(mergedList.map((it) => it.id));
    const topLevelBlocks: Array<{
      parent: ModuloEstructuraConfig;
      children: ModuloEstructuraConfig[];
    }> = [];
    const childrenByParent = new Map<string, ModuloEstructuraConfig[]>();

    mergedList.forEach((it) => {
      if (!it.esGrupoPersonalizado && it.padreId && itemIds.has(it.padreId)) {
        const arr = childrenByParent.get(it.padreId) || [];
        arr.push(it);
        childrenByParent.set(it.padreId, arr);
      }
    });

    mergedList.forEach((it) => {
      const isChild = !it.esGrupoPersonalizado && it.padreId && itemIds.has(it.padreId);
      if (!isChild) {
        topLevelBlocks.push({
          parent: it,
          children: childrenByParent.get(it.id) || [],
        });
      }
    });

    const fromBlockIdx = topLevelBlocks.findIndex((b) => b.parent.id === fromId);
    const toBlockIdx = topLevelBlocks.findIndex((b) => b.parent.id === toId);
    if (fromBlockIdx < 0 || toBlockIdx < 0 || fromBlockIdx === toBlockIdx) return;

    const [movedBlock] = topLevelBlocks.splice(fromBlockIdx, 1);
    topLevelBlocks.splice(toBlockIdx, 0, movedBlock);

    const flattened: ModuloEstructuraConfig[] = [];
    let orderCounter = 1;
    topLevelBlocks.forEach((block) => {
      flattened.push({ ...block.parent, orden: orderCounter++ });
      block.children.forEach((child) => {
        flattened.push({ ...child, orden: orderCounter++ });
      });
    });

    onSaveConfig({
      ...config,
      estructuraModulos: flattened,
      estructuraModulosUpdatedAt: new Date().toISOString(),
    });
  };


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
      [parentId]: !(prev[parentId] ?? true),
    }));
  };

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

        {/* Navegación con soporte para Jerarquía, Carpetas, Tonalidad de Color y Submódulos */}
        <nav className="mt-1 space-y-1">
          {modulosPrincipales.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const children = submodulosMap.get(item.id) || [];
            const hasChildren = children.length > 0;
            const isCustomFolder = Boolean((item as any).esGrupoPersonalizado);
            // Las carpetas personalizadas se muestran expandidas por defecto para visibilidad inmediata
            const isExpanded = expandedParents[item.id] ?? isCustomFolder;
            const isAnyChildActive = children.some((c) => c.id === activeTab);
            const tonal = getTonalidadStyle((item as any).colorTonalidad, item.id);

            return (
              <div
                key={item.id}
                draggable={canAdminModules}
                onDragStart={(e) => {
                  setDraggedSidebarId(item.id);
                  e.dataTransfer.setData('text/plain', item.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = draggedSidebarId || e.dataTransfer.getData('text/plain');
                  handleSidebarDrop(fromId, item.id);
                  setDraggedSidebarId(null);
                }}
                className={`space-y-0.5 ${canAdminModules ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {/* Carpeta Agrupadora Personalizada o Módulo Principal */}
                {isCustomFolder ? (
                  <div
                    onClick={(e) => toggleExpand(item.id, e)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all font-semibold text-sm cursor-pointer select-none ${
                      isAnyChildActive ? tonal.sidebarFolderActiveClass : tonal.sidebarFolderClass
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${tonal.sidebarFolderIconClass}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${tonal.sidebarCountBadgeClass}`}
                      >
                        {children.length}
                      </span>
                      {isExpanded ? (
                        <span className="text-xs text-slate-300 font-bold">▲</span>
                      ) : (
                        <span className="text-xs text-slate-300 font-bold">▼</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-full flex items-center justify-between rounded-lg transition-all ${
                      isActive
                        ? tonal.sidebarItemActiveClass
                        : isAnyChildActive
                        ? tonal.sidebarFolderActiveClass
                        : tonal.sidebarItemClass
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
                      className="flex-1 flex items-center gap-3 px-3 py-2 text-left text-sm font-medium cursor-pointer min-w-0"
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : tonal.sidebarIconClass
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="leading-tight truncate">{item.label}</div>
                        <div
                          className={`text-[10px] leading-tight truncate ${
                            isActive ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 pr-2 shrink-0">
                      {(item as any).badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                            (item as any).badgeColor || 'bg-blue-900 text-blue-200'
                          }`}
                        >
                          {(item as any).badge}
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
                )}

                {/* Submódulos Anidados con separación tonal */}
                {hasChildren && isExpanded && (
                  <div
                    className={`pl-3 ml-3 border-l-2 ${tonal.sidebarBorderClass} space-y-1 py-1 animate-in fade-in duration-150`}
                  >
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = activeTab === child.id;
                      const childTonal = getTonalidadStyle(
                        (child as any).colorTonalidad,
                        child.id
                      );

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => onSelectTab(child.id as ActiveTab)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs font-medium transition-all cursor-pointer ${
                            isChildActive
                              ? childTonal.sidebarSubActiveClass
                              : childTonal.sidebarSubClass
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-500 font-mono text-[10px]">↳</span>
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isChildActive ? 'text-white' : childTonal.sidebarIconClass
                              }`}
                            />
                            <span className="truncate">{child.label}</span>
                          </div>

                          {(child as any).badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                (child as any).badgeColor || 'bg-blue-900 text-blue-200'
                              }`}
                            >
                              {(child as any).badge}
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

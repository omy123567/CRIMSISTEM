import React, { useState, useEffect, useMemo } from 'react';
import {
  ConfiguracionSistema,
  ModuloEstructuraConfig,
  TonalidadModulo,
} from '../../types/police';
import {
  TONALIDADES_LIST,
  getDefaultTonalidadForModule,
  getTonalidadStyle,
} from '../../utils/moduleColors';
import {
  MODULOS_BASE_CATALOGO,
  getDefaultEstructuraModulos,
} from '../../utils/modulosCatalogo';
export { MODULOS_BASE_CATALOGO, getDefaultEstructuraModulos };
import {
  FolderTree,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  FolderPlus,
  GripVertical,
  Layers,
  Folder,
  Shield,
  ClipboardList,
  Car,
  Users,
  Check,
  Edit2,
  Lock,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  FolderOutput,
  Globe,
} from 'lucide-react';

interface AdministrarModulosModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionSistema;
  onSaveConfig: (cfg: ConfiguracionSistema) => void;
}

function buildMergedItems(config: ConfiguracionSistema): ModuloEstructuraConfig[] {
  if (config.estructuraModulos && config.estructuraModulos.length > 0) {
    const map = new Map<string, ModuloEstructuraConfig>();
    config.estructuraModulos.forEach((it) => map.set(it.id, it));
    const merged: ModuloEstructuraConfig[] = [];

    config.estructuraModulos
      .filter((it) => it.esGrupoPersonalizado)
      .forEach((folder) =>
        merged.push({
          ...folder,
          colorTonalidad: folder.colorTonalidad || 'ambar',
        })
      );

    MODULOS_BASE_CATALOGO.forEach((base, idx) => {
      const exist = map.get(base.id);
      if (exist) {
        merged.push({
          ...exist,
          label: exist.label || base.label,
          desc: exist.desc || base.desc,
          colorTonalidad: exist.colorTonalidad || getDefaultTonalidadForModule(base.id),
        });
      } else {
        merged.push({
          id: base.id,
          label: base.label,
          desc: base.desc,
          orden: idx + 1,
          padreId: null,
          visible: true,
          colorTonalidad: getDefaultTonalidadForModule(base.id),
        });
      }
    });
    return merged.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
  }
  return getDefaultEstructuraModulos();
}

function renderFolderPreviewIcon(iconName?: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'shield':
      return <Shield className={className} />;
    case 'clipboard':
      return <ClipboardList className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'folder':
    default:
      return <Folder className={className} />;
  }
}

export const AdministrarModulosModal: React.FC<AdministrarModulosModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [items, setItems] = useState<ModuloEstructuraConfig[]>(() => buildMergedItems(config));
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<'tree' | 'folder-editor'>('tree');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Drag & Drop state (por ID, soportando nivel superior y dentro de carpetas)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Estado para crear/editar carpeta agrupadora
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderNombre, setFolderNombre] = useState('');
  const [folderIcono, setFolderIcono] = useState<string>('folder');
  const [folderColor, setFolderColor] = useState<TonalidadModulo>('ambar');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  // Edición rápida de nombre de módulo estándar
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleLabel, setEditingModuleLabel] = useState('');
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItems(buildMergedItems(config));
      setActiveView('tree');
      setSearchTerm('');
      setEditingModuleId(null);
      setSyncNotice(null);
      setConfirmDeleteFolderId(null);
      setConfirmReset(false);
    }
  }, [isOpen, config]);

  // Agrupación jerárquica ordenada: primero elementos de nivel 1 (!padreId o padre inexistente), con sus hijos anidados debajo
  const { topLevelItems, childrenByParent } = useMemo(() => {
    const validIds = new Set(items.map((it) => it.id));
    const sorted = [...items].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

    const map = new Map<string, ModuloEstructuraConfig[]>();
    const top: ModuloEstructuraConfig[] = [];

    sorted.forEach((it) => {
      if (!it.esGrupoPersonalizado && it.padreId && validIds.has(it.padreId)) {
        const list = map.get(it.padreId) || [];
        list.push(it);
        map.set(it.padreId, list);
      } else {
        top.push(it);
      }
    });

    return { topLevelItems: top, childrenByParent: map };
  }, [items]);

  // Filtrado por búsqueda conservando carpetas que coincidan o tengan hijos que coincidan
  const visibleTopLevelItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return topLevelItems;
    return topLevelItems.filter((top) => {
      const matchSelf =
        top.label.toLowerCase().includes(q) || (top.desc || '').toLowerCase().includes(q);
      const children = childrenByParent.get(top.id) || [];
      const matchChild = children.some(
        (c) => c.label.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q)
      );
      return matchSelf || matchChild;
    });
  }, [topLevelItems, childrenByParent, searchTerm]);

  if (!isOpen) return null;

  // Normaliza el arreglo jerárquico a orden secuencial global (1..N) y persiste para todos los usuarios
  const flattenAndPersist = (
    nextTop: ModuloEstructuraConfig[],
    nextChildrenMap: Map<string, ModuloEstructuraConfig[]>,
    noticeMsg = 'Orden y estructura sincronizados para todos los usuarios'
  ) => {
    const flattened: ModuloEstructuraConfig[] = [];
    let counter = 1;
    nextTop.forEach((parent) => {
      flattened.push({ ...parent, padreId: null, orden: counter++ });
      const children = nextChildrenMap.get(parent.id) || [];
      children.forEach((child) => {
        flattened.push({ ...child, padreId: parent.id, orden: counter++ });
      });
    });

    setItems(flattened);
    onSaveConfig({
      ...config,
      estructuraModulos: flattened,
      estructuraModulosUpdatedAt: new Date().toISOString(),
    });
    setSyncNotice(noticeMsg);
  };

  // Persistir directamente desde una lista plana arbitraria manteniendo integridad padre->hijo
  const persistFlatItems = (
    rawItems: ModuloEstructuraConfig[],
    noticeMsg = 'Cambios sincronizados para todos los usuarios'
  ) => {
    const validIds = new Set(rawItems.map((it) => it.id));
    const sorted = [...rawItems].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
    const map = new Map<string, ModuloEstructuraConfig[]>();
    const top: ModuloEstructuraConfig[] = [];

    sorted.forEach((it) => {
      if (!it.esGrupoPersonalizado && it.padreId && validIds.has(it.padreId)) {
        const list = map.get(it.padreId) || [];
        list.push(it);
        map.set(it.padreId, list);
      } else {
        top.push(it);
      }
    });

    flattenAndPersist(top, map, noticeMsg);
  };

  // Mover un bloque de nivel superior (carpeta con sus hijos o módulo principal)
  const handleMoveTopLevel = (id: string, delta: -1 | 1) => {
    const idx = topLevelItems.findIndex((t) => t.id === id);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= topLevelItems.length) return;
    const nextTop = [...topLevelItems];
    const [moved] = nextTop.splice(idx, 1);
    nextTop.splice(targetIdx, 0, moved);
    flattenAndPersist(nextTop, childrenByParent);
  };

  // Mover un submódulo dentro de su carpeta/padre
  const handleMoveChild = (parentId: string, childId: string, delta: -1 | 1) => {
    const siblings = [...(childrenByParent.get(parentId) || [])];
    const idx = siblings.findIndex((c) => c.id === childId);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return;
    const [moved] = siblings.splice(idx, 1);
    siblings.splice(targetIdx, 0, moved);
    const nextMap = new Map(childrenByParent);
    nextMap.set(parentId, siblings);
    flattenAndPersist(topLevelItems, nextMap);
  };

  // Drag & Drop inteligente: soporta reordenar top-level entre sí, o hijos dentro del mismo padre, o arrastrar dentro/fuera
  const handleDropOnItem = (sourceId: string, targetId: string) => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceItem = items.find((i) => i.id === sourceId);
    const targetItem = items.find((i) => i.id === targetId);
    if (!sourceItem || !targetItem) return;

    const sourceIsTop = !sourceItem.padreId;
    const targetIsTop = !targetItem.padreId;

    // 1. Ambos son nivel superior -> reordenar bloques completos
    if (sourceIsTop && targetIsTop) {
      const fromIdx = topLevelItems.findIndex((t) => t.id === sourceId);
      const toIdx = topLevelItems.findIndex((t) => t.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const nextTop = [...topLevelItems];
      const [moved] = nextTop.splice(fromIdx, 1);
      nextTop.splice(toIdx, 0, moved);
      flattenAndPersist(nextTop, childrenByParent);
      return;
    }

    // 2. Ambos son submódulos del MISMO padre -> reordenar dentro de esa carpeta
    if (
      !sourceIsTop &&
      !targetIsTop &&
      sourceItem.padreId &&
      sourceItem.padreId === targetItem.padreId
    ) {
      const pid = sourceItem.padreId;
      const siblings = [...(childrenByParent.get(pid) || [])];
      const fromIdx = siblings.findIndex((c) => c.id === sourceId);
      const toIdx = siblings.findIndex((c) => c.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = siblings.splice(fromIdx, 1);
      siblings.splice(toIdx, 0, moved);
      const nextMap = new Map(childrenByParent);
      nextMap.set(pid, siblings);
      flattenAndPersist(topLevelItems, nextMap);
      return;
    }

    // 3. Arrastrar un submódulo sobre otro padre/carpeta distinto -> moverlo solo si estaba libre o si se suelta sobre otro módulo principal libre
    if (!sourceItem.esGrupoPersonalizado && targetItem.esGrupoPersonalizado) {
      // Asignar módulo libre (o mover) dentro de esa carpeta
      const next = items.map((it) =>
        it.id === sourceItem.id ? { ...it, padreId: targetItem.id } : it
      );
      persistFlatItems(next, `Módulo "${sourceItem.label}" movido a "${targetItem.label}"`);
    }
  };

  // Cambiar carpeta padre de un módulo
  const handleChangePadre = (id: string, nuevoPadreId: string) => {
    const padre = nuevoPadreId === 'none' ? null : nuevoPadreId;
    const next = items.map((it) => (it.id === id ? { ...it, padreId: padre } : it));
    persistFlatItems(next);
  };

  // Cambiar tonalidad de color
  const handleChangeColor = (id: string, color: TonalidadModulo) => {
    const next = items.map((it) => (it.id === id ? { ...it, colorTonalidad: color } : it));
    persistFlatItems(next, 'Color de tonalidad actualizado para todos los usuarios');
  };

  // Cambiar visibilidad
  const handleToggleVisible = (id: string) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, visible: it.visible === false ? true : false } : it
    );
    persistFlatItems(next);
  };

  // Abrir editor para nueva carpeta
  const handleOpenCreateFolder = () => {
    setEditingFolderId(null);
    setFolderNombre('');
    setFolderIcono('folder');
    setFolderColor('ambar');
    setSelectedChildIds([]);
    setActiveView('folder-editor');
  };

  // Abrir editor para carpeta existente
  const handleOpenEditFolder = (folder: ModuloEstructuraConfig) => {
    setEditingFolderId(folder.id);
    setFolderNombre(folder.label);
    setFolderIcono(folder.iconoPersonalizado || 'folder');
    setFolderColor(folder.colorTonalidad || 'ambar');
    const currentChildren = items
      .filter((it) => !it.esGrupoPersonalizado && it.padreId === folder.id)
      .map((it) => it.id);
    setSelectedChildIds(currentChildren);
    setActiveView('folder-editor');
  };

  // Guardar carpeta creada o editada
  const handleSaveFolder = () => {
    if (!folderNombre.trim()) return;

    if (editingFolderId) {
      const updatedItems = items.map((it) => {
        if (it.id === editingFolderId) {
          return {
            ...it,
            label: folderNombre.trim(),
            iconoPersonalizado: folderIcono,
            colorTonalidad: folderColor,
            modulosHijosIds: selectedChildIds,
          };
        }
        if (!it.esGrupoPersonalizado) {
          if (selectedChildIds.includes(it.id)) {
            return { ...it, padreId: editingFolderId };
          }
          if (it.padreId === editingFolderId) {
            return { ...it, padreId: null };
          }
        }
        return it;
      });
      persistFlatItems(updatedItems, `Carpeta "${folderNombre.trim()}" actualizada para todos los usuarios`);
    } else {
      const newFolderId = 'folder-' + Date.now();
      const newFolder: ModuloEstructuraConfig = {
        id: newFolderId,
        label: folderNombre.trim(),
        desc: 'Carpeta Agrupadora',
        orden: 1,
        padreId: null,
        visible: true,
        esGrupoPersonalizado: true,
        iconoPersonalizado: folderIcono,
        colorTonalidad: folderColor,
        modulosHijosIds: selectedChildIds,
      };

      const updatedItems = items.map((it) => {
        if (selectedChildIds.includes(it.id)) {
          return { ...it, padreId: newFolderId };
        }
        return it;
      });

      // Insertar nueva carpeta al inicio del árbol
      persistFlatItems(
        [{ ...newFolder, orden: 0 }, ...updatedItems.map((u, idx) => ({ ...u, orden: idx + 2 }))],
        `Carpeta "${folderNombre.trim()}" creada y sincronizada para todos los usuarios`
      );
    }

    setActiveView('tree');
    setEditingFolderId(null);
    setFolderNombre('');
    setSelectedChildIds([]);
  };

  // Eliminar carpeta (confirmación inline sin diálogo nativo)
  const handleDeleteCustomFolder = (folderId: string) => {
    const updated = items
      .filter((it) => it.id !== folderId)
      .map((it) => (it.padreId === folderId ? { ...it, padreId: null } : it));
    setConfirmDeleteFolderId(null);
    persistFlatItems(updated, 'Carpeta eliminada; los módulos regresaron al nivel principal');
  };

  // Guardar nombre editado de módulo
  const handleSaveModuleLabel = (id: string) => {
    if (!editingModuleLabel.trim()) {
      setEditingModuleId(null);
      return;
    }
    const next = items.map((it) =>
      it.id === id ? { ...it, label: editingModuleLabel.trim() } : it
    );
    persistFlatItems(next, 'Nombre de módulo actualizado');
    setEditingModuleId(null);
    setEditingModuleLabel('');
  };

  // Restablecer valores por defecto
  const handleReset = () => {
    const def = getDefaultEstructuraModulos();
    setConfirmReset(false);
    persistFlatItems(def, 'Estructura restablecida por defecto para todos los usuarios');
  };

  const customFoldersList = topLevelItems.filter((it) => it.esGrupoPersonalizado);

  // Renderizado de una fila de módulo (usado tanto para nivel 1 como para hijos anidados)
  const renderModuleRow = (
    mod: ModuloEstructuraConfig,
    idx: number,
    siblingsCount: number,
    parentId: string | null
  ) => {
    const isNested = Boolean(parentId);
    const tonal = getTonalidadStyle(mod.colorTonalidad, mod.id);
    const isDragging = draggedItemId === mod.id;
    const isDragOver = dragOverItemId === mod.id;
    const nestedChildren = !isNested ? childrenByParent.get(mod.id) || [] : [];

    return (
      <div key={mod.id} className="space-y-1.5">
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggedItemId(mod.id);
            e.dataTransfer.setData('text/plain', mod.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragOverItemId !== mod.id) setDragOverItemId(mod.id);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverItemId === mod.id) setDragOverItemId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const fromId = draggedItemId || e.dataTransfer.getData('text/plain');
            handleDropOnItem(fromId, mod.id);
          }}
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
            isDragging ? 'opacity-40 scale-[0.99]' : ''
          } ${isDragOver ? 'ring-2 ring-indigo-500 border-indigo-600' : ''} ${
            isNested
              ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              : `${tonal.modalCardClass} shadow-2xs`
          } ${mod.visible === false ? 'opacity-60' : ''}`}
        >
          {/* Izquierda: Grip + Flechas + Posición + Tonalidad + Nombre */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() =>
                  parentId
                    ? handleMoveChild(parentId, mod.id, -1)
                    : handleMoveTopLevel(mod.id, -1)
                }
                className="p-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Subir"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === siblingsCount - 1}
                onClick={() =>
                  parentId
                    ? handleMoveChild(parentId, mod.id, 1)
                    : handleMoveTopLevel(mod.id, 1)
                }
                className="p-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Bajar"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="font-mono text-[11px] font-bold text-slate-400 w-5 text-right shrink-0">
              {idx + 1}.
            </span>

            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${tonal.swatchBg}`}
              title={`Tonalidad: ${tonal.label}`}
            />

            <div className="min-w-0 flex-1">
              {editingModuleId === mod.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingModuleLabel}
                    onChange={(e) => setEditingModuleLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveModuleLabel(mod.id);
                      if (e.key === 'Escape') setEditingModuleId(null);
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-xs font-bold text-slate-900 bg-white border border-indigo-400 rounded focus:outline-none w-52"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveModuleLabel(mod.id)}
                    className="p-1 bg-indigo-700 text-white rounded hover:bg-indigo-800 cursor-pointer"
                    title="Guardar"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {mod.label}
                  </span>
                  {mod.desc && (
                    <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
                      — {mod.desc}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Derecha: Tonalidad + Renombrar + Mover / Sacar de carpeta + Visibilidad */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-6 lg:pl-0">
            {/* Color Tonalidad */}
            <select
              value={mod.colorTonalidad || getDefaultTonalidadForModule(mod.id)}
              onChange={(e) => handleChangeColor(mod.id, e.target.value as TonalidadModulo)}
              aria-label={`Color de ${mod.label}`}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
            >
              {TONALIDADES_LIST.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Renombrar */}
            <button
              type="button"
              onClick={() => {
                setEditingModuleId(mod.id);
                setEditingModuleLabel(mod.label);
              }}
              className="p-1.5 text-slate-500 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Cambiar nombre visible del módulo"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Sacar de carpeta o Asignar a carpeta */}
            {isNested ? (
              <button
                type="button"
                onClick={() => handleChangePadre(mod.id, 'none')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Quitar de esta carpeta y devolver al nivel principal"
              >
                <FolderOutput className="w-3.5 h-3.5" />
                <span>Sacar</span>
              </button>
            ) : customFoldersList.length > 0 ? (
              <select
                value="none"
                onChange={(e) => {
                  if (e.target.value !== 'none') handleChangePadre(mod.id, e.target.value);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-indigo-300 focus:outline-none cursor-pointer max-w-[155px]"
                title="Mover este módulo dentro de una carpeta"
              >
                <option value="none">Mover a carpeta...</option>
                {customFoldersList.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.label}
                  </option>
                ))}
              </select>
            ) : null}

            {/* Visibilidad */}
            <button
              type="button"
              onClick={() => handleToggleVisible(mod.id)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                mod.visible !== false
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
              title={mod.visible !== false ? 'Visible para los usuarios' : 'Oculto para los usuarios'}
            >
              {mod.visible !== false ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Visible</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden sm:inline">Oculto</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Submódulos anidados bajo un módulo estándar (si existieran) */}
        {nestedChildren.length > 0 && (
          <div className="ml-6 pl-3 border-l-2 border-slate-300 space-y-1.5">
            {nestedChildren.map((child, cIdx) =>
              renderModuleRow(child, cIdx, nestedChildren.length, mod.id)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-300 h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-800 rounded-xl text-indigo-200 shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 flex-wrap">
                <span>Administrador Visual de Módulos y Submódulos</span>
                <span className="text-[11px] font-semibold bg-indigo-900/90 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-700/60">
                  {customFoldersList.length} carpeta{customFoldersList.length === 1 ? '' : 's'} •{' '}
                  {items.length - customFoldersList.length} módulos
                </span>
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Todos los cambios de orden, carpetas y colores se sincronizan automáticamente para todos los usuarios.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VISTA 1: Árbol Jerárquico de Módulos y Carpetas */}
        {activeView === 'tree' ? (
          <>
            {/* Barra de Herramientas limpia */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar módulo o carpeta..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateFolder}
                  className="flex items-center gap-1.5 text-xs text-white font-bold bg-indigo-800 hover:bg-indigo-900 px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Nueva Carpeta Agrupadora</span>
                </button>

                {confirmReset ? (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg">
                    <span className="text-[11px] font-bold text-red-800">¿Restablecer orden y colores?</span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-red-700 font-semibold bg-white border border-slate-300 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cuerpo Scrolleable: Árbol Visual */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-100/70">
              {visibleTopLevelItems.map((item, topIdx) => {
                if (item.esGrupoPersonalizado) {
                  const tonal = getTonalidadStyle(item.colorTonalidad, item.id);
                  const folderChildren = childrenByParent.get(item.id) || [];
                  const isCollapsed = collapsedFolders[item.id] ?? false;
                  const isDragging = draggedItemId === item.id;
                  const isDragOver = dragOverItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedItemId(item.id);
                        e.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverItemId !== item.id) setDragOverItemId(item.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverItemId === item.id) setDragOverItemId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = draggedItemId || e.dataTransfer.getData('text/plain');
                        handleDropOnItem(fromId, item.id);
                      }}
                      className={`rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden transition-all ${
                        isDragging ? 'opacity-40' : ''
                      } ${isDragOver ? 'ring-2 ring-indigo-500 border-indigo-600' : ''} ${
                        item.visible === false ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Cabecera de Carpeta */}
                      <div
                        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 border-l-4 ${
                          tonal.id === 'azul'
                            ? 'border-l-blue-600'
                            : tonal.id === 'esmeralda'
                            ? 'border-l-emerald-600'
                            : tonal.id === 'ambar'
                            ? 'border-l-amber-500'
                            : tonal.id === 'violeta'
                            ? 'border-l-violet-600'
                            : tonal.id === 'rojo'
                            ? 'border-l-rose-600'
                            : tonal.id === 'cian'
                            ? 'border-l-cyan-600'
                            : 'border-l-slate-600'
                        } cursor-grab active:cursor-grabbing`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={topIdx === 0}
                              onClick={() => handleMoveTopLevel(item.id, -1)}
                              className="p-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Subir carpeta y sus módulos"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={topIdx === visibleTopLevelItems.length - 1}
                              onClick={() => handleMoveTopLevel(item.id, 1)}
                              className="p-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Bajar carpeta y sus módulos"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="font-mono text-[11px] font-bold text-slate-400 w-5 text-right shrink-0">
                            {topIdx + 1}.
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedFolders((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span
                              className={`p-1.5 rounded-lg text-white shrink-0 ${tonal.swatchBg}`}
                            >
                              {renderFolderPreviewIcon(item.iconoPersonalizado, 'w-3.5 h-3.5')}
                            </span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-sm text-slate-900 truncate flex items-center gap-2">
                                <span>{item.label}</span>
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                  {folderChildren.length} módulo{folderChildren.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Controles de Carpeta */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-6 lg:pl-0">
                          <select
                            value={item.colorTonalidad || 'ambar'}
                            onChange={(e) =>
                              handleChangeColor(item.id, e.target.value as TonalidadModulo)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer focus:outline-none"
                          >
                            {TONALIDADES_LIST.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleOpenEditFolder(item)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar Carpeta</span>
                          </button>

                          {confirmDeleteFolderId === item.id ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                              <span className="text-[10px] font-bold text-red-800">¿Eliminar?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomFolder(item.id)}
                                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFolderId(null)}
                                className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteFolderId(item.id)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Eliminar carpeta"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleVisible(item.id)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              item.visible !== false
                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {item.visible !== false ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className="hidden sm:inline">
                              {item.visible !== false ? 'Visible' : 'Oculto'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Contenido Anidado de la Carpeta */}
                      {!isCollapsed && (
                        <div className="p-3 bg-slate-50/60 space-y-2">
                          {folderChildren.length === 0 ? (
                            <div className="text-center py-3 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg bg-white">
                              Carpeta vacía. Haga clic en <strong>Editar Carpeta</strong> o arrastre módulos aquí.
                            </div>
                          ) : (
                            <div className="pl-3 sm:pl-5 border-l-2 border-slate-300 space-y-1.5">
                              {folderChildren.map((child, cIdx) =>
                                renderModuleRow(child, cIdx, folderChildren.length, item.id)
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // Módulo principal independiente
                return renderModuleRow(item, topIdx, visibleTopLevelItems.length, null);
              })}

              {visibleTopLevelItems.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  No se encontraron módulos que coincidan con &ldquo;{searchTerm}&rdquo;.
                </div>
              )}
            </div>
          </>
        ) : (
          /* VISTA 2: Editor / Creador Dedicado de Carpeta Agrupadora (sin recortes visuales) */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('tree');
                    setEditingFolderId(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al Árbol</span>
                </button>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  {editingFolderId
                    ? 'Editar Carpeta Agrupadora'
                    : 'Crear Nueva Carpeta Agrupadora'}
                </h3>
              </div>
            </div>

            {/* Datos de la Carpeta */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              <div className="md:col-span-5">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Nombre de la Carpeta / Módulo Principal *
                </label>
                <input
                  type="text"
                  value={folderNombre}
                  onChange={(e) => setFolderNombre(e.target.value)}
                  placeholder="Ej: Guardias, Personal y Legajos, Criminalística..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Icono Visual
                </label>
                <select
                  value={folderIcono}
                  onChange={(e) => setFolderIcono(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="folder">📁 Carpeta Clásica</option>
                  <option value="shield">🛡️ Escudo Seguridad</option>
                  <option value="clipboard">📋 Planilla Operativa</option>
                  <option value="layers">📑 Capas / Secciones</option>
                  <option value="car">🚗 Parque Automotor</option>
                  <option value="users">👥 Personal Policial</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tonalidad de Color
                </label>
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {TONALIDADES_LIST.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFolderColor(t.id)}
                      title={t.label}
                      className={`w-6 h-6 rounded-full ${t.swatchBg} transition-transform cursor-pointer flex items-center justify-center ${
                        folderColor === t.id
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {folderColor === t.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selector Exclusivo de Submódulos */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Módulos incluidos dentro de esta carpeta ({selectedChildIds.length} seleccionados)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Los módulos que ya pertenecen a otra carpeta aparecen bloqueados para evitar duplicaciones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {items
                  .filter((it) => !it.esGrupoPersonalizado)
                  .map((m) => {
                    const isSelected = selectedChildIds.includes(m.id);
                    const assignedToOtherFolder = Boolean(
                      m.padreId && m.padreId !== editingFolderId
                    );
                    const otherParent = assignedToOtherFolder
                      ? items.find((p) => p.id === m.padreId)
                      : null;

                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all text-xs select-none ${
                          assignedToOtherFolder
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                            : isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold cursor-pointer shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            disabled={assignedToOtherFolder}
                            checked={isSelected}
                            onChange={(e) => {
                              if (assignedToOtherFolder) return;
                              if (e.target.checked) {
                                setSelectedChildIds([...selectedChildIds, m.id]);
                              } else {
                                setSelectedChildIds(selectedChildIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="w-4 h-4 text-indigo-700 rounded cursor-pointer disabled:cursor-not-allowed shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="truncate">{m.label}</div>
                            {m.desc && (
                              <div className="text-[10px] text-slate-400 font-normal truncate">
                                {m.desc}
                              </div>
                            )}
                          </div>
                        </div>

                        {assignedToOtherFolder && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[85px]">
                              {otherParent?.label || 'En carpeta'}
                            </span>
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-600 font-medium">
              {syncNotice || 'Visibilidad global activa: todo cambio se replica a todos los usuarios y delegaciones.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeView === 'folder-editor' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('tree');
                    setEditingFolderId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFolder}
                  disabled={!folderNombre.trim()}
                  className="px-5 py-2 bg-indigo-800 hover:bg-indigo-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingFolderId ? 'Guardar Cambios de Carpeta' : 'Crear Carpeta y Aplicar'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Listo / Cerrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

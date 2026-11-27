import { ModuloEstructuraConfig, TonalidadModulo } from '../types/police';
import { getDefaultTonalidadForModule } from './moduleColors';

export interface ModuloCatalogoItem {
  id: string;
  label: string;
  desc: string;
  defaultColor: TonalidadModulo;
}

export interface CarpetaDefaultDef {
  id: string;
  label: string;
  desc: string;
  iconoPersonalizado: string;
  colorTonalidad: TonalidadModulo;
  childrenIds: string[];
}

export const MODULOS_BASE_CATALOGO: ModuloCatalogoItem[] = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', desc: 'KPIs y Estadísticas', defaultColor: 'azul' },
  { id: 'guardias', label: 'Parte de Novedades', desc: 'Guardia & Criminalística', defaultColor: 'cian' },
  { id: 'novedades-delegaciones', label: 'Novedades y Avisos', desc: 'Avisos Inter-Delegaciones & Traslados', defaultColor: 'ambar' },
  { id: 'falta-oficio', label: 'Casos Falta de Oficio', desc: 'Urgencias preliminares', defaultColor: 'rojo' },

  { id: 'intervenciones', label: 'Intervenciones', desc: 'LC & Siniestros Viales', defaultColor: 'violeta' },
  { id: 'inspecciones', label: 'Inspecciones Oculares', desc: 'Intervenciones Criminalísticas', defaultColor: 'violeta' },
  { id: 'accidentologia', label: 'Accidentología', desc: 'Siniestros c/ Personal Policial', defaultColor: 'rojo' },
  { id: 'causas-policiales', label: 'Causas c/ Pers. Policial', desc: 'Hechos con Efectivos Policiales', defaultColor: 'rojo' },
  { id: 'personas', label: 'Personas', desc: 'Involucrados & Testigos', defaultColor: 'cian' },
  { id: 'vehiculos', label: 'Vehículos', desc: 'Rodados en Siniestros Viales', defaultColor: 'cian' },

  { id: 'expedientes', label: 'Expedientes Judiciales', desc: 'Oficios, Tareas y PPI', defaultColor: 'azul' },
  { id: 'informes-tecnicos', label: 'Informes Técnicos', desc: 'Oficios, Dictámenes & Elevación', defaultColor: 'violeta' },
  { id: 'forense', label: 'Forense Policial', desc: 'Médico y Examinados', defaultColor: 'esmeralda' },
  { id: 'licenciados', label: 'Licenciado', desc: 'Personal Profesional', defaultColor: 'esmeralda' },
  { id: 'numerario', label: 'Control de Folios', desc: 'Numerario y Asignación de Folios', defaultColor: 'cian' },
  { id: 'memos-notas', label: 'Memos y Notas', desc: 'Memorándums, Nota V, Notas & Anexos', defaultColor: 'cian' },

  { id: 'personal', label: 'Personal y Legajos', desc: 'Nómina, Armas y Chalecos', defaultColor: 'esmeralda' },
  { id: 'grupos', label: 'Grupos', desc: 'Secciones de Guardia & Nómina', defaultColor: 'esmeralda' },
  { id: 'licencias', label: 'Licencia Policial', desc: 'Régimen Art. 7, 11, 15 & Feriados', defaultColor: 'esmeralda' },
  { id: 'recargos', label: 'Recargos Operativos', desc: 'Servicios extraordinarios', defaultColor: 'ambar' },

  { id: 'moviles', label: 'Parque Automotor', desc: 'Móviles y Reparaciones', defaultColor: 'ambar' },
  { id: 'inventario', label: 'Inventario y Cambio de Jefe', desc: 'Patrimonio, Bienes y Actas de Relevo', defaultColor: 'azul' },
  { id: 'charlas-prevencion', label: 'Charlas y Prevención', desc: 'Prevención Comunitaria & Agenda', defaultColor: 'esmeralda' },

  { id: 'usuarios', label: 'Gestión de Usuarios', desc: 'Roles, Permisos & Cuentas', defaultColor: 'slate' },
  { id: 'config', label: 'Configuración & Membrete', desc: 'Ajustes, Membrete & Backups', defaultColor: 'slate' },
  { id: 'auditoria', label: 'Auditoría del Sistema', desc: 'Trazabilidad de Acciones (Superusuario)', defaultColor: 'slate' },
];

export const DIRECT_MODULOS_IDS: string[] = [
  'dashboard',
  'guardias',
  'novedades-delegaciones',
  'falta-oficio',
];

export const DEFAULT_CARPETAS_MODULOS: CarpetaDefaultDef[] = [
  {
    id: 'folder-intervenciones-siniestros',
    label: 'Intervenciones y Siniestros',
    desc: 'Operativo de calle y registros vinculados',
    iconoPersonalizado: 'car',
    colorTonalidad: 'azul',
    childrenIds: [
      'intervenciones',
      'inspecciones',
      'accidentologia',
      'causas-policiales',
      'personas',
      'vehiculos',
    ],
  },
  {
    id: 'folder-pericial-judicial',
    label: 'Área Pericial y Judicial',
    desc: 'Oficios, pericias, folios y documentación',
    iconoPersonalizado: 'clipboard',
    colorTonalidad: 'violeta',
    childrenIds: [
      'expedientes',
      'informes-tecnicos',
      'forense',
      'licenciados',
      'numerario',
      'memos-notas',
    ],
  },
  {
    id: 'folder-personal-guardia',
    label: 'Personal y Guardia',
    desc: 'Nómina, licencias, grupos y recargos',
    iconoPersonalizado: 'users',
    colorTonalidad: 'esmeralda',
    childrenIds: ['personal', 'grupos', 'licencias', 'recargos'],
  },
  {
    id: 'folder-logistica-patrimonio',
    label: 'Logística, Patrimonio y Prevención',
    desc: 'Flota automotor, inventario y prevención',
    iconoPersonalizado: 'layers',
    colorTonalidad: 'ambar',
    childrenIds: ['moviles', 'inventario', 'charlas-prevencion'],
  },
  {
    id: 'folder-admin-sistema',
    label: 'Administración y Sistema',
    desc: 'Usuarios, configuración y auditoría',
    iconoPersonalizado: 'shield',
    colorTonalidad: 'slate',
    childrenIds: ['usuarios', 'config', 'auditoria'],
  },
];

export function getDefaultEstructuraModulos(): ModuloEstructuraConfig[] {
  const byId = new Map(MODULOS_BASE_CATALOGO.map((m) => [m.id, m]));
  const result: ModuloEstructuraConfig[] = [];
  let orden = 1;

  for (const modId of DIRECT_MODULOS_IDS) {
    const base = byId.get(modId);
    if (!base) continue;
    result.push({
      id: base.id,
      label: base.label,
      desc: base.desc,
      orden: orden++,
      padreId: null,
      visible: true,
      colorTonalidad: base.defaultColor || getDefaultTonalidadForModule(base.id),
    });
  }

  for (const folder of DEFAULT_CARPETAS_MODULOS) {
    result.push({
      id: folder.id,
      label: folder.label,
      desc: folder.desc,
      orden: orden++,
      padreId: null,
      visible: true,
      esGrupoPersonalizado: true,
      iconoPersonalizado: folder.iconoPersonalizado,
      colorTonalidad: folder.colorTonalidad,
      modulosHijosIds: [...folder.childrenIds],
    });

    for (const childId of folder.childrenIds) {
      const base = byId.get(childId);
      if (!base) continue;
      result.push({
        id: base.id,
        label: base.label,
        desc: base.desc,
        orden: orden++,
        padreId: folder.id,
        visible: true,
        colorTonalidad: base.defaultColor || getDefaultTonalidadForModule(base.id),
      });
    }
  }

  return result;
}

export function standardizeModulosFolders(estructura?: ModuloEstructuraConfig[]): {
  estructuraModulos: ModuloEstructuraConfig[];
  changed: boolean;
} {
  const canonical = getDefaultEstructuraModulos();

  if (!Array.isArray(estructura) || estructura.length === 0) {
    return { estructuraModulos: canonical, changed: true };
  }

  const hasCustomFolders = estructura.some((m) => Boolean(m?.esGrupoPersonalizado));
  const existingById = new Map<string, ModuloEstructuraConfig>();
  for (const it of estructura) {
    if (it && it.id) existingById.set(it.id, it);
  }

  if (!hasCustomFolders) {
    // Migrar estructura plana heredada a las 5 carpetas recomendadas + 4 accesos directos,
    // preservando etiquetas o visibilidad personalizadas en módulos individuales.
    const migrated = canonical.map((item) => {
      if (item.esGrupoPersonalizado) return item;
      const prev = existingById.get(item.id);
      if (!prev) return item;
      return {
        ...item,
        label: prev.label || item.label,
        desc: prev.desc || item.desc,
        visible: prev.visible !== false,
        colorTonalidad: prev.colorTonalidad || item.colorTonalidad,
      };
    });
    return { estructuraModulos: migrated, changed: true };
  }

  // Ya posee carpetas personalizadas: solo asegurar que no falte ningún módulo base nuevo
  let changed = false;
  const next = [...estructura];
  const validFolderIds = new Set(next.filter((m) => m.esGrupoPersonalizado).map((m) => m.id));
  const canonicalById = new Map(canonical.map((c) => [c.id, c]));

  for (const base of MODULOS_BASE_CATALOGO) {
    if (!existingById.has(base.id)) {
      const canon = canonicalById.get(base.id);
      const targetPadreId =
        canon?.padreId && validFolderIds.has(canon.padreId) ? canon.padreId : null;
      next.push({
        id: base.id,
        label: base.label,
        desc: base.desc,
        orden: next.length + 1,
        padreId: targetPadreId,
        visible: true,
        colorTonalidad: base.defaultColor || getDefaultTonalidadForModule(base.id),
      });
      changed = true;
    }
  }

  return { estructuraModulos: next, changed };
}

export interface ModuloSelectorGrupo {
  id: string;
  label: string;
  colorTonalidad: TonalidadModulo;
  esCarpeta: boolean;
  modulos: ModuloCatalogoItem[];
}

export function buildModulosAgrupadosParaSelector(
  estructura?: ModuloEstructuraConfig[]
): ModuloSelectorGrupo[] {
  const effectiveStruct =
    Array.isArray(estructura) && estructura.some((m) => m.esGrupoPersonalizado)
      ? estructura
      : getDefaultEstructuraModulos();

  const sorted = [...effectiveStruct].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const baseById = new Map(MODULOS_BASE_CATALOGO.map((m) => [m.id, m]));
  const structById = new Map(sorted.map((s) => [s.id, s]));

  const folders = sorted.filter((s) => s.esGrupoPersonalizado);
  const folderIds = new Set(folders.map((f) => f.id));

  const directModulos: ModuloCatalogoItem[] = [];
  const childrenByFolder = new Map<string, ModuloCatalogoItem[]>();
  folders.forEach((f) => childrenByFolder.set(f.id, []));

  for (const item of sorted) {
    if (item.esGrupoPersonalizado) continue;
    const base = baseById.get(item.id);
    if (!base) continue;
    const modItem: ModuloCatalogoItem = {
      id: base.id,
      label: item.label || base.label,
      desc: item.desc || base.desc,
      defaultColor: item.colorTonalidad || base.defaultColor,
    };
    if (item.padreId && folderIds.has(item.padreId)) {
      childrenByFolder.get(item.padreId)!.push(modItem);
    } else {
      directModulos.push(modItem);
    }
  }

  // Asegurar que ningún módulo base del catálogo quede omitido
  for (const base of MODULOS_BASE_CATALOGO) {
    if (!structById.has(base.id)) {
      directModulos.push(base);
    }
  }

  const groups: ModuloSelectorGrupo[] = [];
  if (directModulos.length > 0) {
    groups.push({
      id: 'direct-access',
      label: 'Acceso Directo (Fuera de Carpetas)',
      colorTonalidad: 'azul',
      esCarpeta: false,
      modulos: directModulos,
    });
  }

  for (const folder of folders) {
    const mods = childrenByFolder.get(folder.id) || [];
    if (mods.length > 0) {
      groups.push({
        id: folder.id,
        label: folder.label,
        colorTonalidad: folder.colorTonalidad || 'ambar',
        esCarpeta: true,
        modulos: mods,
      });
    }
  }

  return groups;
}

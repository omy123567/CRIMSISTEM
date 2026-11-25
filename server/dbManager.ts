import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_USUARIOS,
  DEFAULT_DELEGACIONES,
  DEFAULT_ROLES,
  DEFAULT_SERIES_NUMERARIO,
  DEFAULT_CONFIG,
  standardizeControlFoliosSeries,
  enforceMemorandumRVisibilityRestriction,
} from '../src/db/database';
import { DEFAULT_FERIADOS_ARGENTINA, DEFAULT_TIPOS_LICENCIA } from '../src/services/licenciaService';
import { DEFAULT_TIPOS_MEMO } from '../src/utils/memosCatalogUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.resolve(DATA_DIR, 'sispol_database.json');

export interface SispolDatabase {
  version: number;
  lastUpdated: string;
  configuracion: any[];
  usuarios: any[];
  delegaciones: any[];
  roles: any[];
  seriesNumerario: any[];
  personal: any[];
  grupos: any[];
  expedientes: any[];
  casosFaltaOficio: any[];
  moviles: any[];
  reparaciones: any[];
  recargos: any[];
  partesGuardia: any[];
  inspeccionesOculares: any[];
  forenses: any[];
  licenciados: any[];
  informesTecnicos: any[];
  intervenciones: any[];
  accidentologia: any[];
  folios: any[];
  auditoria: any[];
  novedadesDelegaciones: any[];
  charlasPrevencion: any[];
  licenciasPoliciales: any[];
  saldosLicencias: any[];
  feriados: any[];
  memosNotas: any[];
}

function getInitialDatabase(): SispolDatabase {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    configuracion: [{ ...DEFAULT_CONFIG }],
    usuarios: DEFAULT_USUARIOS.map((u) => ({ ...u })),
    delegaciones: DEFAULT_DELEGACIONES.map((d) => ({ ...d })),
    roles: DEFAULT_ROLES.map((r) => ({ ...r })),
    seriesNumerario: DEFAULT_SERIES_NUMERARIO.map((s) => ({ ...s })),
    personal: [],
    grupos: [],
    expedientes: [],
    casosFaltaOficio: [],
    moviles: [],
    reparaciones: [],
    recargos: [],
    partesGuardia: [],
    inspeccionesOculares: [],
    forenses: [],
    licenciados: [],
    informesTecnicos: [],
    intervenciones: [],
    accidentologia: [],
    folios: [],
    auditoria: [],
    novedadesDelegaciones: [],
    charlasPrevencion: [],
    licenciasPoliciales: [],
    saldosLicencias: [],
    feriados: DEFAULT_FERIADOS_ARGENTINA.map((f) => ({ ...f })),
    memosNotas: [],
  };
}

export function initDatabase(): SispolDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      saveDatabase(initial);
      console.log('[Sis.Pol. DB] Base de datos central creada en:', DB_FILE);
      return initial;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    // Asegurar que existan todos los arrays requeridos
    let modified = false;
    const initial = getInitialDatabase();
    for (const key of Object.keys(initial) as (keyof SispolDatabase)[]) {
      if (Array.isArray(initial[key]) && !Array.isArray(parsed[key])) {
        parsed[key] = initial[key];
        modified = true;
      }
    }

    // Asegurar existencia de usuarios obligatorios
    if (parsed.usuarios && Array.isArray(parsed.usuarios)) {
      for (const defUsr of DEFAULT_USUARIOS) {
        if (!parsed.usuarios.some((u: any) => u.id === defUsr.id || u.username === defUsr.username)) {
          parsed.usuarios.push({ ...defUsr });
          modified = true;
        }
      }
    }

    // Asegurar existencia de delegaciones
    if (parsed.delegaciones && Array.isArray(parsed.delegaciones)) {
      for (const defDel of DEFAULT_DELEGACIONES) {
        if (!parsed.delegaciones.some((d: any) => d.id === defDel.id)) {
          parsed.delegaciones.push({ ...defDel });
          modified = true;
        }
      }
    }

    // Migración incremental: asegurar módulos 'licencias' y 'memos-notas' y sus catálogos en configuraciones existentes
    if (Array.isArray(parsed.configuracion)) {
      parsed.configuracion = parsed.configuracion.map((cfg: any) => {
        let cfgMod = false;
        const copy = { ...cfg };
        if (!Array.isArray(copy.tiposLicenciaCatalogo) || copy.tiposLicenciaCatalogo.length === 0) {
          copy.tiposLicenciaCatalogo = DEFAULT_TIPOS_LICENCIA;
          cfgMod = true;
        }
        if (!Array.isArray(copy.tiposMemoCatalogo) || copy.tiposMemoCatalogo.length === 0) {
          copy.tiposMemoCatalogo = DEFAULT_TIPOS_MEMO;
          cfgMod = true;
        }
        if (Array.isArray(copy.estructuraModulos) && !copy.estructuraModulos.some((m: any) => m.id === 'licencias')) {
          copy.estructuraModulos = [
            ...copy.estructuraModulos,
            { id: 'licencias', label: 'Licencia Policial', desc: 'Régimen, Saldos Art. 7 y Feriados', orden: 3, padreId: null, visible: true },
          ];
          cfgMod = true;
        }
        if (Array.isArray(copy.estructuraModulos) && !copy.estructuraModulos.some((m: any) => m.id === 'memos-notas')) {
          copy.estructuraModulos = [
            ...copy.estructuraModulos,
            { id: 'memos-notas', label: 'Memos y Notas', desc: 'Memorándums, Nota V, Notas & Anexos', orden: copy.estructuraModulos.length + 1, padreId: null, visible: true },
          ];
          cfgMod = true;
        }
        if (cfgMod) modified = true;
        return copy;
      });
    }

    if (Array.isArray(parsed.roles)) {
      for (const defRol of DEFAULT_ROLES) {
        if (!parsed.roles.some((r: any) => r.id === defRol.id)) {
          parsed.roles.push({ ...defRol });
          modified = true;
        }
      }
      parsed.roles = parsed.roles.map((r: any) => {
        if ((r.id === 'rol-superusuario' || r.id === 'rol-admin') && Array.isArray(r.modulosPermitidos)) {
          let updatedMods = [...r.modulosPermitidos];
          let changed = false;
          if (!updatedMods.includes('licencias')) {
            updatedMods.push('licencias');
            changed = true;
          }
          if (!updatedMods.includes('memos-notas')) {
            updatedMods.push('memos-notas');
            changed = true;
          }
          if (changed) {
            modified = true;
            return { ...r, modulosPermitidos: updatedMods };
          }
        }
        return r;
      });
    }

    if (Array.isArray(parsed.usuarios)) {
      parsed.usuarios = parsed.usuarios.map((u: any) => {
        if ((u.rol === 'superusuario' || u.rol === 'Administrador') && Array.isArray(u.modulosPermitidos)) {
          let updatedMods = [...u.modulosPermitidos];
          let changed = false;
          if (!updatedMods.includes('licencias')) {
            updatedMods.push('licencias');
            changed = true;
          }
          if (!updatedMods.includes('memos-notas')) {
            updatedMods.push('memos-notas');
            changed = true;
          }
          if (changed) {
            modified = true;
            return { ...u, modulosPermitidos: updatedMods };
          }
        }
        return u;
      });
    }

    if (Array.isArray(parsed.feriados) && parsed.feriados.length === 0 && !parsed.feriadosInitialized) {
      parsed.feriados = DEFAULT_FERIADOS_ARGENTINA.map((f) => ({ ...f }));
      parsed.feriadosInitialized = true;
      modified = true;
    }

    if (!parsed.seriesNumerarioStandardizedV2) {
      const migration = standardizeControlFoliosSeries(
        Array.isArray(parsed.seriesNumerario) ? parsed.seriesNumerario : [],
        Array.isArray(parsed.folios) ? parsed.folios : [],
        Array.isArray(parsed.memosNotas) ? parsed.memosNotas : []
      );
      parsed.seriesNumerario = migration.series;
      parsed.seriesNumerarioStandardizedV2 = true;
      modified = true;
    }

    if (!parsed.memorandumRRestrictedV3) {
      const memRMig = enforceMemorandumRVisibilityRestriction(
        Array.isArray(parsed.seriesNumerario) ? parsed.seriesNumerario : [],
        Array.isArray(parsed.configuracion) ? parsed.configuracion : []
      );
      parsed.seriesNumerario = memRMig.series;
      if (Array.isArray(parsed.configuracion)) {
        parsed.configuracion = memRMig.configuraciones;
      }
      parsed.memorandumRRestrictedV3 = true;
      modified = true;
    }

    if (modified) {
      saveDatabase(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('[Sis.Pol. DB] Error leyendo base de datos, reinicializando:', err);
    const initial = getInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
}

export function saveDatabase(data: SispolDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('[Sis.Pol. DB] Error guardando base de datos:', err);
    throw err;
  }
}

export function getDatabase(): SispolDatabase {
  return initDatabase();
}

export function saveItem(collection: keyof SispolDatabase, item: any): SispolDatabase {
  const db = initDatabase();
  if (!Array.isArray(db[collection])) {
    (db[collection] as any) = [];
  }

  const list = db[collection] as any[];
  const idKey = item.id ? 'id' : item.username ? 'username' : 'id';
  const existingIdx = list.findIndex((x) => x[idKey] === item[idKey]);

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...item };
  } else {
    list.unshift(item);
  }

  saveDatabase(db);
  return db;
}

export function deleteItem(collection: keyof SispolDatabase, id: string): SispolDatabase {
  const db = initDatabase();
  if (Array.isArray(db[collection])) {
    const list = db[collection] as any[];
    const filtered = list.filter((x) => x.id !== id && x.username !== id);
    (db[collection] as any) = filtered;
    saveDatabase(db);
  }
  return db;
}

export function wipeOperationalData(): SispolDatabase {
  const db = initDatabase();
  // Vaciar solo las tablas operativas, preservando cuentas, delegaciones, config y auditoría
  db.personal = [];
  db.grupos = [];
  db.expedientes = [];
  db.casosFaltaOficio = [];
  db.moviles = [];
  db.reparaciones = [];
  db.recargos = [];
  db.partesGuardia = [];
  db.inspeccionesOculares = [];
  db.forenses = [];
  db.licenciados = [];
  db.informesTecnicos = [];
  db.intervenciones = [];
  db.accidentologia = [];
  db.folios = [];
  db.novedadesDelegaciones = [];
  db.charlasPrevencion = [];
  db.licenciasPoliciales = [];
  db.saldosLicencias = [];
  db.memosNotas = [];

  saveDatabase(db);
  return db;
}

export function getDatabaseStatus() {
  const db = initDatabase();
  const counts: Record<string, number> = {};
  for (const [key, val] of Object.entries(db)) {
    if (Array.isArray(val)) {
      counts[key] = val.length;
    }
  }

  let fileSize = 0;
  if (fs.existsSync(DB_FILE)) {
    fileSize = fs.statSync(DB_FILE).size;
  }

  return {
    filePath: DB_FILE,
    fileSizeBytes: fileSize,
    lastUpdated: db.lastUpdated,
    counts,
  };
}

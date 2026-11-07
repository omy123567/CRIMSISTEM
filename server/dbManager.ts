import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_USUARIOS,
  DEFAULT_DELEGACIONES,
  DEFAULT_ROLES,
  DEFAULT_SERIES_NUMERARIO,
  DEFAULT_CONFIG,
} from '../src/db/database';

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
}

function getInitialDatabase(): SispolDatabase {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    configuracion: [DEFAULT_CONFIG],
    usuarios: [...DEFAULT_USUARIOS],
    delegaciones: [...DEFAULT_DELEGACIONES],
    roles: [...DEFAULT_ROLES],
    seriesNumerario: [...DEFAULT_SERIES_NUMERARIO],
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
          parsed.usuarios.push(defUsr);
          modified = true;
        }
      }
    }

    // Asegurar existencia de delegaciones
    if (parsed.delegaciones && Array.isArray(parsed.delegaciones)) {
      for (const defDel of DEFAULT_DELEGACIONES) {
        if (!parsed.delegaciones.some((d: any) => d.id === defDel.id)) {
          parsed.delegaciones.push(defDel);
          modified = true;
        }
      }
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
  // Vaciar solo las tablas operativas, preservando cuentas, delegaciones y config
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
  db.auditoria = [];

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

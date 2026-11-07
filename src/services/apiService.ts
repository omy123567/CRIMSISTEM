import { db, wipeAllOperationalData } from '../db/database';

export interface ServerSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  serverError: string | null;
}

const COLLECTIONS = [
  'personal',
  'grupos',
  'expedientes',
  'casosFaltaOficio',
  'moviles',
  'reparaciones',
  'recargos',
  'partesGuardia',
  'inspeccionesOculares',
  'forenses',
  'licenciados',
  'informesTecnicos',
  'intervenciones',
  'accidentologia',
  'folios',
  'seriesNumerario',
  'usuarios',
  'delegaciones',
  'roles',
  'configuracion',
] as const;

type CollectionName = (typeof COLLECTIONS)[number];

let syncListeners: ((status: ServerSyncStatus) => void)[] = [];
let currentStatus: ServerSyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  serverError: null,
};

function notifyStatus() {
  for (const listener of syncListeners) {
    listener({ ...currentStatus });
  }
}

export function subscribeToSyncStatus(listener: (status: ServerSyncStatus) => void): () => void {
  syncListeners.push(listener);
  listener({ ...currentStatus });
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

/**
 * Descarga todos los datos del servidor central y los sincroniza con la base local IndexedDB (Dexie).
 */
export async function syncWithServer(): Promise<boolean> {
  if (!navigator.onLine) {
    currentStatus.isOnline = false;
    notifyStatus();
    return false;
  }

  currentStatus.isSyncing = true;
  currentStatus.serverError = null;
  notifyStatus();

  try {
    const res = await fetch('/api/data', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const serverDb = await res.json();
    if (!serverDb || typeof serverDb !== 'object') {
      throw new Error('Respuesta inválida del servidor');
    }

    // Actualizar cada tabla en Dexie
    for (const col of COLLECTIONS) {
      const serverItems = serverDb[col];
      const table = (db as any)[col];
      if (table && Array.isArray(serverItems)) {
        await table.clear();
        if (serverItems.length > 0) {
          await table.bulkPut(serverItems);
        }
      }
    }

    currentStatus.isOnline = true;
    currentStatus.isSyncing = false;
    currentStatus.lastSyncTime = new Date();
    currentStatus.serverError = null;
    notifyStatus();
    return true;
  } catch (err: any) {
    console.warn('[Sync] No se pudo sincronizar con servidor central:', err.message);
    currentStatus.isSyncing = false;
    currentStatus.serverError = err.message || 'Error de sincronización';
    notifyStatus();
    return false;
  }
}

/**
 * Guarda un elemento tanto en el servidor central como en IndexedDB.
 */
export async function saveItemToServer(collection: CollectionName, item: any): Promise<void> {
  // 1. Guardar de inmediato en IndexedDB local
  try {
    const table = (db as any)[collection];
    if (table) {
      await table.put(item);
    }
  } catch (err) {
    console.error(`[Local DB] Error al guardar en ${collection}:`, err);
  }

  // 2. Persistir en el servidor Ubuntu
  try {
    const res = await fetch('/api/data/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ collection, item }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    currentStatus.lastSyncTime = new Date();
    currentStatus.isOnline = true;
    notifyStatus();
  } catch (err: any) {
    console.warn(`[Sync POST /api/data/item] No se pudo enviar al servidor:`, err.message);
    currentStatus.serverError = err.message;
    notifyStatus();
  }
}

/**
 * Elimina un elemento tanto del servidor central como de IndexedDB.
 */
export async function deleteItemFromServer(collection: CollectionName, id: string): Promise<void> {
  // 1. Eliminar de IndexedDB local
  try {
    const table = (db as any)[collection];
    if (table) {
      await table.delete(id);
    }
  } catch (err) {
    console.error(`[Local DB] Error al eliminar de ${collection}:`, err);
  }

  // 2. Eliminar del servidor Ubuntu
  try {
    const res = await fetch(`/api/data/item/${collection}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    currentStatus.lastSyncTime = new Date();
    currentStatus.isOnline = true;
    notifyStatus();
  } catch (err: any) {
    console.warn(`[Sync DELETE /api/data/item] No se pudo eliminar en el servidor:`, err.message);
    currentStatus.serverError = err.message;
    notifyStatus();
  }
}

/**
 * Vacía todos los datos operativos tanto del servidor central como de IndexedDB.
 */
export async function wipeAllDataFromServer(): Promise<boolean> {
  // 1. Limpiar Dexie local
  await wipeAllOperationalData();

  // 2. Limpiar servidor central
  try {
    const res = await fetch('/api/data/wipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      currentStatus.lastSyncTime = new Date();
      currentStatus.isOnline = true;
      notifyStatus();
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('[Sync Wipe] Error notificando al servidor:', err.message);
    currentStatus.serverError = err.message;
    notifyStatus();
    return false;
  }
}

/**
 * Sube todo el estado actual de IndexedDB al servidor central para sincronización completa.
 */
export async function pushAllLocalDataToServer(): Promise<boolean> {
  try {
    const fullDatabase: Record<string, any[]> = {};
    for (const col of COLLECTIONS) {
      const table = (db as any)[col];
      if (table) {
        fullDatabase[col] = await table.toArray();
      }
    }

    const res = await fetch('/api/data/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullDatabase }),
    });

    if (res.ok) {
      currentStatus.lastSyncTime = new Date();
      currentStatus.isOnline = true;
      notifyStatus();
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('[Sync Push] Error al enviar base completa al servidor:', err.message);
    currentStatus.serverError = err.message;
    notifyStatus();
    return false;
  }
}

import { db, wipeAllOperationalData } from '../db/database';
import {
  authFetch,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  crearOfflineVerifier,
} from './securityClient';
import { RegistroAuditoria, UsuarioSistema } from '../types/police';

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
  'novedadesDelegaciones',
  'charlasPrevencion',
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

export interface ServerLoginResponse {
  ok: boolean;
  offline?: boolean;
  user?: UsuarioSistema;
  token?: string;
  error?: string;
  status?: number;
}

/**
 * Autentica contra el servidor central (/api/auth/login).
 * Si el servidor no está accesible (offline real), retorna { ok: false, offline: true }.
 */
export async function loginOnServer(
  usernameOrEmail: string,
  password: string
): Promise<ServerLoginResponse> {
  if (!navigator.onLine) {
    return { ok: false, offline: true };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        offline: false,
        status: res.status,
        error: data.error || `Error de autenticación (HTTP ${res.status})`,
      };
    }

    if (data.token && data.user) {
      setAuthToken(data.token);
      // Guardar verificador criptográfico salado localmente para permitir acceso PWA si cae la red
      try {
        const verifier = await crearOfflineVerifier(data.user.username, password);
        const existingLocal = await db.usuarios.get(data.user.id);
        await db.usuarios.put({
          ...(existingLocal || {}),
          ...data.user,
          password: '',
          offlineVerifier: verifier,
        });
      } catch (e) {
        console.warn('[Security] No se pudo actualizar verificador offline:', e);
      }

      currentStatus.isOnline = true;
      currentStatus.serverError = null;
      notifyStatus();
      return { ok: true, user: data.user, token: data.token };
    }

    return { ok: false, error: 'Respuesta inválida del servidor de autenticación.' };
  } catch (err: any) {
    console.warn('[Auth] Servidor inaccesible, evaluando modo offline:', err?.message);
    return { ok: false, offline: true };
  }
}

export async function logoutOnServer(): Promise<void> {
  try {
    if (navigator.onLine && getAuthToken()) {
      await authFetch('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    // ignore
  } finally {
    clearAuthToken();
  }
}

export async function changePasswordOnServer(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; user?: UsuarioSistema; error?: string }> {
  try {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Error HTTP ${res.status}` };
    }

    if (data.user) {
      try {
        const verifier = await crearOfflineVerifier(data.user.username, newPassword);
        await db.usuarios.put({
          ...data.user,
          password: '',
          offlineVerifier: verifier,
        });
      } catch {
        // ignore
      }
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'No se pudo conectar al servidor para actualizar la contraseña.',
    };
  }
}

/**
 * Descarga los datos autorizados del servidor central y los sincroniza con IndexedDB (Dexie).
 */
export async function syncWithServer(): Promise<boolean> {
  if (!navigator.onLine) {
    currentStatus.isOnline = false;
    notifyStatus();
    return false;
  }

  if (!getAuthToken()) {
    return false;
  }

  currentStatus.isSyncing = true;
  currentStatus.serverError = null;
  notifyStatus();

  try {
    const res = await authFetch('/api/data', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const serverDb = await res.json();
    if (!serverDb || typeof serverDb !== 'object') {
      throw new Error('Respuesta inválida del servidor');
    }

    // Preservar offlineVerifier locales de usuarios antes de refrescar tabla usuarios
    const localUsers = await db.usuarios.toArray().catch(() => []);
    const verifierMap = new Map(
      localUsers
        .filter((u) => Boolean(u.offlineVerifier))
        .map((u) => [u.id, u.offlineVerifier])
    );

    // Actualizar cada tabla en Dexie
    for (const col of COLLECTIONS) {
      const serverItems = serverDb[col];
      const table = (db as any)[col];
      if (table && Array.isArray(serverItems)) {
        await table.clear();
        if (serverItems.length > 0) {
          if (col === 'usuarios') {
            const mergedUsers = serverItems.map((u: any) => ({
              ...u,
              password: '',
              offlineVerifier: verifierMap.get(u.id),
            }));
            await table.bulkPut(mergedUsers);
          } else {
            await table.bulkPut(serverItems);
          }
        }
      }
    }

    if (Array.isArray(serverDb.auditoria) && serverDb.auditoria.length > 0) {
      await db.auditoria.bulkPut(serverDb.auditoria);
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
 * Guarda un elemento tanto en IndexedDB local (sin contraseñas en claro) como en el servidor central.
 */
export async function saveItemToServer(collection: CollectionName, item: any): Promise<any> {
  // 1. Guardar en IndexedDB local (si es usuario, no persistir contraseña en texto claro)
  try {
    const table = (db as any)[collection];
    if (table) {
      if (collection === 'usuarios') {
        const existingLocal = await db.usuarios.get(item.id).catch(() => undefined);
        let offlineVerifier = existingLocal?.offlineVerifier;
        if (item.password && String(item.password).trim().length >= 8) {
          offlineVerifier = await crearOfflineVerifier(item.username, String(item.password).trim());
        }
        await table.put({
          ...item,
          password: '',
          offlineVerifier,
        });
      } else {
        await table.put(item);
      }
    }
  } catch (err) {
    console.error(`[Local DB] Error al guardar en ${collection}:`, err);
  }

  // 2. Persistir en el servidor central
  try {
    const res = await authFetch('/api/data/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ collection, item }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    currentStatus.lastSyncTime = new Date();
    currentStatus.isOnline = true;
    currentStatus.serverError = null;
    notifyStatus();
    return data.item || item;
  } catch (err: any) {
    console.warn(`[Sync POST /api/data/item] No se pudo enviar al servidor:`, err.message);
    currentStatus.serverError = err.message;
    notifyStatus();
    return item;
  }
}

/**
 * Elimina un elemento tanto de IndexedDB como del servidor central.
 */
export async function deleteItemFromServer(collection: CollectionName, id: string): Promise<void> {
  try {
    const table = (db as any)[collection];
    if (table) {
      await table.delete(id);
    }
  } catch (err) {
    console.error(`[Local DB] Error al eliminar de ${collection}:`, err);
  }

  try {
    const res = await authFetch(`/api/data/item/${collection}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    currentStatus.lastSyncTime = new Date();
    currentStatus.isOnline = true;
    currentStatus.serverError = null;
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
  await wipeAllOperationalData();

  try {
    const res = await authFetch('/api/data/wipe', {
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

    const res = await authFetch('/api/data/sync', {
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

export async function restoreDatabaseOnServer(data: any): Promise<boolean> {
  try {
    const res = await authFetch('/api/data/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAuditFromServer(): Promise<RegistroAuditoria[] | null> {
  try {
    if (!navigator.onLine || !getAuthToken()) return null;
    const res = await authFetch('/api/audit');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.auditoria)) {
      if (data.auditoria.length > 0) {
        await db.auditoria.bulkPut(data.auditoria).catch(() => {});
      }
      return data.auditoria;
    }
    return null;
  } catch {
    return null;
  }
}

export async function purgeAuditOnServer(
  dias: number
): Promise<{ success: boolean; removed?: number; error?: string }> {
  try {
    const res = await authFetch('/api/audit/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, removed: data.removed };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red' };
  }
}

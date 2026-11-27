import { db, wipeAllOperationalData } from '../db/database';
import {
  authFetch,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  crearOfflineVerifier,
  getAllTrustedDeviceTokens,
  saveTrustedDeviceTokenForUser,
  removeTrustedDeviceTokenForUser,
} from './securityClient';
import { DispositivoConfiableInfo, RegistroAuditoria, UsuarioSistema } from '../types/police';

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
  'licenciasPoliciales',
  'saldosLicencias',
  'feriados',
  'memosNotas',
  'inventarioBienes',
  'actasCambioJefe',
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
  requires2fa?: boolean;
  pendingToken?: string;
  username?: string;
  apellidoYNombre?: string;
  expiredTrustedDevice?: boolean;
  trustedDeviceUsed?: string;
  user?: UsuarioSistema;
  token?: string;
  error?: string;
  status?: number;
}

async function cacheAuthenticatedUserLocally(user: UsuarioSistema, rawPassword?: string) {
  try {
    const existingLocal = await db.usuarios.get(user.id);
    const offlineVerifier =
      rawPassword && !user.totpEnabled
        ? await crearOfflineVerifier(user.username, rawPassword)
        : existingLocal?.offlineVerifier;
    await db.usuarios.put({
      ...(existingLocal || {}),
      ...user,
      password: '',
      offlineVerifier: user.totpEnabled ? undefined : offlineVerifier,
    });
  } catch (e) {
    console.warn('[Security] No se pudo actualizar caché local de usuario:', e);
  }
}

/**
 * Autentica contra el servidor central (/api/auth/login).
 * Envía los tokens de dispositivos de confianza almacenados localmente.
 */
export async function loginOnServer(
  usernameOrEmail: string,
  password: string
): Promise<ServerLoginResponse> {
  if (!navigator.onLine) {
    return { ok: false, offline: true };
  }

  try {
    const trustedDeviceTokens = getAllTrustedDeviceTokens();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ usernameOrEmail, password, trustedDeviceTokens }),
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

    if (data.requires2fa && data.pendingToken) {
      return {
        ok: false,
        offline: false,
        requires2fa: true,
        pendingToken: data.pendingToken,
        username: data.username,
        apellidoYNombre: data.apellidoYNombre,
        expiredTrustedDevice: Boolean(data.expiredTrustedDevice),
      };
    }

    if (data.token && data.user) {
      setAuthToken(data.token);
      await cacheAuthenticatedUserLocally(data.user, password);

      currentStatus.isOnline = true;
      currentStatus.serverError = null;
      notifyStatus();
      return {
        ok: true,
        user: data.user,
        token: data.token,
        trustedDeviceUsed: data.trustedDeviceUsed,
      };
    }

    return { ok: false, error: 'Respuesta inválida del servidor de autenticación.' };
  } catch (err: any) {
    console.warn('[Auth] Servidor inaccesible, evaluando modo offline:', err?.message);
    return { ok: false, offline: true };
  }
}

export async function verify2faLoginOnServer(params: {
  pendingToken: string;
  code: string;
  trustDevice: boolean;
  deviceLabel?: string;
  rawPassword?: string;
}): Promise<{
  ok: boolean;
  user?: UsuarioSistema;
  trustedDevice?: DispositivoConfiableInfo;
  usedBackupCode?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/2fa/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        pendingToken: params.pendingToken,
        code: params.code,
        trustDevice: params.trustDevice,
        deviceLabel: params.deviceLabel,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token || !data.user) {
      return { ok: false, error: data.error || `Error verificando 2FA (HTTP ${res.status})` };
    }

    setAuthToken(data.token);
    if (data.trustedDeviceToken && data.user?.id) {
      saveTrustedDeviceTokenForUser(data.user.id, data.trustedDeviceToken, data.trustedDevice?.id);
    }
    await cacheAuthenticatedUserLocally(data.user, params.rawPassword);

    currentStatus.isOnline = true;
    currentStatus.serverError = null;
    notifyStatus();

    return {
      ok: true,
      user: data.user,
      trustedDevice: data.trustedDevice,
      usedBackupCode: Boolean(data.usedBackupCode),
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de conexión al verificar 2FA.' };
  }
}

export async function setup2faOnServer(): Promise<{
  success: boolean;
  secret?: string;
  otpauthUrl?: string;
  qrDataUrl?: string;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };
    return {
      success: true,
      secret: data.secret,
      otpauthUrl: data.otpauthUrl,
      qrDataUrl: data.qrDataUrl,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión.' };
  }
}

export async function enable2faOnServer(params: {
  currentPassword: string;
  code: string;
  trustCurrentDevice: boolean;
  deviceLabel?: string;
}): Promise<{
  success: boolean;
  backupCodes?: string[];
  user?: UsuarioSistema;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };

    if (data.trustedDeviceToken && data.user?.id) {
      saveTrustedDeviceTokenForUser(data.user.id, data.trustedDeviceToken, data.trustedDevice?.id);
    }
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, backupCodes: data.backupCodes, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error activando 2FA.' };
  }
}

export async function disable2faOnServer(
  currentPassword: string,
  code: string
): Promise<{ success: boolean; user?: UsuarioSistema; error?: string }> {
  try {
    const res = await authFetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };

    if (data.user?.id) {
      removeTrustedDeviceTokenForUser(data.user.id);
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error desactivando 2FA.' };
  }
}

export async function trustCurrentDeviceOnServer(
  code: string,
  deviceLabel?: string
): Promise<{ success: boolean; user?: UsuarioSistema; trustedDevice?: DispositivoConfiableInfo; error?: string }> {
  try {
    const res = await authFetch('/api/auth/2fa/trusted-devices/trust-current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceLabel }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };

    if (data.trustedDeviceToken && data.user?.id) {
      saveTrustedDeviceTokenForUser(data.user.id, data.trustedDeviceToken, data.trustedDevice?.id);
    }
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, user: data.user, trustedDevice: data.trustedDevice };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error registrando dispositivo.' };
  }
}

export async function revokeTrustedDeviceOnServer(
  deviceId: string,
  userId?: string
): Promise<{ success: boolean; user?: UsuarioSistema; error?: string }> {
  try {
    const res = await authFetch(`/api/auth/2fa/trusted-devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };

    if (deviceId === 'all' && userId) {
      removeTrustedDeviceTokenForUser(userId);
    }
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error revocando dispositivo.' };
  }
}

export async function adminResetUser2faOnServer(
  userId: string
): Promise<{ success: boolean; user?: UsuarioSistema; error?: string }> {
  try {
    const res = await authFetch(`/api/auth/2fa/admin-reset/${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error restableciendo 2FA.' };
  }
}

export async function adminChangePasswordOnServer(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; user?: UsuarioSistema; error?: string }> {
  try {
    const res = await authFetch(`/api/auth/admin-change-password/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar contraseña del usuario.' };
  }
}

export async function adminSetupUser2faOnServer(userId: string): Promise<{
  success: boolean;
  secret?: string;
  otpauthUrl?: string;
  qrDataUrl?: string;
  error?: string;
}> {
  try {
    const res = await authFetch(`/api/auth/2fa/admin-setup/${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };
    return {
      success: true,
      secret: data.secret,
      otpauthUrl: data.otpauthUrl,
      qrDataUrl: data.qrDataUrl,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error generando QR 2FA para el usuario.' };
  }
}

export async function adminEnableUser2faOnServer(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  backupCodes?: string[];
  user?: UsuarioSistema;
  error?: string;
}> {
  try {
    const res = await authFetch(`/api/auth/2fa/admin-enable/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Error HTTP ${res.status}` };
    if (data.user) {
      await cacheAuthenticatedUserLocally(data.user);
    }
    return { success: true, backupCodes: data.backupCodes, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error activando 2FA del usuario.' };
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
      await cacheAuthenticatedUserLocally(data.user, newPassword);
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

export interface ImportedFeriadoCandidate {
  fecha: string;
  nombre: string;
  tipo: 'Nacional' | 'Provincial' | 'No Laborable' | 'Turístico' | 'Otro';
}

export async function importFeriadosFromUrlOnServer(url: string): Promise<{
  success: boolean;
  feriados?: ImportedFeriadoCandidate[];
  source?: string;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/feriados/import-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Error HTTP ${res.status}` };
    }
    return { success: true, feriados: data.feriados || [], source: data.source };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión con el servidor.' };
  }
}

export async function importFeriadosFromImageOnServer(
  imageDataUrl: string,
  anioSugerido?: number
): Promise<{
  success: boolean;
  feriados?: ImportedFeriadoCandidate[];
  source?: string;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/feriados/import-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, anioSugerido }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Error HTTP ${res.status}` };
    }
    return { success: true, feriados: data.feriados || [], source: data.source };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión con el servidor.' };
  }
}

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request } from 'express';
import type { SispolDatabase } from './dbManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SECRET_FILE = path.resolve(DATA_DIR, '.session_secret');

export const SESSION_COOKIE_NAME = 'sispol_token';
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 horas (turno de guardia)

export const ALLOWED_COLLECTIONS: readonly (keyof SispolDatabase)[] = [
  'configuracion',
  'usuarios',
  'delegaciones',
  'roles',
  'seriesNumerario',
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
  'auditoria',
  'novedadesDelegaciones',
  'charlasPrevencion',
];

let cachedSecret: string | null = null;

export function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 32) {
    cachedSecret = process.env.SESSION_SECRET.trim();
    return cachedSecret;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      const stored = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (stored.length >= 32) {
        cachedSecret = stored;
        return cachedSecret;
      }
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    cachedSecret = crypto.randomBytes(48).toString('hex');
    return cachedSecret;
  }
}

/**
 * Genera hash scrypt con salt aleatorio de 16 bytes
 */
export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifica contraseña contra hash scrypt o legacy en claro usando timingSafeEqual
 */
export function verifyPassword(
  plainPassword: string,
  storedHash?: string,
  legacyPlain?: string
): boolean {
  if (!plainPassword) return false;

  if (storedHash && storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derivedBuf = crypto.scryptSync(plainPassword, salt, 64);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (derivedBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derivedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  if (legacyPlain && legacyPlain.length > 0) {
    const a = crypto.createHash('sha256').update(plainPassword).digest();
    const b = crypto.createHash('sha256').update(legacyPlain).digest();
    return crypto.timingSafeEqual(a, b);
  }

  return false;
}

/**
 * Migra contraseñas heredadas en texto claro en data/sispol_database.json a hashes scrypt.
 * Clona los objetos para no mutar constantes en memoria.
 */
export function ensureHashedPasswordsOnDb(
  db: SispolDatabase,
  saveFn: (data: SispolDatabase) => void
): boolean {
  if (!Array.isArray(db.usuarios)) return false;
  let modified = false;

  db.usuarios = db.usuarios.map((u: any) => {
    if (!u || typeof u !== 'object') return u;
    const hasValidHash = typeof u.passwordHash === 'string' && u.passwordHash.startsWith('scrypt$');
    const plain = typeof u.password === 'string' && u.password.trim().length > 0 ? u.password.trim() : '';

    if (!hasValidHash && plain) {
      modified = true;
      return {
        ...u,
        passwordHash: hashPassword(plain),
        password: '',
      };
    }

    if (hasValidHash && u.password) {
      modified = true;
      return {
        ...u,
        password: '',
      };
    }

    return u;
  });

  if (modified) {
    saveFn(db);
  }
  return modified;
}

/**
 * Limpia campos sensibles antes de enviar cualquier objeto de usuario al cliente
 */
export function sanitizeUserForClient<T extends Record<string, any>>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const copy: any = { ...user };
  delete copy.passwordHash;
  delete copy.offlineVerifier;
  copy.password = '';
  return copy;
}

export interface TokenPayload {
  uid: string;
  username: string;
  rol: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signSessionToken(user: any): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    uid: String(user.id),
    username: String(user.username),
    rol: String(user.rol || 'Operador'),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'SISPOL' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', getSessionSecret()).update(data).digest()
    );
    const a = Buffer.from(sigB64);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.uid || !payload.exp || payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string' && cookieHeader.length > 0) {
    const cookies = cookieHeader.split(';');
    for (const c of cookies) {
      const idx = c.indexOf('=');
      if (idx > 0) {
        const key = c.slice(0, idx).trim();
        const val = c.slice(idx + 1).trim();
        if (key === SESSION_COOKIE_NAME && val) {
          return decodeURIComponent(val);
        }
      }
    }
  }
  return null;
}

export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'desconocida';
}

// --- RATE LIMITING ANTI-FUERZA BRUTA ---
interface RateRecord {
  attempts: number[];
  lockedUntil?: number;
}

const loginAttemptsMap = new Map<string, RateRecord>();
const apiRateMap = new Map<string, number[]>();

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const rec = loginAttemptsMap.get(key);
  if (!rec) return { allowed: true, retryAfterSeconds: 0 };

  if (rec.lockedUntil && rec.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rec.lockedUntil - now) / 1000),
    };
  }

  rec.attempts = rec.attempts.filter((ts) => now - ts < LOGIN_WINDOW_MS);
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    delete rec.lockedUntil;
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string): { locked: boolean; remaining: number } {
  const now = Date.now();
  const rec = loginAttemptsMap.get(key) || { attempts: [] };
  rec.attempts = rec.attempts.filter((ts) => now - ts < LOGIN_WINDOW_MS);
  rec.attempts.push(now);

  let locked = false;
  if (rec.attempts.length >= LOGIN_MAX_FAILS) {
    rec.lockedUntil = now + LOGIN_LOCK_MS;
    locked = true;
  }
  loginAttemptsMap.set(key, rec);
  return { locked, remaining: Math.max(0, LOGIN_MAX_FAILS - rec.attempts.length) };
}

export function clearLoginFailures(key: string): void {
  loginAttemptsMap.delete(key);
}

export function checkApiRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (apiRateMap.get(key) || []).filter((ts) => now - ts < windowMs);
  if (list.length >= maxRequests) {
    apiRateMap.set(key, list);
    return false;
  }
  list.push(now);
  apiRateMap.set(key, list);
  return true;
}

// --- RBAC Y AISLAMIENTO MULTI-DELEGACIÓN ---
export function isSuperusuario(user: any): boolean {
  return Boolean(user && String(user.rol).toLowerCase() === 'superusuario');
}

export function getAllowedDelegations(user: any): 'ALL' | string[] {
  if (!user) return [];
  if (isSuperusuario(user)) return 'ALL';
  const set = new Set<string>();
  if (user.delegacionId) set.add(user.delegacionId);
  if (user.puedeVerOtrasDelegaciones && Array.isArray(user.delegacionesPermitidas)) {
    for (const delId of user.delegacionesPermitidas) {
      if (typeof delId === 'string' && delId.trim()) set.add(delId.trim());
    }
  }
  return Array.from(set);
}

export function canAccessDelegation(user: any, delegacionId?: string): boolean {
  const allowed = getAllowedDelegations(user);
  if (allowed === 'ALL') return true;
  const effectiveDel = delegacionId || 'del-laguna-blanca';
  return allowed.includes(effectiveDel);
}

const DELEGATION_SCOPED_COLLECTIONS = new Set<string>([
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
  'charlasPrevencion',
]);

export function filterDatabaseForUser(db: SispolDatabase, user: any): Partial<SispolDatabase> {
  const allowed = getAllowedDelegations(user);
  const superUsr = isSuperusuario(user);

  const sanitizedUsuarios = (db.usuarios || [])
    .filter((u: any) => {
      if (superUsr) return true;
      if (u.id === user.id) return true;
      return canAccessDelegation(user, u.delegacionId);
    })
    .map(sanitizeUserForClient);

  const result: any = {
    version: db.version,
    lastUpdated: db.lastUpdated,
    delegaciones: db.delegaciones || [],
    roles: db.roles || [],
    usuarios: sanitizedUsuarios,
    auditoria: superUsr ? (db.auditoria || []) : [],
  };

  // Configuracion: mantener global-config / delegaciones permitidas + propagar estructuraModulos
  result.configuracion = (db.configuracion || []).filter((cfg: any) => {
    if (allowed === 'ALL') return true;
    if (!cfg.delegacionId || cfg.id === 'global-config') return true;
    return allowed.includes(cfg.delegacionId);
  });

  // Novedades inter-delegaciones: visibles si origen o destino pertenece al usuario o es TODAS
  result.novedadesDelegaciones = (db.novedadesDelegaciones || []).filter((nov: any) => {
    if (allowed === 'ALL') return true;
    const dest = nov.destinatarioDelegacionId || nov.destinoDelegacionId;
    if (dest === 'TODAS') return true;
    return allowed.includes(nov.origenDelegacionId) || (dest && allowed.includes(dest));
  });

  for (const col of DELEGATION_SCOPED_COLLECTIONS) {
    const items = (db as any)[col] || [];
    if (allowed === 'ALL') {
      result[col] = items;
    } else if (col === 'reparaciones') {
      const allowedMovilIds = new Set(
        (db.moviles || [])
          .filter((m: any) => allowed.includes(m.delegacionId || 'del-laguna-blanca'))
          .map((m: any) => m.id)
      );
      result[col] = items.filter(
        (rep: any) =>
          (rep.delegacionId && allowed.includes(rep.delegacionId)) ||
          allowedMovilIds.has(rep.movilId)
      );
    } else if (col === 'intervenciones') {
      const allowedParteIds = new Set(
        (db.partesGuardia || [])
          .filter((p: any) => allowed.includes(p.delegacionId || 'del-laguna-blanca'))
          .map((p: any) => p.id)
      );
      result[col] = items.filter(
        (inter: any) =>
          (inter.delegacionId && allowed.includes(inter.delegacionId)) ||
          (inter.parteId && allowedParteIds.has(inter.parteId))
      );
    } else {
      result[col] = items.filter((item: any) =>
        allowed.includes(item.delegacionId || 'del-laguna-blanca')
      );
    }
  }

  return result;
}

export function canManageUsers(user: any): boolean {
  if (!user) return false;
  if (isSuperusuario(user)) return true;
  if (user.rol === 'Administrador') return true;
  if (user.accionesPersonalizadas?.puedeGestionarUsuarios) return true;
  return Array.isArray(user.modulosPermitidos) && user.modulosPermitidos.includes('usuarios') && !user.esSoloLectura;
}

export function canWriteCollection(
  user: any,
  collection: string,
  existingItem: any | undefined,
  incomingItem: any
): { allowed: boolean; reason?: string } {
  if (!user || !user.activo) {
    return { allowed: false, reason: 'Usuario inactivo o no autenticado.' };
  }

  if (collection === 'auditoria') {
    return { allowed: false, reason: 'El registro de auditoría es de solo inserción mediante /api/audit.' };
  }

  if (isSuperusuario(user)) {
    return { allowed: true };
  }

  // Permitir marcar leído en novedades o actualizar avisos si participa su delegación
  if (collection === 'novedadesDelegaciones') {
    if (user.esSoloLectura && existingItem) {
      // Un usuario solo lectura puede marcar como leído un aviso, pero no alterar el mensaje
      if (existingItem.mensaje === incomingItem.mensaje) {
        return { allowed: true };
      }
    }
    if (user.esSoloLectura && !existingItem) {
      return { allowed: false, reason: 'El perfil Solo Lectura no puede emitir novedades.' };
    }
    const targetDel = incomingItem.origenDelegacionId || user.delegacionId;
    if (!canAccessDelegation(user, targetDel)) {
      return { allowed: false, reason: 'No autorizado para emitir novedades desde otra delegación.' };
    }
    return { allowed: true };
  }

  if (user.esSoloLectura) {
    return { allowed: false, reason: 'Su cuenta posee perfil Solo Lectura (sin permisos de escritura).' };
  }

  const isUpdate = Boolean(existingItem);
  if (!isUpdate && user.puedeCrear === false) {
    return { allowed: false, reason: 'No posee permiso para crear nuevos registros (puedeCrear = false).' };
  }
  if (isUpdate && user.puedeModificar === false) {
    return { allowed: false, reason: 'No posee permiso para modificar registros existentes.' };
  }

  // Validar permisos sobre Usuarios y Roles (anti-escalada de privilegios)
  if (collection === 'usuarios') {
    if (!canManageUsers(user)) {
      return { allowed: false, reason: 'No tiene autorización para gestionar usuarios.' };
    }
    if (String(incomingItem.rol).toLowerCase() === 'superusuario') {
      return { allowed: false, reason: 'Solo un Superusuario puede crear o asignar el rol Superusuario.' };
    }
    if (existingItem && String(existingItem.rol).toLowerCase() === 'superusuario') {
      return { allowed: false, reason: 'Solo un Superusuario puede modificar cuentas de Superusuario.' };
    }
    const targetDel = incomingItem.delegacionId || existingItem?.delegacionId;
    if (!canAccessDelegation(user, targetDel)) {
      return { allowed: false, reason: 'No puede administrar usuarios fuera de su delegación autorizada.' };
    }
    return { allowed: true };
  }

  if (collection === 'roles') {
    if (!canManageUsers(user)) {
      return { allowed: false, reason: 'No tiene autorización para administrar roles.' };
    }
    if (existingItem?.esSistema || String(incomingItem.id) === 'rol-superusuario') {
      return { allowed: false, reason: 'Los roles de sistema protegidos solo pueden modificarse por Superusuario.' };
    }
    return { allowed: true };
  }

  if (collection === 'delegaciones') {
    if (user.rol !== 'Administrador') {
      return { allowed: false, reason: 'Solo Administradores o Superusuarios pueden modificar delegaciones.' };
    }
    if (!canAccessDelegation(user, incomingItem.id)) {
      return { allowed: false, reason: 'No puede modificar delegaciones ajenas.' };
    }
    return { allowed: true };
  }

  if (collection === 'configuracion') {
    const targetDel = incomingItem.delegacionId || user.delegacionId;
    if (!canAccessDelegation(user, targetDel)) {
      return { allowed: false, reason: 'No puede modificar la configuración de otra delegación.' };
    }
    // Verificar si intentó resetear contadores sin permiso
    if (existingItem && !user.puedeResetearContadores) {
      const decCrim =
        typeof incomingItem.ultimoNroIntervencionCriminalistica === 'number' &&
        incomingItem.ultimoNroIntervencionCriminalistica < (existingItem.ultimoNroIntervencionCriminalistica || 0);
      const decAcc =
        typeof incomingItem.ultimoNroIntervencionAccidentologica === 'number' &&
        incomingItem.ultimoNroIntervencionAccidentologica < (existingItem.ultimoNroIntervencionAccidentologica || 0);
      const decIO =
        typeof incomingItem.ultimoNroIO === 'number' &&
        incomingItem.ultimoNroIO < (existingItem.ultimoNroIO || 0);
      if (decCrim || decAcc || decIO) {
        return { allowed: false, reason: 'No posee autorización para resetear o disminuir contadores oficiales.' };
      }
    }
    // Verificar administración de estructura de módulos
    if (
      existingItem &&
      user.rol !== 'Administrador' &&
      !user.puedeAdministrarModulos &&
      JSON.stringify(existingItem.estructuraModulos || []) !== JSON.stringify(incomingItem.estructuraModulos || [])
    ) {
      return { allowed: false, reason: 'No posee autorización para alterar la estructura de módulos.' };
    }
    return { allowed: true };
  }

  // Actuaciones cerradas / cargadas
  if (
    isUpdate &&
    !user.puedeModificarActuacionesCargadas &&
    user.rol !== 'Administrador'
  ) {
    if (collection === 'partesGuardia' && existingItem.cerrado) {
      return { allowed: false, reason: 'El parte de guardia ya está cerrado; requiere permiso para modificar actuaciones cargadas.' };
    }
    if (collection === 'inspeccionesOculares' || collection === 'intervenciones') {
      return { allowed: false, reason: 'Requiere permiso especial para modificar actuaciones o inspecciones ya cargadas.' };
    }
  }

  // Aislamiento por delegación en tablas operativas
  if (DELEGATION_SCOPED_COLLECTIONS.has(collection)) {
    // Excepción controlada: recargo a otra delegación si tiene puedeRecargarOtrasDelegaciones
    if (collection === 'recargos' && user.puedeRecargarOtrasDelegaciones) {
      return { allowed: true };
    }
    // Excepción controlada: traslado de personal si el registro existía en su delegación autorizada
    if (collection === 'personal' && existingItem && canAccessDelegation(user, existingItem.delegacionId)) {
      return { allowed: true };
    }
    if (existingItem && existingItem.delegacionId && !canAccessDelegation(user, existingItem.delegacionId)) {
      return { allowed: false, reason: 'No tiene permisos sobre registros de otra delegación.' };
    }
    if (incomingItem.delegacionId && !canAccessDelegation(user, incomingItem.delegacionId)) {
      return { allowed: false, reason: 'No puede guardar registros asignados a una delegación no autorizada.' };
    }
  }

  return { allowed: true };
}

export function canDeleteCollection(
  user: any,
  collection: string,
  existingItem: any | undefined
): { allowed: boolean; reason?: string } {
  if (!user || !user.activo) {
    return { allowed: false, reason: 'Usuario inactivo o no autenticado.' };
  }

  if (collection === 'auditoria') {
    return { allowed: false, reason: 'Los registros de auditoría son inmutables y no pueden eliminarse individualmente.' };
  }

  if (isSuperusuario(user)) {
    return { allowed: true };
  }

  if (user.esSoloLectura || user.puedeEliminar === false) {
    return { allowed: false, reason: 'Su cuenta no cuenta con permisos para eliminar registros.' };
  }

  if (collection === 'usuarios') {
    if (!canManageUsers(user)) {
      return { allowed: false, reason: 'No tiene autorización para eliminar usuarios.' };
    }
    if (existingItem && String(existingItem.rol).toLowerCase() === 'superusuario') {
      return { allowed: false, reason: 'Solo un Superusuario puede eliminar cuentas de Superusuario.' };
    }
    if (existingItem && existingItem.id === user.id) {
      return { allowed: false, reason: 'No puede eliminar su propio usuario en sesión.' };
    }
  }

  if (collection === 'roles' && existingItem?.esSistema) {
    return { allowed: false, reason: 'Los roles predeterminados del sistema no pueden eliminarse.' };
  }

  if (existingItem?.delegacionId && !canAccessDelegation(user, existingItem.delegacionId)) {
    return { allowed: false, reason: 'No puede eliminar registros pertenecientes a otra delegación.' };
  }

  return { allowed: true };
}

// --- INTEGRIDAD CRIPTOGRÁFICA SHA-256 ---
export function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function applyIntegrityHashes(collection: string, item: any): any {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item };

  if (Array.isArray(copy.adjuntos)) {
    copy.adjuntos = copy.adjuntos.map((adj: any) => {
      if (adj && typeof adj === 'object' && adj.dataUrl && !adj.integrityHash) {
        return {
          ...adj,
          integrityHash: sha256Hex(String(adj.dataUrl)),
        };
      }
      return adj;
    });
  }

  if (
    collection === 'novedadesDelegaciones' ||
    collection === 'inspeccionesOculares' ||
    collection === 'expedientes' ||
    collection === 'informesTecnicos' ||
    (collection === 'partesGuardia' && copy.cerrado)
  ) {
    const payloadToHash = { ...copy };
    delete payloadToHash.integrityHash;
    copy.integrityHash = sha256Hex(JSON.stringify(payloadToHash));
  }

  return copy;
}

// --- AUDITORÍA CENTRAL INMUTABLE EN SERVIDOR ---
export function appendServerAudit(
  db: SispolDatabase,
  req: Request,
  user: any | null,
  entry: {
    modulo: string;
    accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'LOGIN' | 'RESETEO_CONTADOR' | 'CAMBIO_PASSWORD' | 'TRASLADO' | 'OTRO';
    descripcion: string;
    detalles?: string;
    delegacionId?: string;
    delegacionNombre?: string;
    usernameOverride?: string;
  }
): any {
  if (!Array.isArray(db.auditoria)) {
    db.auditoria = [];
  }

  const fechaHora = new Date().toISOString();
  const ipOrigen = getClientIp(req);
  const record: any = {
    id: `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    fechaHora,
    usuarioId: user?.id || 'anonimo',
    username: user?.username || entry.usernameOverride || 'desconocido',
    apellidoYNombre: user?.apellidoYNombre || entry.usernameOverride || 'Acceso Externo / Sistema',
    rol: user?.rol || 'Desconocido',
    delegacionId: entry.delegacionId || user?.delegacionId || 'sistema',
    delegacionNombre: entry.delegacionNombre,
    modulo: entry.modulo,
    accion: entry.accion,
    descripcion: entry.descripcion,
    detalles: entry.detalles,
    ipOrigen,
  };

  record.integrityHash = sha256Hex(
    `${record.fechaHora}|${record.usuarioId}|${record.modulo}|${record.accion}|${record.descripcion}|${ipOrigen}`
  );

  db.auditoria.unshift(record);
  if (db.auditoria.length > 25000) {
    db.auditoria = db.auditoria.slice(0, 25000);
  }
  return record;
}

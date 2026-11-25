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
  'licenciasPoliciales',
  'saldosLicencias',
  'feriados',
  'memosNotas',
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

export const TRUSTED_DEVICE_MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días (1 semana sin iniciar sesión)

/**
 * Limpia campos sensibles antes de enviar cualquier objeto de usuario al cliente
 */
export function sanitizeUserForClient<T extends Record<string, any>>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const copy: any = { ...user };
  delete copy.passwordHash;
  delete copy.offlineVerifier;
  delete copy.totpSecret;
  delete copy.totpPendingSecret;
  delete copy.totpBackupCodesHashes;
  copy.password = '';
  copy.totpEnabled = Boolean(copy.totpEnabled);

  if (Array.isArray(copy.trustedDevices)) {
    const now = Date.now();
    copy.trustedDevices = copy.trustedDevices
      .filter((d: any) => {
        if (!d || !d.lastUsedAt) return false;
        const lastMs = new Date(d.lastUsedAt).getTime();
        return Number.isFinite(lastMs) && now - lastMs <= TRUSTED_DEVICE_MAX_IDLE_MS;
      })
      .map((d: any) => ({
        id: d.id,
        label: d.label,
        userAgent: d.userAgent,
        ipOrigen: d.ipOrigen,
        createdAt: d.createdAt,
        lastUsedAt: d.lastUsedAt,
        expiresAt: new Date(new Date(d.lastUsedAt).getTime() + TRUSTED_DEVICE_MAX_IDLE_MS).toISOString(),
      }));
  } else {
    copy.trustedDevices = [];
  }

  return copy;
}

export interface TokenPayload {
  uid: string;
  username: string;
  rol: string;
  purpose?: 'session' | '2fa_pending';
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

function signTokenWithPayload(payload: TokenPayload): string {
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'SISPOL' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

function verifyRawToken(token: string): TokenPayload | null {
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

export function signSessionToken(user: any): string {
  const now = Math.floor(Date.now() / 1000);
  return signTokenWithPayload({
    uid: String(user.id),
    username: String(user.username),
    rol: String(user.rol || 'Operador'),
    purpose: 'session',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string): TokenPayload | null {
  const payload = verifyRawToken(token);
  if (!payload) return null;
  if (payload.purpose && payload.purpose !== 'session') return null;
  return payload;
}

export function signPending2faToken(user: any): string {
  const now = Math.floor(Date.now() / 1000);
  return signTokenWithPayload({
    uid: String(user.id),
    username: String(user.username),
    rol: String(user.rol || 'Operador'),
    purpose: '2fa_pending',
    iat: now,
    exp: now + 5 * 60, // 5 minutos para completar el segundo factor
  });
}

export function verifyPending2faToken(token: string): TokenPayload | null {
  const payload = verifyRawToken(token);
  if (!payload || payload.purpose !== '2fa_pending') return null;
  return payload;
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
  'licenciasPoliciales',
  'saldosLicencias',
  'memosNotas',
]);

export type PerfilAccesoFolioServer = 'comun' | 'jefe' | 'mayoria_judicial';
const ALL_PERFILES_FOLIO_SERVER: PerfilAccesoFolioServer[] = [
  'comun',
  'jefe',
  'mayoria_judicial',
];

function normalizeMemoTipoKeyServer(val?: string): string {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizePerfilesVisiblesServer(perfiles?: any): PerfilAccesoFolioServer[] {
  if (perfiles === undefined || perfiles === null || !Array.isArray(perfiles)) {
    return [...ALL_PERFILES_FOLIO_SERVER];
  }
  const valid = new Set<string>(ALL_PERFILES_FOLIO_SERVER);
  return Array.from(
    new Set(
      perfiles.filter(
        (p): p is PerfilAccesoFolioServer => typeof p === 'string' && valid.has(p)
      )
    )
  );
}

export function resolveUserFolioPerfilServer(user: any): PerfilAccesoFolioServer {
  if (
    user?.perfilFolio === 'comun' ||
    user?.perfilFolio === 'jefe' ||
    user?.perfilFolio === 'mayoria_judicial'
  ) {
    return user.perfilFolio;
  }
  const rolNorm = normalizeMemoTipoKeyServer(user?.rol);
  if (
    rolNorm.includes('jefe') ||
    rolNorm.includes('administrador') ||
    rolNorm === 'admin'
  ) {
    return 'jefe';
  }
  if (
    rolNorm.includes('mayoria') ||
    rolNorm.includes('judicial') ||
    rolNorm.includes('sumariante')
  ) {
    return 'mayoria_judicial';
  }
  return 'comun';
}

export function isJefeControlFoliosServer(user: any): boolean {
  if (!user) return false;
  if (isSuperusuario(user)) return true;
  return resolveUserFolioPerfilServer(user) === 'jefe';
}

function isSerieHiddenForUserServer(serie: any, user: any): boolean {
  if (!user || isSuperusuario(user) || !serie) return false;

  const perfiles = normalizePerfilesVisiblesServer(serie.perfilesVisibles);
  const userPerfil = resolveUserFolioPerfilServer(user);
  if (!perfiles.includes(userPerfil)) {
    return true;
  }

  const hiddenList: any[] = Array.isArray(user.tiposMemosOcultos) ? user.tiposMemosOcultos : [];
  if (hiddenList.length === 0) return false;
  const hiddenRaw = new Set(hiddenList.map((h) => String(h)));
  const hiddenNorm = new Set(hiddenList.map((h) => normalizeMemoTipoKeyServer(h)));
  const normName = normalizeMemoTipoKeyServer(serie?.nombre);
  if (normName && (hiddenNorm.has(normName) || hiddenNorm.has(`tipo:${normName}`))) {
    return true;
  }
  if (
    serie?.id &&
    (hiddenRaw.has(String(serie.id)) || hiddenRaw.has(`serie:${String(serie.id)}`))
  ) {
    return true;
  }
  return false;
}

function resolvePerfilesForMemoServer(
  memo: any,
  db?: SispolDatabase
): PerfilAccesoFolioServer[] | undefined {
  if (!db) return undefined;
  const normTipo = normalizeMemoTipoKeyServer(memo?.tipo);
  const series = Array.isArray(db.seriesNumerario) ? db.seriesNumerario : [];
  const serieMatch =
    (memo?.serieFolioId && series.find((s: any) => s.id === memo.serieFolioId)) ||
    (normTipo &&
      (series.find(
        (s: any) =>
          normalizeMemoTipoKeyServer(s.nombre) === normTipo &&
          (!memo?.delegacionId || !s.delegacionId || s.delegacionId === memo.delegacionId)
      ) ||
        series.find((s: any) => normalizeMemoTipoKeyServer(s.nombre) === normTipo)));
  if (serieMatch) {
    return normalizePerfilesVisiblesServer(serieMatch.perfilesVisibles);
  }

  const configs = Array.isArray(db.configuracion) ? db.configuracion : [];
  const orderedConfigs = memo?.delegacionId
    ? [...configs].sort((a: any, b: any) =>
        a.delegacionId === memo.delegacionId ? -1 : b.delegacionId === memo.delegacionId ? 1 : 0
      )
    : configs;

  for (const cfg of orderedConfigs) {
    if (!Array.isArray(cfg?.tiposMemoCatalogo)) continue;
    const catMatch = cfg.tiposMemoCatalogo.find(
      (t: any) => normTipo && normalizeMemoTipoKeyServer(t.nombre) === normTipo
    );
    if (catMatch) {
      return normalizePerfilesVisiblesServer(catMatch.perfilesVisibles);
    }
  }
  return undefined;
}

function isMemoHiddenForUserServer(memo: any, user: any, db?: SispolDatabase): boolean {
  if (!user || isSuperusuario(user)) return false;
  if (
    Array.isArray(user.modulosPermitidos) &&
    user.modulosPermitidos.length > 0 &&
    !user.modulosPermitidos.includes('memos-notas')
  ) {
    return true;
  }
  if (Array.isArray(memo?.ocultoParaUsuariosIds) && memo.ocultoParaUsuariosIds.includes(user.id)) {
    return true;
  }

  const perfilesVisibles = resolvePerfilesForMemoServer(memo, db);
  if (perfilesVisibles !== undefined) {
    const userPerfil = resolveUserFolioPerfilServer(user);
    if (!perfilesVisibles.includes(userPerfil)) {
      return true;
    }
  }

  const hiddenList: any[] = Array.isArray(user.tiposMemosOcultos) ? user.tiposMemosOcultos : [];
  if (hiddenList.length === 0) return false;
  const hiddenRaw = new Set(hiddenList.map((h) => String(h)));
  const hiddenNorm = new Set(hiddenList.map((h) => normalizeMemoTipoKeyServer(h)));
  const normTipo = normalizeMemoTipoKeyServer(memo?.tipo);
  if (normTipo && (hiddenNorm.has(normTipo) || hiddenNorm.has(`tipo:${normTipo}`))) {
    return true;
  }
  if (
    memo?.serieFolioId &&
    (hiddenRaw.has(String(memo.serieFolioId)) ||
      hiddenRaw.has(`serie:${String(memo.serieFolioId)}`))
  ) {
    return true;
  }
  return false;
}

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
    feriados: db.feriados || [],
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
    } else if (col === 'memosNotas') {
      result[col] = items.filter(
        (item: any) =>
          allowed.includes(item.delegacionId || 'del-laguna-blanca') &&
          !isMemoHiddenForUserServer(item, user, db)
      );
    } else {
      result[col] = items.filter((item: any) =>
        allowed.includes(item.delegacionId || 'del-laguna-blanca')
      );
    }
  }

  // Aplicar filtro de tipos/series ocultos por perfil o usuario incluso si allowed === 'ALL' cuando no es superusuario
  if (!superUsr) {
    const seriesById = new Map<string, any>(
      (db.seriesNumerario || []).map((s: any) => [s.id, s])
    );

    if (Array.isArray(result.memosNotas)) {
      result.memosNotas = result.memosNotas.filter(
        (item: any) => !isMemoHiddenForUserServer(item, user, db)
      );
    }

    if (Array.isArray(result.folios)) {
      result.folios = result.folios.filter((f: any) => {
        const ser = f?.serieId ? seriesById.get(f.serieId) : undefined;
        return !isSerieHiddenForUserServer(ser, user);
      });
    }

    if (
      Array.isArray(result.seriesNumerario) &&
      user.rol !== 'Administrador' &&
      !canManageUsers(user)
    ) {
      result.seriesNumerario = result.seriesNumerario.filter(
        (s: any) => !isSerieHiddenForUserServer(s, user)
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

export function canChangeOtherUsersPassword(
  actor: any,
  targetUser?: any
): { allowed: boolean; reason?: string } {
  if (!actor || !actor.activo) {
    return { allowed: false, reason: 'Usuario no autenticado o inactivo.' };
  }
  if (isSuperusuario(actor)) return { allowed: true };

  const hasPerm = Boolean(
    actor.puedeCambiarPasswordOtros || actor.accionesPersonalizadas?.puedeCambiarPasswordOtros
  );
  if (!hasPerm) {
    return {
      allowed: false,
      reason: 'No posee el permiso específico para cambiar contraseñas de otros usuarios.',
    };
  }
  if (targetUser && isSuperusuario(targetUser) && targetUser.id !== actor.id) {
    return {
      allowed: false,
      reason: 'Solo un Superusuario puede cambiar la contraseña de otro Superusuario.',
    };
  }
  if (targetUser && !canAccessDelegation(actor, targetUser.delegacionId)) {
    return {
      allowed: false,
      reason: 'No puede cambiar contraseñas de usuarios de delegaciones no autorizadas.',
    };
  }
  return { allowed: true };
}

export function canManageOtherUsers2fa(
  actor: any,
  targetUser?: any
): { allowed: boolean; reason?: string } {
  if (!actor || !actor.activo) {
    return { allowed: false, reason: 'Usuario no autenticado o inactivo.' };
  }
  if (isSuperusuario(actor)) return { allowed: true };

  const hasPerm = Boolean(
    actor.puedeGestionar2faOtros || actor.accionesPersonalizadas?.puedeGestionar2faOtros
  );
  if (!hasPerm) {
    return {
      allowed: false,
      reason: 'No posee el permiso específico para activar o desactivar 2FA de otros usuarios.',
    };
  }
  if (targetUser && isSuperusuario(targetUser) && targetUser.id !== actor.id) {
    return {
      allowed: false,
      reason: 'Solo un Superusuario puede gestionar el 2FA de otro Superusuario.',
    };
  }
  if (targetUser && !canAccessDelegation(actor, targetUser.delegacionId)) {
    return {
      allowed: false,
      reason: 'No puede gestionar 2FA de usuarios de delegaciones no autorizadas.',
    };
  }
  return { allowed: true };
}

export function canWriteCollection(
  user: any,
  collection: string,
  existingItem: any | undefined,
  incomingItem: any,
  db?: SispolDatabase
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

  if (collection === 'seriesNumerario' && existingItem) {
    const prevPerfiles = JSON.stringify(
      normalizePerfilesVisiblesServer(existingItem.perfilesVisibles)
    );
    const nextPerfiles = JSON.stringify(
      normalizePerfilesVisiblesServer(incomingItem.perfilesVisibles)
    );
    if (
      prevPerfiles !== nextPerfiles &&
      user.rol !== 'Administrador' &&
      !canManageUsers(user) &&
      !user.puedeAdministrarModulos
    ) {
      return {
        allowed: false,
        reason: 'No posee autorización para modificar los perfiles de visibilidad de la serie.',
      };
    }
    if (
      existingItem.orden !== incomingItem.orden &&
      !isJefeControlFoliosServer(user)
    ) {
      return {
        allowed: false,
        reason: 'Únicamente los usuarios Jefe pueden cambiar el orden de las series de folios.',
      };
    }
  }

  if (collection === 'folios' && existingItem && existingItem.numero !== incomingItem.numero) {
    if (!isJefeControlFoliosServer(user)) {
      return {
        allowed: false,
        reason: 'Únicamente los usuarios Jefe pueden cambiar el número de orden de un folio.',
      };
    }
  }

  if (collection === 'folios' && db && incomingItem?.serieId) {
    const ser = (db.seriesNumerario || []).find((s: any) => s.id === incomingItem.serieId);
    if (ser && isSerieHiddenForUserServer(ser, user)) {
      return {
        allowed: false,
        reason: 'La serie de folio seleccionada se encuentra restringida para su perfil o usuario.',
      };
    }
  }

  if (collection === 'memosNotas') {
    if (
      Array.isArray(user.modulosPermitidos) &&
      user.modulosPermitidos.length > 0 &&
      !user.modulosPermitidos.includes('memos-notas')
    ) {
      return { allowed: false, reason: 'No posee acceso habilitado al módulo Memos y Notas.' };
    }
    if (isMemoHiddenForUserServer(incomingItem, user, db)) {
      return { allowed: false, reason: 'El tipo de folio o documento seleccionado se encuentra restringido/oculto para su perfil o usuario.' };
    }
  }

  return { allowed: true };
}

export function canDeleteCollection(
  user: any,
  collection: string,
  existingItem: any | undefined,
  db?: SispolDatabase
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

  if (collection === 'folios' && db && existingItem?.serieId) {
    const ser = (db.seriesNumerario || []).find((s: any) => s.id === existingItem.serieId);
    if (ser && isSerieHiddenForUserServer(ser, user)) {
      return {
        allowed: false,
        reason: 'No está autorizado para eliminar folios de una serie restringida para su perfil o usuario.',
      };
    }
  }

  if (collection === 'memosNotas') {
    if (
      Array.isArray(user.modulosPermitidos) &&
      user.modulosPermitidos.length > 0 &&
      !user.modulosPermitidos.includes('memos-notas')
    ) {
      return { allowed: false, reason: 'No posee acceso habilitado al módulo Memos y Notas.' };
    }
    if (existingItem && isMemoHiddenForUserServer(existingItem, user, db)) {
      return { allowed: false, reason: 'No está autorizado para eliminar un documento de un tipo oculto para su perfil o usuario.' };
    }
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
    collection === 'memosNotas' ||
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

// --- AUTENTICACIÓN EN 2 PASOS (TOTP RFC 6238 - GOOGLE AUTHENTICATOR) ---
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str: string): Buffer {
  const cleaned = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function buildOtpAuthUri(username: string, secretBase32: string): string {
  const issuer = 'CRIMINI-SISTEM (Sis.Pol.)';
  const account = encodeURIComponent(username);
  return `otpauth://totp/${encodeURIComponent(issuer)}:${account}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function computeTotpAtCounter(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const msg = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  msg.writeUInt32BE(high, 0);
  msg.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

export function verifyTotpCode(secretBase32: string | undefined, code: string, windowSteps: number = 1): boolean {
  if (!secretBase32 || !code) return false;
  const cleanCode = code.replace(/\s|-/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  const candidateBuf = Buffer.from(cleanCode, 'utf8');

  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const expected = computeTotpAtCounter(secretBase32, currentCounter + delta);
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (expectedBuf.length === candidateBuf.length && crypto.timingSafeEqual(expectedBuf, candidateBuf)) {
      return true;
    }
  }
  return false;
}

export function generateBackupCodes(count: number = 8): { plainCodes: string[]; hashes: string[] } {
  const plainCodes: string[] = [];
  const hashes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let raw = '';
    const bytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) {
      raw += chars[bytes[j] % chars.length];
    }
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    plainCodes.push(formatted);
    hashes.push(sha256Hex(raw));
  }
  return { plainCodes, hashes };
}

export function verifyAndConsumeBackupCode(user: any, inputCode: string): boolean {
  if (!user || !Array.isArray(user.totpBackupCodesHashes) || user.totpBackupCodesHashes.length === 0) {
    return false;
  }
  const normalized = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length !== 8) return false;
  const candidateHash = sha256Hex(normalized);
  const idx = user.totpBackupCodesHashes.findIndex((h: string) => {
    if (typeof h !== 'string' || h.length !== candidateHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(candidateHash));
  });
  if (idx >= 0) {
    user.totpBackupCodesHashes.splice(idx, 1);
    return true;
  }
  return false;
}

// --- DISPOSITIVOS DE CONFIANZA (Válidos mientras inicie sesión al menos cada 7 días) ---
export function detectDeviceLabel(req: Request): string {
  const ua = String(req.headers['user-agent'] || '');
  let browser = 'Navegador Web';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Equipo';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} en ${os}`;
}

export function pruneAndMatchTrustedDevice(
  user: any,
  candidateTokens: string[],
  ipOrigen: string
): { matchedDevice: any | null; expiredMatched: boolean; prunedCount: number } {
  if (!user || !Array.isArray(user.trustedDevices)) {
    return { matchedDevice: null, expiredMatched: false, prunedCount: 0 };
  }

  const now = Date.now();
  const cleanTokens = candidateTokens.filter((t) => typeof t === 'string' && t.trim().length >= 16);
  const candidateHashes = cleanTokens.map((t) => sha256Hex(t.trim()));

  let expiredMatched = false;
  let matchedDevice: any | null = null;
  const keptDevices: any[] = [];

  for (const dev of user.trustedDevices) {
    if (!dev || typeof dev !== 'object' || !dev.tokenHash || !dev.lastUsedAt) continue;
    const lastMs = new Date(dev.lastUsedAt).getTime();
    const isExpired = !Number.isFinite(lastMs) || now - lastMs > TRUSTED_DEVICE_MAX_IDLE_MS;

    const matchesToken = candidateHashes.some((ch) => {
      if (ch.length !== String(dev.tokenHash).length) return false;
      return crypto.timingSafeEqual(Buffer.from(ch), Buffer.from(String(dev.tokenHash)));
    });

    if (isExpired) {
      if (matchesToken) expiredMatched = true;
      continue;
    }

    if (matchesToken && !matchedDevice) {
      dev.lastUsedAt = new Date(now).toISOString();
      dev.ipOrigen = ipOrigen;
      matchedDevice = dev;
    }
    keptDevices.push(dev);
  }

  const prunedCount = user.trustedDevices.length - keptDevices.length;
  user.trustedDevices = keptDevices;
  return { matchedDevice, expiredMatched, prunedCount };
}

export function registerTrustedDeviceOnUser(
  user: any,
  req: Request,
  customLabel?: string
): { rawToken: string; device: any } {
  if (!Array.isArray(user.trustedDevices)) {
    user.trustedDevices = [];
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const nowIso = new Date().toISOString();
  const label =
    typeof customLabel === 'string' && customLabel.trim().length > 0
      ? customLabel.trim().slice(0, 60)
      : detectDeviceLabel(req);

  const deviceRecord = {
    id: `dev-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
    label,
    tokenHash: sha256Hex(rawToken),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 140),
    ipOrigen: getClientIp(req),
    createdAt: nowIso,
    lastUsedAt: nowIso,
  };

  // Limitar a máximo 10 dispositivos de confianza activos por cuenta (mantener los más recientes)
  user.trustedDevices.unshift(deviceRecord);
  if (user.trustedDevices.length > 10) {
    user.trustedDevices = user.trustedDevices.slice(0, 10);
  }

  return {
    rawToken,
    device: {
      id: deviceRecord.id,
      label: deviceRecord.label,
      userAgent: deviceRecord.userAgent,
      ipOrigen: deviceRecord.ipOrigen,
      createdAt: deviceRecord.createdAt,
      lastUsedAt: deviceRecord.lastUsedAt,
      expiresAt: new Date(Date.now() + TRUSTED_DEVICE_MAX_IDLE_MS).toISOString(),
    },
  };
}


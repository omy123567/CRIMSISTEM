import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import dns from 'dns/promises';
import net from 'net';
import {
  getDatabase,
  saveDatabase,
  saveItem,
  deleteItem,
  wipeOperationalData,
  getDatabaseStatus,
  SispolDatabase,
} from './server/dbManager';
import {
  ALLOWED_COLLECTIONS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  hashPassword,
  verifyPassword,
  ensureHashedPasswordsOnDb,
  sanitizeUserForClient,
  signSessionToken,
  verifySessionToken,
  signPending2faToken,
  verifyPending2faToken,
  extractTokenFromRequest,
  getClientIp,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginFailures,
  checkApiRateLimit,
  isSuperusuario,
  filterDatabaseForUser,
  canWriteCollection,
  canDeleteCollection,
  applyIntegrityHashes,
  appendServerAudit,
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotpCode,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
  pruneAndMatchTrustedDevice,
  registerTrustedDeviceOnUser,
  canChangeOtherUsersPassword,
  canManageOtherUsers2fa,
} from './server/security';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuthenticatedRequest extends Request {
  authUser?: any;
}

function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    isProd ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Sesión requerida. Inicie sesión institucional.' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesión expirada o firma inválida. Vuelva a iniciar sesión.' });
    return;
  }

  const db = getDatabase();
  const user = (db.usuarios || []).find((u: any) => u.id === payload.uid && u.activo);
  if (!user) {
    res.status(401).json({ error: 'Cuenta de usuario inactiva o inexistente.' });
    return;
  }

  req.authUser = user;
  next();
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Migrar cualquier contraseña en claro heredada a hash scrypt al iniciar el servidor
  try {
    const initialDb = getDatabase();
    const migrated = ensureHashedPasswordsOnDb(initialDb, saveDatabase);
    if (migrated) {
      console.log('[Sis.Pol. Security] Contraseñas migradas automáticamente a hashes scrypt seguros.');
    }
  } catch (err) {
    console.error('[Sis.Pol. Security] Error migrando contraseñas iniciales:', err);
  }

  // --- AUTHENTICATION ENDPOINTS ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { usernameOrEmail, password, trustedDeviceTokens } = req.body || {};
      const term = typeof usernameOrEmail === 'string' ? usernameOrEmail.trim().toLowerCase() : '';
      const pass = typeof password === 'string' ? password.trim() : '';

      if (!term || !pass) {
        res.status(400).json({ error: 'Debe ingresar usuario/correo y contraseña.' });
        return;
      }

      const ip = getClientIp(req);
      const ipKey = `ip:${ip}`;
      const userKey = `usr:${term}`;

      const ipLimit = checkLoginRateLimit(ipKey);
      const usrLimit = checkLoginRateLimit(userKey);
      if (!ipLimit.allowed || !usrLimit.allowed) {
        const retryAfter = Math.max(ipLimit.retryAfterSeconds, usrLimit.retryAfterSeconds);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente por seguridad. Reintente en ${Math.ceil(retryAfter / 60)} min.`,
          retryAfterSeconds: retryAfter,
        });
        return;
      }

      const db = getDatabase();
      ensureHashedPasswordsOnDb(db, saveDatabase);

      const userIdx = (db.usuarios || []).findIndex(
        (u: any) =>
          u &&
          ((u.username && u.username.toLowerCase() === term) ||
            (u.email && u.email.toLowerCase() === term))
      );
      const user = userIdx >= 0 ? db.usuarios[userIdx] : null;

      if (!user || !user.activo || !verifyPassword(pass, user.passwordHash, user.password)) {
        const failUsr = recordFailedLogin(userKey);
        recordFailedLogin(ipKey);

        appendServerAudit(db, req, user || null, {
          modulo: 'Autenticación',
          accion: 'OTRO',
          usernameOverride: term,
          descripcion: `Intento de inicio de sesión fallido para "${term}"${failUsr.locked ? ' (Bloqueo temporal activado)' : ''}`,
          detalles: `IP: ${ip} | Intentos restantes antes de bloqueo: ${failUsr.remaining}`,
        });
        saveDatabase(db);

        res.status(401).json({
          error: failUsr.locked
            ? 'Demasiados intentos incorrectos. Acceso bloqueado temporalmente por 15 minutos.'
            : `Credenciales incorrectas o usuario inactivo. (${failUsr.remaining} intentos restantes)`,
        });
        return;
      }

      clearLoginFailures(userKey);
      clearLoginFailures(ipKey);

      // Si aún tenía legacy plaintext, actualizar a scrypt
      if (!user.passwordHash || !user.passwordHash.startsWith('scrypt$')) {
        user.passwordHash = hashPassword(pass);
      }
      user.password = '';

      // Verificar Dispositivo de Confianza y expiración por 7 días sin iniciar sesión
      const candidateTokens = Array.isArray(trustedDeviceTokens)
        ? trustedDeviceTokens.filter((t: any) => typeof t === 'string')
        : [];
      const { matchedDevice, expiredMatched, prunedCount } = pruneAndMatchTrustedDevice(
        user,
        candidateTokens,
        ip
      );

      if (user.totpEnabled && user.totpSecret && !matchedDevice) {
        if (prunedCount > 0 || expiredMatched) {
          appendServerAudit(db, req, user, {
            modulo: 'Autenticación',
            accion: 'OTRO',
            descripcion: expiredMatched
              ? `Dispositivo de confianza expirado (>7 días sin iniciar sesión) para @${user.username}. Se requiere nuevo código 2FA.`
              : `Desafío 2FA (Google Authenticator) solicitado para @${user.username}.`,
            detalles: `IP: ${ip}`,
          });
        }
        db.usuarios[userIdx] = user;
        saveDatabase(db);

        const pendingToken = signPending2faToken(user);
        res.json({
          success: false,
          requires2fa: true,
          pendingToken,
          username: user.username,
          apellidoYNombre: user.apellidoYNombre,
          expiredTrustedDevice: expiredMatched,
        });
        return;
      }

      user.ultimoAcceso = new Date().toISOString();
      db.usuarios[userIdx] = user;

      appendServerAudit(db, req, user, {
        modulo: 'Autenticación',
        accion: 'LOGIN',
        descripcion: matchedDevice
          ? `Inicio de sesión exitoso de ${user.apellidoYNombre} (@${user.username}) mediante dispositivo de confianza "${matchedDevice.label}"`
          : `Inicio de sesión exitoso de ${user.apellidoYNombre} (@${user.username})`,
        detalles: `Rol: ${user.rol} | IP: ${ip}`,
      });
      saveDatabase(db);

      const token = signSessionToken(user);
      setSessionCookie(res, token);

      res.json({
        success: true,
        token,
        user: sanitizeUserForClient(user),
        trustedDeviceUsed: matchedDevice?.label || undefined,
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/login] Error:', err);
      res.status(500).json({ error: 'Error interno durante la autenticación.' });
    }
  });

  // Paso 2 del Login: Verificación de código Google Authenticator (TOTP o código de respaldo)
  app.post('/api/auth/2fa/verify-login', (req, res) => {
    try {
      const { pendingToken, code, trustDevice, deviceLabel } = req.body || {};
      const cleanToken = typeof pendingToken === 'string' ? pendingToken.trim() : '';
      const cleanCode = typeof code === 'string' ? code.trim() : '';

      if (!cleanToken || !cleanCode) {
        res.status(400).json({ error: 'Debe ingresar el código de verificación de 6 dígitos.' });
        return;
      }

      const payload = verifyPending2faToken(cleanToken);
      if (!payload) {
        res.status(401).json({
          error: 'La verificación de segundo factor expiró. Ingrese nuevamente su usuario y contraseña.',
        });
        return;
      }

      const ip = getClientIp(req);
      const rateKey = `2fa:${payload.uid}:${ip}`;
      const limitCheck = checkLoginRateLimit(rateKey);
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        res.status(429).json({
          error: `Demasiados códigos 2FA incorrectos. Intente nuevamente en ${Math.ceil(limitCheck.retryAfterSeconds / 60)} min.`,
        });
        return;
      }

      const db = getDatabase();
      const userIdx = (db.usuarios || []).findIndex((u: any) => u.id === payload.uid && u.activo);
      if (userIdx < 0) {
        res.status(401).json({ error: 'Cuenta inactiva o inexistente.' });
        return;
      }

      const user = db.usuarios[userIdx];
      const validTotp = verifyTotpCode(user.totpSecret, cleanCode, 1);
      const validBackup = !validTotp && verifyAndConsumeBackupCode(user, cleanCode);

      if (!validTotp && !validBackup) {
        const failInfo = recordFailedLogin(rateKey);
        appendServerAudit(db, req, user, {
          modulo: 'Autenticación',
          accion: 'OTRO',
          descripcion: `Código 2FA (Google Authenticator) incorrecto para @${user.username}`,
          detalles: `IP: ${ip} | Restantes: ${failInfo.remaining}`,
        });
        saveDatabase(db);

        res.status(401).json({
          error: failInfo.locked
            ? 'Demasiados códigos incorrectos. Bloqueado temporalmente por 15 minutos.'
            : `Código de Google Authenticator inválido o expirado. (${failInfo.remaining} intentos restantes)`,
        });
        return;
      }

      clearLoginFailures(rateKey);

      let trustedDeviceToken: string | undefined;
      let trustedDevice: any | undefined;
      if (trustDevice === true) {
        const reg = registerTrustedDeviceOnUser(user, req, deviceLabel);
        trustedDeviceToken = reg.rawToken;
        trustedDevice = reg.device;
      }

      user.ultimoAcceso = new Date().toISOString();
      db.usuarios[userIdx] = user;

      appendServerAudit(db, req, user, {
        modulo: 'Autenticación',
        accion: 'LOGIN',
        descripcion: `Inicio de sesión 2FA (${validBackup ? 'Código de respaldo' : 'Google Authenticator'}) exitoso para @${user.username}${trustedDevice ? ` • Dispositivo agregado como confiable: "${trustedDevice.label}"` : ''}`,
        detalles: `Rol: ${user.rol} | IP: ${ip}`,
      });
      saveDatabase(db);

      const token = signSessionToken(user);
      setSessionCookie(res, token);

      res.json({
        success: true,
        token,
        user: sanitizeUserForClient(user),
        trustedDeviceToken,
        trustedDevice,
        usedBackupCode: validBackup,
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/verify-login] Error:', err);
      res.status(500).json({ error: 'Error verificando código de Google Authenticator.' });
    }
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    try {
      const token = extractTokenFromRequest(req);
      const payload = token ? verifySessionToken(token) : null;
      if (payload) {
        const db = getDatabase();
        const user = (db.usuarios || []).find((u: any) => u.id === payload.uid);
        if (user) {
          appendServerAudit(db, req, user, {
            modulo: 'Autenticación',
            accion: 'OTRO',
            descripcion: `Cierre de sesión de @${user.username}`,
          });
          saveDatabase(db);
        }
      }
    } catch {
      // ignore audit error on logout
    }
    clearSessionCookie(res);
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeUserForClient(req.authUser) });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      const curr = typeof currentPassword === 'string' ? currentPassword.trim() : '';
      const nextPass = typeof newPassword === 'string' ? newPassword.trim() : '';

      if (!curr || !nextPass) {
        res.status(400).json({ error: 'Debe ingresar contraseña actual y nueva contraseña.' });
        return;
      }

      if (nextPass.length < 8) {
        res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        return;
      }

      if (curr === nextPass) {
        res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual.' });
        return;
      }

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      if (!verifyPassword(curr, targetUser.passwordHash, targetUser.password)) {
        res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
        return;
      }

      targetUser.passwordHash = hashPassword(nextPass);
      targetUser.password = '';
      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, targetUser, {
        modulo: 'Autenticación',
        accion: 'CAMBIO_PASSWORD',
        descripcion: `El usuario @${targetUser.username} actualizó su contraseña institucional.`,
      });
      saveDatabase(db);

      res.json({ success: true, user: sanitizeUserForClient(targetUser) });
    } catch (err: any) {
      console.error('[API POST /api/auth/change-password] Error:', err);
      res.status(500).json({ error: 'Error al cambiar contraseña.' });
    }
  });

  // --- GESTIÓN DE GOOGLE AUTHENTICATOR (2FA) Y DISPOSITIVOS DE CONFIANZA ---
  app.post('/api/auth/2fa/setup', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const secret = generateTotpSecret();
      const otpauthUrl = buildOtpAuthUri(targetUser.username, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      targetUser.totpPendingSecret = secret;
      db.usuarios[idx] = targetUser;
      saveDatabase(db);

      res.json({
        success: true,
        secret,
        otpauthUrl,
        qrDataUrl,
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/setup] Error:', err);
      res.status(500).json({ error: 'No se pudo generar la clave QR de Google Authenticator.' });
    }
  });

  app.post('/api/auth/2fa/enable', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, code, trustCurrentDevice, deviceLabel } = req.body || {};
      const curr = typeof currentPassword === 'string' ? currentPassword.trim() : '';
      const cleanCode = typeof code === 'string' ? code.trim() : '';

      if (!curr || !cleanCode) {
        res.status(400).json({ error: 'Debe ingresar su contraseña actual y el código de 6 dígitos.' });
        return;
      }

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      if (!verifyPassword(curr, targetUser.passwordHash, targetUser.password)) {
        res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
        return;
      }

      if (!targetUser.totpPendingSecret) {
        res.status(400).json({ error: 'Primero debe generar el código QR de vinculación.' });
        return;
      }

      if (!verifyTotpCode(targetUser.totpPendingSecret, cleanCode, 1)) {
        res.status(400).json({
          error: 'El código de 6 dígitos no coincide. Verifique la hora del dispositivo e intente nuevamente.',
        });
        return;
      }

      const { plainCodes, hashes } = generateBackupCodes(8);
      targetUser.totpSecret = targetUser.totpPendingSecret;
      delete targetUser.totpPendingSecret;
      targetUser.totpEnabled = true;
      targetUser.totpActivatedAt = new Date().toISOString();
      targetUser.totpBackupCodesHashes = hashes;
      targetUser.updatedAt = new Date().toISOString();

      let trustedDeviceToken: string | undefined;
      let trustedDevice: any | undefined;
      if (trustCurrentDevice === true) {
        const reg = registerTrustedDeviceOnUser(targetUser, req, deviceLabel);
        trustedDeviceToken = reg.rawToken;
        trustedDevice = reg.device;
      }

      db.usuarios[idx] = targetUser;
      appendServerAudit(db, req, targetUser, {
        modulo: 'Autenticación',
        accion: 'MODIFICAR',
        descripcion: `Activó Google Authenticator (2FA) en su cuenta @${targetUser.username}${trustedDevice ? ` y registró dispositivo de confianza "${trustedDevice.label}"` : ''}`,
      });
      saveDatabase(db);

      res.json({
        success: true,
        backupCodes: plainCodes,
        trustedDeviceToken,
        trustedDevice,
        user: sanitizeUserForClient(targetUser),
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/enable] Error:', err);
      res.status(500).json({ error: 'Error al activar Google Authenticator.' });
    }
  });

  app.post('/api/auth/2fa/disable', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, code } = req.body || {};
      const curr = typeof currentPassword === 'string' ? currentPassword.trim() : '';
      const cleanCode = typeof code === 'string' ? code.trim() : '';

      if (!curr || !cleanCode) {
        res.status(400).json({ error: 'Debe ingresar su contraseña actual y un código válido de Google Authenticator o respaldo.' });
        return;
      }

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      if (!verifyPassword(curr, targetUser.passwordHash, targetUser.password)) {
        res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        return;
      }

      const validTotp = verifyTotpCode(targetUser.totpSecret, cleanCode, 1);
      const validBackup = !validTotp && verifyAndConsumeBackupCode(targetUser, cleanCode);
      if (!validTotp && !validBackup) {
        res.status(401).json({ error: 'El código de verificación 2FA ingresado es inválido.' });
        return;
      }

      targetUser.totpEnabled = false;
      delete targetUser.totpSecret;
      delete targetUser.totpPendingSecret;
      delete targetUser.totpBackupCodesHashes;
      delete targetUser.totpActivatedAt;
      targetUser.trustedDevices = [];
      targetUser.updatedAt = new Date().toISOString();

      db.usuarios[idx] = targetUser;
      appendServerAudit(db, req, targetUser, {
        modulo: 'Autenticación',
        accion: 'MODIFICAR',
        descripcion: `Desactivó Google Authenticator (2FA) y revocó sus dispositivos de confianza en @${targetUser.username}`,
      });
      saveDatabase(db);

      res.json({ success: true, user: sanitizeUserForClient(targetUser) });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/disable] Error:', err);
      res.status(500).json({ error: 'Error al desactivar Google Authenticator.' });
    }
  });

  app.post('/api/auth/2fa/trusted-devices/trust-current', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { code, deviceLabel } = req.body || {};
      const cleanCode = typeof code === 'string' ? code.trim() : '';

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      if (!targetUser.totpEnabled || !targetUser.totpSecret) {
        res.status(400).json({ error: 'Primero debe activar Google Authenticator en su cuenta.' });
        return;
      }

      if (!verifyTotpCode(targetUser.totpSecret, cleanCode, 1)) {
        res.status(401).json({ error: 'Código de Google Authenticator inválido para autorizar este dispositivo.' });
        return;
      }

      pruneAndMatchTrustedDevice(targetUser, [], getClientIp(req));
      const { rawToken, device } = registerTrustedDeviceOnUser(targetUser, req, deviceLabel);
      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, targetUser, {
        modulo: 'Autenticación',
        accion: 'CREAR',
        descripcion: `Registró dispositivo de confianza "${device.label}" (caducidad: 7 días sin iniciar sesión) en @${targetUser.username}`,
      });
      saveDatabase(db);

      res.json({
        success: true,
        trustedDeviceToken: rawToken,
        trustedDevice: device,
        user: sanitizeUserForClient(targetUser),
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/trusted-devices/trust-current] Error:', err);
      res.status(500).json({ error: 'No se pudo registrar el dispositivo de confianza.' });
    }
  });

  app.delete('/api/auth/2fa/trusted-devices/:deviceId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { deviceId } = req.params;
      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === req.authUser.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const currentDevices = Array.isArray(targetUser.trustedDevices) ? targetUser.trustedDevices : [];
      let removedLabel = '';

      if (deviceId === 'all') {
        removedLabel = `todos los dispositivos (${currentDevices.length})`;
        targetUser.trustedDevices = [];
      } else {
        const found = currentDevices.find((d: any) => d.id === deviceId);
        removedLabel = found?.label || deviceId;
        targetUser.trustedDevices = currentDevices.filter((d: any) => d.id !== deviceId);
      }

      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, targetUser, {
        modulo: 'Autenticación',
        accion: 'ELIMINAR',
        descripcion: `Revocó dispositivo de confianza (${removedLabel}) en @${targetUser.username}`,
      });
      saveDatabase(db);

      res.json({ success: true, user: sanitizeUserForClient(targetUser) });
    } catch (err: any) {
      console.error('[API DELETE /api/auth/2fa/trusted-devices] Error:', err);
      res.status(500).json({ error: 'No se pudo revocar el dispositivo de confianza.' });
    }
  });

  // Cambio de contraseña de otro usuario (requiere superusuario o permiso puedeCambiarPasswordOtros)
  app.post('/api/auth/admin-change-password/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!checkApiRateLimit(`adm-pw:${req.authUser.id}`, 30, 15 * 60 * 1000)) {
        res.status(429).json({ error: 'Límite temporal de cambios de contraseña alcanzado. Reintente en unos minutos.' });
        return;
      }

      const { userId } = req.params;
      const { newPassword } = req.body || {};
      const nextPass = typeof newPassword === 'string' ? newPassword.trim() : '';

      if (!nextPass || nextPass.length < 8) {
        res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        return;
      }

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === userId);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario objetivo no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const perm = canChangeOtherUsersPassword(req.authUser, targetUser);
      if (!perm.allowed) {
        res.status(403).json({ error: perm.reason || 'No autorizado para cambiar contraseñas de otros usuarios.' });
        return;
      }

      targetUser.passwordHash = hashPassword(nextPass);
      targetUser.password = '';
      delete targetUser.offlineVerifier;
      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, req.authUser, {
        modulo: 'Usuarios',
        accion: 'CAMBIO_PASSWORD',
        descripcion: `${req.authUser.rol} @${req.authUser.username} cambió la contraseña institucional de @${targetUser.username} (${targetUser.apellidoYNombre})`,
        delegacionId: targetUser.delegacionId || req.authUser.delegacionId,
      });
      saveDatabase(db);

      res.json({ success: true, user: sanitizeUserForClient(targetUser) });
    } catch (err: any) {
      console.error('[API POST /api/auth/admin-change-password] Error:', err);
      res.status(500).json({ error: 'Error al actualizar la contraseña del usuario.' });
    }
  });

  // Iniciar vinculación de Google Authenticator (2FA) para otro usuario (requiere superusuario o puedeGestionar2faOtros)
  app.post('/api/auth/2fa/admin-setup/:userId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === userId);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario objetivo no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const perm = canManageOtherUsers2fa(req.authUser, targetUser);
      if (!perm.allowed) {
        res.status(403).json({ error: perm.reason || 'No autorizado para gestionar 2FA de otros usuarios.' });
        return;
      }

      const secret = generateTotpSecret();
      const otpauthUrl = buildOtpAuthUri(targetUser.username, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      targetUser.totpPendingSecret = secret;
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, req.authUser, {
        modulo: 'Usuarios',
        accion: 'MODIFICAR',
        descripcion: `${req.authUser.rol} @${req.authUser.username} generó QR de activación 2FA para @${targetUser.username}`,
        delegacionId: targetUser.delegacionId || req.authUser.delegacionId,
      });
      saveDatabase(db);

      res.json({
        success: true,
        secret,
        otpauthUrl,
        qrDataUrl,
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/admin-setup] Error:', err);
      res.status(500).json({ error: 'No se pudo generar el QR de activación 2FA para el usuario.' });
    }
  });

  // Confirmar activación de Google Authenticator (2FA) para otro usuario
  app.post('/api/auth/2fa/admin-enable/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { code } = req.body || {};
      const cleanCode = typeof code === 'string' ? code.trim() : '';

      if (!cleanCode) {
        res.status(400).json({ error: 'Debe ingresar el código de 6 dígitos generado en el dispositivo del usuario.' });
        return;
      }

      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === userId);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario objetivo no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const perm = canManageOtherUsers2fa(req.authUser, targetUser);
      if (!perm.allowed) {
        res.status(403).json({ error: perm.reason || 'No autorizado para activar 2FA de otros usuarios.' });
        return;
      }

      if (!targetUser.totpPendingSecret) {
        res.status(400).json({ error: 'Primero debe generar el código QR de vinculación para este usuario.' });
        return;
      }

      if (!verifyTotpCode(targetUser.totpPendingSecret, cleanCode, 1)) {
        res.status(400).json({
          error: 'El código de 6 dígitos no coincide. Verifique la hora del teléfono del usuario e intente nuevamente.',
        });
        return;
      }

      const { plainCodes, hashes } = generateBackupCodes(8);
      targetUser.totpSecret = targetUser.totpPendingSecret;
      delete targetUser.totpPendingSecret;
      targetUser.totpEnabled = true;
      targetUser.totpActivatedAt = new Date().toISOString();
      targetUser.totpBackupCodesHashes = hashes;
      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, req.authUser, {
        modulo: 'Usuarios',
        accion: 'MODIFICAR',
        descripcion: `${req.authUser.rol} @${req.authUser.username} activó Google Authenticator (2FA) en la cuenta @${targetUser.username}`,
        delegacionId: targetUser.delegacionId || req.authUser.delegacionId,
      });
      saveDatabase(db);

      res.json({
        success: true,
        backupCodes: plainCodes,
        user: sanitizeUserForClient(targetUser),
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/admin-enable] Error:', err);
      res.status(500).json({ error: 'Error activando 2FA para el usuario.' });
    }
  });

  app.post('/api/auth/2fa/admin-reset/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const db = getDatabase();
      const idx = (db.usuarios || []).findIndex((u: any) => u.id === userId);
      if (idx < 0) {
        res.status(404).json({ error: 'Usuario objetivo no encontrado.' });
        return;
      }

      const targetUser = db.usuarios[idx];
      const perm = canManageOtherUsers2fa(req.authUser, targetUser);
      if (!perm.allowed) {
        res.status(403).json({
          error: perm.reason || 'No posee permisos para desactivar/restablecer el 2FA de otro usuario.',
        });
        return;
      }

      targetUser.totpEnabled = false;
      delete targetUser.totpSecret;
      delete targetUser.totpPendingSecret;
      delete targetUser.totpBackupCodesHashes;
      delete targetUser.totpActivatedAt;
      targetUser.trustedDevices = [];
      targetUser.updatedAt = new Date().toISOString();
      db.usuarios[idx] = targetUser;

      appendServerAudit(db, req, req.authUser, {
        modulo: 'Usuarios',
        accion: 'MODIFICAR',
        descripcion: `${req.authUser.rol} @${req.authUser.username} desactivó/restableció Google Authenticator (2FA) y dispositivos de confianza de @${targetUser.username}`,
        delegacionId: targetUser.delegacionId || req.authUser.delegacionId,
      });
      saveDatabase(db);

      res.json({ success: true, user: sanitizeUserForClient(targetUser) });
    } catch (err: any) {
      console.error('[API POST /api/auth/2fa/admin-reset] Error:', err);
      res.status(500).json({ error: 'Error restableciendo 2FA del usuario.' });
    }
  });

  // --- CENTRAL DATABASE PERSISTENCE API (PROTEGIDA CON RBAC + AISLAMIENTO) ---
  app.get('/api/data', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const db = getDatabase();
      ensureHashedPasswordsOnDb(db, saveDatabase);
      const filtered = filterDatabaseForUser(db, req.authUser);
      res.json(filtered);
    } catch (err: any) {
      console.error('[API GET /api/data] Error:', err);
      res.status(500).json({ error: 'Error al obtener base de datos central.' });
    }
  });

  app.get('/api/data/status', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const status = getDatabaseStatus();
      res.json({
        fileSizeBytes: status.fileSizeBytes,
        lastUpdated: status.lastUpdated,
        counts: status.counts,
      });
    } catch {
      res.status(500).json({ error: 'Error al obtener estado de la base de datos.' });
    }
  });

  app.post('/api/data/item', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { collection, item } = req.body || {};
      if (!collection || !item || typeof item !== 'object') {
        res.status(400).json({ error: 'Colección e item son requeridos.' });
        return;
      }

      if (!ALLOWED_COLLECTIONS.includes(collection)) {
        res.status(400).json({ error: 'Colección no válida.' });
        return;
      }

      const db = getDatabase();
      const list = (db[collection as keyof SispolDatabase] as any[]) || [];
      const idKey = item.id ? 'id' : item.username ? 'username' : 'id';
      const existingItem = list.find((x) => x[idKey] === item[idKey]);

      const check = canWriteCollection(req.authUser, collection, existingItem, item);
      if (!check.allowed) {
        res.status(403).json({ error: check.reason || 'Operación no autorizada.' });
        return;
      }

      let itemToSave: any = { ...item };

      if (collection === 'usuarios') {
        const rawPass = typeof itemToSave.password === 'string' ? itemToSave.password.trim() : '';
        if (rawPass.length > 0) {
          if (existingItem && existingItem.id !== req.authUser.id) {
            const passPerm = canChangeOtherUsersPassword(req.authUser, existingItem);
            if (!passPerm.allowed) {
              res.status(403).json({ error: passPerm.reason || 'No autorizado para cambiar la contraseña de otro usuario.' });
              return;
            }
          }
          if (rawPass.length < 8) {
            res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
          }
          itemToSave.passwordHash = hashPassword(rawPass);
        } else if (existingItem?.passwordHash) {
          itemToSave.passwordHash = existingItem.passwordHash;
        } else {
          res.status(400).json({ error: 'Debe definir una contraseña válida (mín. 8 caracteres) para el nuevo usuario.' });
          return;
        }
        itemToSave.password = '';
        delete itemToSave.offlineVerifier;
        if (existingItem) {
          itemToSave.totpEnabled = existingItem.totpEnabled;
          itemToSave.totpSecret = existingItem.totpSecret;
          itemToSave.totpPendingSecret = existingItem.totpPendingSecret;
          itemToSave.totpBackupCodesHashes = existingItem.totpBackupCodesHashes;
          itemToSave.totpActivatedAt = existingItem.totpActivatedAt;
          itemToSave.trustedDevices = existingItem.trustedDevices;
        }
      } else {
        itemToSave = applyIntegrityHashes(collection, itemToSave);
      }

      saveItem(collection as keyof SispolDatabase, itemToSave);

      // Auditoría automática en servidor para cambios críticos de usuarios/roles/config
      if (collection === 'usuarios' || collection === 'roles' || collection === 'delegaciones') {
        const updatedDb = getDatabase();
        appendServerAudit(updatedDb, req, req.authUser, {
          modulo: collection === 'usuarios' ? 'Usuarios' : collection === 'roles' ? 'Roles' : 'Delegaciones',
          accion: existingItem ? 'MODIFICAR' : 'CREAR',
          descripcion: `${existingItem ? 'Actualizó' : 'Creó'} registro en ${collection}: ${itemToSave.username || itemToSave.nombre || itemToSave.id}`,
          delegacionId: itemToSave.delegacionId || req.authUser.delegacionId,
        });
        saveDatabase(updatedDb);
      }

      const responseItem = collection === 'usuarios' ? sanitizeUserForClient(itemToSave) : itemToSave;
      res.json({ success: true, item: responseItem });
    } catch (err: any) {
      console.error('[API POST /api/data/item] Error:', err);
      res.status(500).json({ error: 'Error al guardar item en la base de datos.' });
    }
  });

  app.delete('/api/data/item/:collection/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { collection, id } = req.params;
      if (!ALLOWED_COLLECTIONS.includes(collection as keyof SispolDatabase)) {
        res.status(400).json({ error: 'Colección no válida.' });
        return;
      }

      const db = getDatabase();
      const list = (db[collection as keyof SispolDatabase] as any[]) || [];
      const existingItem = list.find((x) => x.id === id || x.username === id);

      const check = canDeleteCollection(req.authUser, collection, existingItem);
      if (!check.allowed) {
        res.status(403).json({ error: check.reason || 'No autorizado para eliminar este registro.' });
        return;
      }

      deleteItem(collection as keyof SispolDatabase, id);

      const updatedDb = getDatabase();
      appendServerAudit(updatedDb, req, req.authUser, {
        modulo: collection,
        accion: 'ELIMINAR',
        descripcion: `Eliminó elemento ID "${id}" de ${collection}`,
        delegacionId: existingItem?.delegacionId || req.authUser.delegacionId,
      });
      saveDatabase(updatedDb);

      res.json({ success: true });
    } catch (err: any) {
      console.error('[API DELETE /api/data/item] Error:', err);
      res.status(500).json({ error: 'Error al eliminar item de la base de datos.' });
    }
  });

  app.post('/api/data/wipe', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!isSuperusuario(req.authUser)) {
        res.status(403).json({ error: 'Solo el Superusuario puede ejecutar un vaciado operativo integral.' });
        return;
      }
      if (!checkApiRateLimit(`wipe:${req.authUser.id}`, 5, 60 * 60 * 1000)) {
        res.status(429).json({ error: 'Límite de operaciones de vaciado alcanzado.' });
        return;
      }

      const dbAfterWipe = wipeOperationalData();
      appendServerAudit(dbAfterWipe, req, req.authUser, {
        modulo: 'Configuración / Vaciado Integral',
        accion: 'ELIMINAR',
        descripcion: `Superusuario @${req.authUser.username} ejecutó puesta a cero operativa en el servidor central.`,
      });
      saveDatabase(dbAfterWipe);

      res.json({
        success: true,
        message: 'Todos los datos operativos fueron eliminados correctamente del servidor.',
      });
    } catch (err: any) {
      console.error('[API POST /api/data/wipe] Error:', err);
      res.status(500).json({ error: 'Error al vaciar datos operativos del servidor.' });
    }
  });

  app.post('/api/data/sync', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!isSuperusuario(req.authUser) && req.authUser.rol !== 'Administrador') {
        res.status(403).json({ error: 'Solo Administradores o Superusuarios pueden ejecutar sincronización masiva.' });
        return;
      }

      const { fullDatabase } = req.body || {};
      if (!fullDatabase || typeof fullDatabase !== 'object') {
        res.status(400).json({ error: 'Objeto de base de datos no proporcionado.' });
        return;
      }

      const serverDb = getDatabase();
      const superUsr = isSuperusuario(req.authUser);

      // Preservar tabla crítica de auditoría y hashes de contraseñas existentes
      const merged: SispolDatabase = { ...serverDb };
      const existingUsersMap = new Map((serverDb.usuarios || []).map((u: any) => [u.id, u]));

      for (const col of ALLOWED_COLLECTIONS) {
        if (col === 'auditoria') continue; // auditoría nunca se sobrescribe por /sync
        if ((col === 'usuarios' || col === 'roles') && !superUsr) continue;

        const incomingList = fullDatabase[col];
        if (!Array.isArray(incomingList)) continue;

        if (col === 'usuarios') {
          merged.usuarios = incomingList.map((u: any) => {
            const existing = existingUsersMap.get(u.id);
            const rawPass = typeof u.password === 'string' ? u.password.trim() : '';
            let passwordHash = existing?.passwordHash;
            if (rawPass.length >= 8) {
              passwordHash = hashPassword(rawPass);
            } else if (!passwordHash && rawPass.length > 0) {
              passwordHash = hashPassword(rawPass);
            }
            const clean = { ...u, password: '', passwordHash };
            delete clean.offlineVerifier;
            return clean;
          });
        } else {
          (merged[col] as any) = incomingList.map((item: any) => applyIntegrityHashes(col, item));
        }
      }

      saveDatabase(merged);
      res.json({ success: true, timestamp: merged.lastUpdated });
    } catch (err: any) {
      console.error('[API POST /api/data/sync] Error:', err);
      res.status(500).json({ error: 'Error al sincronizar base de datos central.' });
    }
  });

  app.post('/api/data/restore', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!isSuperusuario(req.authUser)) {
        res.status(403).json({ error: 'Solo el Superusuario está autorizado a restaurar copias de seguridad integrales.' });
        return;
      }

      const { data } = req.body || {};
      if (!data || typeof data !== 'object') {
        res.status(400).json({ error: 'Datos de restauración inválidos.' });
        return;
      }

      const currentDb = getDatabase();
      const existingUsersMap = new Map((currentDb.usuarios || []).map((u: any) => [u.id, u]));

      const restored: SispolDatabase = {
        ...currentDb,
        version: data.version || currentDb.version || 1,
      };

      for (const col of ALLOWED_COLLECTIONS) {
        if (col === 'auditoria') continue; // mantener auditoría intacta + agregar lo importado si aplica
        if (Array.isArray(data[col])) {
          if (col === 'usuarios') {
            restored.usuarios = data.usuarios.map((u: any) => {
              const prev = existingUsersMap.get(u.id);
              const rawPass = typeof u.password === 'string' ? u.password.trim() : '';
              const passwordHash =
                rawPass.length > 0
                  ? hashPassword(rawPass)
                  : u.passwordHash || prev?.passwordHash;
              const clean = { ...u, password: '', passwordHash };
              delete clean.offlineVerifier;
              return clean;
            });
          } else {
            (restored[col] as any) = data[col].map((item: any) => applyIntegrityHashes(col, item));
          }
        }
      }

      appendServerAudit(restored, req, req.authUser, {
        modulo: 'Configuración / Restauración',
        accion: 'CREAR',
        descripcion: `Superusuario @${req.authUser.username} restauró copia de seguridad integral en el servidor.`,
      });
      saveDatabase(restored);

      res.json({ success: true, message: 'Base de datos central restaurada con éxito.' });
    } catch (err: any) {
      console.error('[API POST /api/data/restore] Error:', err);
      res.status(500).json({ error: 'Error al restaurar base de datos central.' });
    }
  });

  // --- IMMUTABLE SERVER AUDIT ENDPOINTS ---
  app.get('/api/audit', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!isSuperusuario(req.authUser)) {
        res.status(403).json({ error: 'El historial de auditoría está reservado exclusivamente al Superusuario.' });
        return;
      }
      const db = getDatabase();
      const logs = Array.isArray(db.auditoria) ? db.auditoria : [];
      res.json({ auditoria: logs });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar auditoría central.' });
    }
  });

  app.post('/api/audit', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { modulo, accion, descripcion, detalles, delegacionId, delegacionNombre } = req.body || {};
      if (!modulo || !accion || !descripcion) {
        res.status(400).json({ error: 'Módulo, acción y descripción son requeridos.' });
        return;
      }

      const db = getDatabase();
      const record = appendServerAudit(db, req, req.authUser, {
        modulo: String(modulo),
        accion,
        descripcion: String(descripcion),
        detalles: detalles ? String(detalles) : undefined,
        delegacionId: delegacionId ? String(delegacionId) : req.authUser.delegacionId,
        delegacionNombre: delegacionNombre ? String(delegacionNombre) : undefined,
      });
      saveDatabase(db);
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al registrar evento de auditoría.' });
    }
  });

  app.post('/api/audit/purge', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (!isSuperusuario(req.authUser)) {
        res.status(403).json({ error: 'Solo el Superusuario puede depurar registros históricos de auditoría.' });
        return;
      }

      const dias = Math.max(30, Number(req.body?.dias || 90));
      const cutoff = Date.now() - dias * 24 * 60 * 60 * 1000;
      const db = getDatabase();
      const beforeCount = (db.auditoria || []).length;
      db.auditoria = (db.auditoria || []).filter(
        (r: any) => new Date(r.fechaHora).getTime() >= cutoff
      );
      const removed = beforeCount - db.auditoria.length;

      appendServerAudit(db, req, req.authUser, {
        modulo: 'Auditoría',
        accion: 'ELIMINAR',
        descripcion: `Depuración controlada por retención (> ${dias} días): ${removed} eventos antiguos purgados.`,
      });
      saveDatabase(db);

      res.json({ success: true, removed, remaining: db.auditoria.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al depurar registros de auditoría.' });
    }
  });

  // Initialize Gemini SDK with User-Agent header as required
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Endpoint: Generate Labor Criminalística from Síntesis del Hecho (Protegido + Rate Limited)
  app.post('/api/gemini/generate-labor', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!checkApiRateLimit(`gemini:${req.authUser.id}`, 20, 60 * 1000)) {
        res.status(429).json({ error: 'Límite de solicitudes de asistencia excedido. Aguarde un minuto.' });
        return;
      }

      const { sintesisHecho, hecho, tipoIntervencion, inspeccionLugar } = req.body;

      if (!sintesisHecho || typeof sintesisHecho !== 'string') {
        res.status(400).json({ error: 'La síntesis del hecho es requerida.' });
        return;
      }

      const prompt = `Actúa como un Perito en Criminalística y Accidentología de la Dirección de Policía Científica (DPC).
Tu labor es redactar de forma profesional, técnica, concisa y procesal el campo "LABOR CRIMINALÍSTICA" correspondiente a un acta oficial de intervención policial, a partir de la siguiente síntesis del hecho:

- TIPO DE INTERVENCIÓN: ${tipoIntervencion || 'Criminalística'}
- HECHO: ${hecho || 'INTERVENCIÓN'}
- LUGAR: ${inspeccionLugar || 'Lugar del hecho'}
- SÍNTESIS DEL HECHO: "${sintesisHecho}"

INSTRUCCIONES OBLIGATORIAS:
Debes estructurar el texto numerado, redactado en lenguaje técnico pericial policial formal argentino, asegurando SIEMPRE los siguientes puntos clave según corresponda al caso:
1. Fijación fotográfica panorámica y de detalle (especificando tomas de conjunto, aproximación y detalle métrico).
2. Relevamiento planimétrico del lugar (a escala con determinación de puntos fijos y referencias).
3. Levantamiento de rastros con cadena de custodia (levantamiento papiloscópico, hisopados, vainas, secuestros, o revenido químico según aplique).
4. Pruebas periciales técnicas específicas según el hecho (si hay armas: secuestro con cadena de custodia y prueba de dermotest; si es siniestro vial: relevamiento de huellas de frenada/derrape, zonas de deformación y visibilidad; si es robo: cotejo de signos de fuerza y efracción).

No agregues introducciones ni despedidas de chat. Devuelve ÚNICAMENTE los puntos numerados de la LABOR CRIMINALÍSTICA listos para insertar en el acta policial.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const generatedText = response.text || '';
      res.json({ laborCriminalistica: generatedText.trim() });
    } catch (error: any) {
      console.error('Error al generar labor criminalística con Gemini:', error);
      res.status(500).json({
        error: error.message || 'Error al comunicarse con la API de Gemini.',
      });
    }
  });

  // Helper SSRF-safe validation for holiday URL fetching
  const isPrivateOrReservedIp = (ipRaw: string): boolean => {
    const ip = ipRaw.replace(/^::ffff:/i, '').trim().toLowerCase();
    if (!ip) return true;
    if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
      return true;
    }
    const ipv4 = net.isIPv4(ip);
    if (ipv4) {
      const parts = ip.split('.').map(Number);
      const [a, b] = parts;
      if (a === 10 || a === 127 || a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a >= 224) return true;
    }
    return false;
  };

  const validatePublicHttpUrl = async (rawUrl: string): Promise<URL> => {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Solo se permiten URLs HTTP o HTTPS.');
    }
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      throw new Error('Host no permitido por política de seguridad.');
    }
    if (net.isIP(host)) {
      if (isPrivateOrReservedIp(host)) {
        throw new Error('Direcciones IP privadas o locales no están permitidas.');
      }
      return parsed;
    }
    const records = await dns.lookup(host, { all: true });
    if (!records || records.length === 0) {
      throw new Error('No se pudo resolver el dominio especificado.');
    }
    for (const r of records) {
      if (isPrivateOrReservedIp(r.address)) {
        throw new Error('El dominio apunta a una red interna no permitida.');
      }
    }
    return parsed;
  };

  const normalizeHolidayType = (raw?: string): 'Nacional' | 'Provincial' | 'No Laborable' | 'Turístico' | 'Otro' => {
    const val = String(raw || '').toLowerCase();
    if (val.includes('prov')) return 'Provincial';
    if (val.includes('turis') || val.includes('puente')) return 'Turístico';
    if (val.includes('no laborable') || val.includes('nolaborable') || val.includes('optativo')) return 'No Laborable';
    if (val.includes('nac') || val.includes('inamovible') || val.includes('trasladable')) return 'Nacional';
    return 'Nacional';
  };

  const normalizeImportedFeriados = (items: any[]): Array<{ fecha: string; nombre: string; tipo: 'Nacional' | 'Provincial' | 'No Laborable' | 'Turístico' | 'Otro' }> => {
    const seen = new Map<string, { fecha: string; nombre: string; tipo: 'Nacional' | 'Provincial' | 'No Laborable' | 'Turístico' | 'Otro' }>();
    for (const row of items) {
      if (!row || typeof row !== 'object') continue;
      const rawDate = String(row.fecha || row.date || '').trim();
      let fecha = '';
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        fecha = rawDate.slice(0, 10);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split('/');
        fecha = `${y}-${m}-${d}`;
      }
      const nombre = String(row.nombre || row.motivo || row.name || row.descripcion || '').trim();
      if (!fecha || !nombre) continue;
      seen.set(`${fecha}|${nombre.toLowerCase()}`, {
        fecha,
        nombre: nombre.slice(0, 180),
        tipo: normalizeHolidayType(row.tipo || row.type),
      });
    }
    return Array.from(seen.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  };

  // Endpoint: Importar Feriados y Días No Laborables desde URL (JSON oficial o HTML con Gemini)
  app.post('/api/feriados/import-url', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.authUser?.esSoloLectura) {
        res.status(403).json({ error: 'Perfil Solo Lectura sin permisos para importar feriados.' });
        return;
      }
      if (!checkApiRateLimit(`feriados-url:${req.authUser.id}`, 15, 60 * 1000)) {
        res.status(429).json({ error: 'Demasiadas consultas de importación. Aguarde un minuto.' });
        return;
      }

      const rawUrl = String(req.body?.url || '').trim();
      if (!rawUrl) {
        res.status(400).json({ error: 'Debe proporcionar una URL válida.' });
        return;
      }

      const safeUrl = await validatePublicHttpUrl(rawUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let responseText = '';
      let contentType = '';
      try {
        const remoteRes = await fetch(safeUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/html, text/plain;q=0.9',
            'User-Agent': 'SisPol-Licencias/1.0',
          },
          redirect: 'error',
          signal: controller.signal,
        });
        if (!remoteRes.ok) {
          throw new Error(`El sitio respondió con estado HTTP ${remoteRes.status}`);
        }
        contentType = String(remoteRes.headers.get('content-type') || '').toLowerCase();
        responseText = await remoteRes.text();
        if (responseText.length > 1_500_000) {
          responseText = responseText.slice(0, 1_500_000);
        }
      } finally {
        clearTimeout(timeout);
      }

      // 1. Intento determinístico JSON
      if (contentType.includes('json') || responseText.trim().startsWith('[') || responseText.trim().startsWith('{')) {
        try {
          const json = JSON.parse(responseText);
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json?.feriados)
            ? json.feriados
            : Array.isArray(json?.holidays)
            ? json.holidays
            : Array.isArray(json?.data)
            ? json.data
            : [];
          const normalized = normalizeImportedFeriados(list);
          if (normalized.length > 0) {
            res.json({ success: true, source: 'json', feriados: normalized });
            return;
          }
        } catch {
          // Continuar con extracción HTML si no es JSON válido
        }
      }

      // 2. Extracción HTML mediante Gemini si está disponible la clave de API
      if (!process.env.GEMINI_API_KEY) {
        res.status(400).json({
          error: 'El sitio devolvió contenido HTML y no hay GEMINI_API_KEY configurada en el servidor para extraer la tabla automáticamente. Pruebe con una URL JSON oficial (ej: api.argentinadatos.com).',
        });
        return;
      }

      const strippedText = responseText
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 24000);

      const aiRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extrae todos los feriados nacionales, provinciales y días no laborables que aparezcan en el siguiente texto extraído de un calendario oficial.\nURL origen: ${safeUrl.toString()}\nTEXTO:\n${strippedText}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fecha: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
                nombre: { type: Type.STRING, description: 'Nombre o motivo del feriado' },
                tipo: { type: Type.STRING, description: 'Nacional, Provincial, No Laborable o Turístico' },
              },
              required: ['fecha', 'nombre'],
            },
          },
        },
      });

      const parsedAi = JSON.parse(aiRes.text || '[]');
      const normalized = normalizeImportedFeriados(Array.isArray(parsedAi) ? parsedAi : []);
      res.json({ success: true, source: 'ai-html', feriados: normalized });
    } catch (error: any) {
      console.error('[API POST /api/feriados/import-url] Error:', error);
      res.status(400).json({
        error: error?.message || 'No se pudo obtener o procesar los feriados desde la URL indicada.',
      });
    }
  });

  // Endpoint: Importar Feriados y Días No Laborables desde Imagen (OCR Multimodal)
  app.post('/api/feriados/import-image', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.authUser?.esSoloLectura) {
        res.status(403).json({ error: 'Perfil Solo Lectura sin permisos para importar feriados.' });
        return;
      }
      if (!checkApiRateLimit(`feriados-img:${req.authUser.id}`, 10, 60 * 1000)) {
        res.status(429).json({ error: 'Límite de procesamiento de imágenes alcanzado. Aguarde un minuto.' });
        return;
      }
      if (!process.env.GEMINI_API_KEY) {
        res.status(400).json({
          error: 'No hay GEMINI_API_KEY configurada en el servidor para leer calendarios desde imágenes.',
        });
        return;
      }

      const { imageDataUrl, anioSugerido } = req.body || {};
      if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
        res.status(400).json({ error: 'Debe adjuntar una imagen válida (PNG, JPG o WEBP).' });
        return;
      }
      const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagen no soportado. Use PNG, JPG o WEBP.' });
        return;
      }
      const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
      const base64Data = match[2];
      if (base64Data.length > 10_000_000) {
        res.status(400).json({ error: 'La imagen supera el tamaño máximo permitido (7 MB).' });
        return;
      }

      const yearHint = Number(anioSugerido) || new Date().getFullYear();
      const aiRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analiza esta imagen de calendario, decreto o tabla de feriados y extrae todas las fechas de feriados nacionales, provinciales, puentes turísticos o días no laborables. Si el año no es visible explícitamente, asume el año ${yearHint}. Devuelve fechas en formato YYYY-MM-DD.`,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fecha: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD' },
                nombre: { type: Type.STRING, description: 'Motivo o nombre del feriado' },
                tipo: { type: Type.STRING, description: 'Nacional, Provincial, No Laborable o Turístico' },
              },
              required: ['fecha', 'nombre'],
            },
          },
        },
      });

      const parsedAi = JSON.parse(aiRes.text || '[]');
      const normalized = normalizeImportedFeriados(Array.isArray(parsedAi) ? parsedAi : []);
      res.json({ success: true, source: 'ai-image', feriados: normalized });
    } catch (error: any) {
      console.error('[API POST /api/feriados/import-image] Error:', error);
      res.status(500).json({
        error: error?.message || 'Error al analizar la imagen de feriados.',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Sis.Pol. Server' });
  });

  // Production vs Development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite Dev Server middleware mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sis.Pol.] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Sis.Pol.] Error al iniciar servidor:', err);
});

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
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
      const { usernameOrEmail, password } = req.body || {};
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
      user.ultimoAcceso = new Date().toISOString();
      db.usuarios[userIdx] = user;

      appendServerAudit(db, req, user, {
        modulo: 'Autenticación',
        accion: 'LOGIN',
        descripcion: `Inicio de sesión exitoso de ${user.apellidoYNombre} (@${user.username})`,
        detalles: `Rol: ${user.rol} | IP: ${ip}`,
      });
      saveDatabase(db);

      const token = signSessionToken(user);
      setSessionCookie(res, token);

      res.json({
        success: true,
        token,
        user: sanitizeUserForClient(user),
      });
    } catch (err: any) {
      console.error('[API POST /api/auth/login] Error:', err);
      res.status(500).json({ error: 'Error interno durante la autenticación.' });
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

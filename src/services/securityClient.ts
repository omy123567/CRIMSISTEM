export const AUTH_TOKEN_STORAGE_KEY = 'sispol_auth_token';

type AuthExpiredListener = () => void;
let authExpiredListeners: AuthExpiredListener[] = [];

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage quota errors
  }
}

export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function subscribeAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.push(listener);
  return () => {
    authExpiredListeners = authExpiredListeners.filter((l) => l !== listener);
  };
}

export function notifyAuthExpired(): void {
  clearAuthToken();
  for (const listener of authExpiredListeners) {
    listener();
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/change-password')) {
      notifyAuthExpired();
    }
  }

  return response;
}

// --- EVALUACIÓN DE FORTALEZA DE CONTRASEÑA ---
export interface PasswordStrengthResult {
  score: number; // 0..4
  label: string;
  colorClass: string;
  barColor: string;
  valid: boolean;
  issues: string[];
}

export function evaluarFortalezaPassword(password: string): PasswordStrengthResult {
  const pass = password || '';
  const issues: string[] = [];

  if (pass.length < 8) issues.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pass)) issues.push('Al menos una mayúscula');
  if (!/[a-z]/.test(pass)) issues.push('Al menos una minúscula');
  if (!/[0-9]/.test(pass)) issues.push('Al menos un número');

  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score++;

  if (pass.length < 8) {
    return {
      score: Math.min(score, 1),
      label: 'Muy débil (mín. 8 caracteres)',
      colorClass: 'text-red-700',
      barColor: 'bg-red-500',
      valid: false,
      issues,
    };
  }

  if (score <= 2) {
    return {
      score: 2,
      label: 'Aceptable',
      colorClass: 'text-amber-700',
      barColor: 'bg-amber-500',
      valid: true,
      issues,
    };
  }

  if (score === 3) {
    return {
      score: 3,
      label: 'Fuerte',
      colorClass: 'text-blue-700',
      barColor: 'bg-blue-600',
      valid: true,
      issues,
    };
  }

  return {
    score: 4,
    label: 'Muy Fuerte',
    colorClass: 'text-emerald-700',
    barColor: 'bg-emerald-600',
    valid: true,
    issues,
  };
}

// --- HASHING SHA-256 Y VERIFICADOR OFFLINE PWA ---
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function calcularSha256(texto: string): Promise<string> {
  const enc = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return bytesToHex(new Uint8Array(digest));
}

export async function crearOfflineVerifier(username: string, password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  const hash = await calcularSha256(`${salt}:${username.trim().toLowerCase()}:${password.trim()}`);
  return `sha256$${salt}$${hash}`;
}

export async function verificarOfflineVerifier(
  username: string,
  password: string,
  verifier?: string
): Promise<boolean> {
  if (!verifier || !verifier.startsWith('sha256$')) return false;
  const parts = verifier.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const actualHash = await calcularSha256(`${salt}:${username.trim().toLowerCase()}:${password.trim()}`);
  return actualHash === expectedHash;
}

// --- CIFRADO AES-GCM-256 DE RESPALDOS (PBKDF2-SHA256) ---
export interface EncryptedBackupEnvelope {
  sispolEncryptedBackup: true;
  version: number;
  system: string;
  createdAt: string;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
  integritySha256: string;
}

async function deriveAesKey(password: string, saltBytes: Uint8Array, iterations: number): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackupPayload(plainJson: string, password: string): Promise<string> {
  if (!password || password.trim().length < 6) {
    throw new Error('La clave de cifrado del respaldo debe tener al menos 6 caracteres.');
  }

  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password.trim(), salt, iterations);

  const encoded = new TextEncoder().encode(plainJson);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const integritySha256 = await calcularSha256(plainJson);

  const envelope: EncryptedBackupEnvelope = {
    sispolEncryptedBackup: true,
    version: 1,
    system: 'Sis.Pol. - Respaldo Cifrado AES-256-GCM',
    createdAt: new Date().toISOString(),
    kdf: 'PBKDF2-SHA256',
    iterations,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
    integritySha256,
  };

  return JSON.stringify(envelope, null, 2);
}

export function isEncryptedBackup(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    return Boolean(parsed && parsed.sispolEncryptedBackup === true && parsed.ciphertext && parsed.salt && parsed.iv);
  } catch {
    return false;
  }
}

export async function decryptBackupPayload(encryptedJsonString: string, password: string): Promise<string> {
  const parsed = JSON.parse(encryptedJsonString) as EncryptedBackupEnvelope;
  if (!parsed || !parsed.sispolEncryptedBackup) {
    return encryptedJsonString;
  }

  if (!password || !password.trim()) {
    throw new Error('Este archivo de respaldo está cifrado. Ingrese la contraseña de descifrado.');
  }

  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = await deriveAesKey(password.trim(), salt, parsed.iterations || 100000);

  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
  } catch {
    throw new Error('Contraseña de respaldo incorrecta o archivo dañado.');
  }

  const plainJson = new TextDecoder().decode(plainBuffer);
  if (parsed.integritySha256) {
    const actualSha = await calcularSha256(plainJson);
    if (actualSha !== parsed.integritySha256) {
      throw new Error('Fallo de integridad SHA-256: el respaldo fue alterado o está corrupto.');
    }
  }

  return plainJson;
}

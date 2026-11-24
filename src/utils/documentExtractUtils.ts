import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const ALLOWED_MEMO_EXTENSIONS = [
  'doc',
  'docx',
  'pdf',
  'odt',
  'rtf',
  'txt',
  'csv',
  'md',
  'xls',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
] as const;

export const ALLOWED_MEMO_ACCEPT =
  '.doc,.docx,.pdf,.odt,.rtf,.txt,.csv,.md,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,image/*';

export const MAX_MEMO_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB por archivo

export function sanitizeDocumentFilename(name: string): string {
  const cleaned = String(name || 'documento')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .trim();
  return cleaned.slice(0, 180) || 'documento';
}

export function getFileExtension(filename: string): string {
  const parts = String(filename || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export function formatFileSizeBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = dataUrl.slice(0, commaIdx);
    const body = dataUrl.slice(commaIdx + 1);
    if (meta.includes(';base64')) {
      const bin = atob(body);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  } catch {
    return null;
  }
}

export async function extractDocxParagraphsFromBytes(bytes: Uint8Array): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return [];
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const paragraphs: string[] = [];

    const pElements = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
    if (pElements.length > 0) {
      for (const p of pElements) {
        const textNodes = Array.from(p.getElementsByTagNameNS('*', 't'));
        const line = textNodes.map((n) => n.textContent || '').join('').trim();
        if (line) paragraphs.push(line);
      }
    } else {
      const allText = Array.from(xmlDoc.getElementsByTagNameNS('*', 't'))
        .map((n) => n.textContent || '')
        .join(' ')
        .trim();
      if (allText) paragraphs.push(allText);
    }

    return paragraphs;
  } catch {
    return [];
  }
}

export async function extractDocxParagraphsFromDataUrl(dataUrl: string): Promise<string[]> {
  const bytes = dataUrlToUint8Array(dataUrl);
  if (!bytes) return [];
  return extractDocxParagraphsFromBytes(bytes);
}

export function extractPlainTextFromDataUrl(dataUrl: string): string {
  const bytes = dataUrlToUint8Array(dataUrl);
  if (!bytes) return '';
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

export async function extractPdfTextFromBytes(bytes: Uint8Array, maxPages = 15): Promise<string> {
  let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
  try {
    loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
    const pdfDoc = await loadingTask.promise;
    const total = Math.min(pdfDoc.numPages, maxPages);
    const chunks: string[] = [];

    for (let i = 1; i <= total; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageStr) chunks.push(pageStr);
      if (chunks.join('\n').length >= 24000) break;
    }

    return chunks.join('\n').slice(0, 25000);
  } catch {
    return '';
  } finally {
    if (loadingTask) {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

function extractReadableStringsFromBinary(bytes: Uint8Array): string {
  // Extrae secuencias ASCII/Latin legibles útiles como ayuda en búsqueda para .doc/.rtf antiguos
  try {
    const sample = bytes.slice(0, Math.min(bytes.length, 300000));
    let current = '';
    const tokens: string[] = [];
    for (let i = 0; i < sample.length; i++) {
      const code = sample[i];
      if ((code >= 32 && code <= 126) || (code >= 192 && code <= 255)) {
        current += String.fromCharCode(code);
      } else {
        if (current.trim().length >= 5) {
          tokens.push(current.trim());
        }
        current = '';
      }
    }
    if (current.trim().length >= 5) tokens.push(current.trim());
    return tokens.join(' ').replace(/\s+/g, ' ').slice(0, 12000);
  } catch {
    return '';
  }
}

export function triggerSafeFileDownload(dataUrl: string, fileName: string): void {
  if (!dataUrl || !dataUrl.startsWith('data:')) return;
  const safeName = sanitizeDocumentFilename(fileName || 'archivo_adjunto');
  const bytes = dataUrlToUint8Array(dataUrl);
  if (bytes) {
    const metaMatch = dataUrl.match(/^data:([^;]+);/);
    const mime = metaMatch ? metaMatch[1] : 'application/octet-stream';
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const blob = new Blob([copy], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function processUploadedMemoFile(file: File): Promise<{
  ok: boolean;
  error?: string;
  nombre?: string;
  mimeType?: string;
  extension?: string;
  tamanoBytes?: number;
  dataUrl?: string;
  contenidoExtraido?: string;
}> {
  const safeName = sanitizeDocumentFilename(file.name);
  const ext = getFileExtension(safeName);

  if (!ALLOWED_MEMO_EXTENSIONS.includes(ext as any)) {
    return {
      ok: false,
      error: `Formato ".${ext || 'desconocido'}" no permitido. Formatos admitidos: .doc, .docx, .pdf, .odt, .rtf, .txt, .csv, .xls, .xlsx e imágenes.`,
    };
  }

  if (file.size > MAX_MEMO_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `El archivo "${safeName}" supera el límite permitido de 15 MB (${formatFileSizeBytes(file.size)}).`,
    };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let contenidoExtraido = '';

  if (ext === 'docx') {
    const paragraphs = await extractDocxParagraphsFromBytes(bytes);
    contenidoExtraido = paragraphs.join('\n').slice(0, 25000);
  } else if (ext === 'pdf') {
    contenidoExtraido = await extractPdfTextFromBytes(bytes);
  } else if (ext === 'txt' || ext === 'csv' || ext === 'md') {
    contenidoExtraido = new TextDecoder('utf-8', { fatal: false }).decode(bytes).slice(0, 25000);
  } else if (ext === 'rtf' || ext === 'doc') {
    contenidoExtraido = extractReadableStringsFromBinary(bytes);
  }

  return {
    ok: true,
    nombre: safeName,
    mimeType: file.type || 'application/octet-stream',
    extension: ext,
    tamanoBytes: file.size,
    dataUrl,
    contenidoExtraido,
  };
}

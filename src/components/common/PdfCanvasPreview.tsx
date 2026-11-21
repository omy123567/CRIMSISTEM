import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ZoomIn, ZoomOut, RefreshCw, AlertTriangle, FileText } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasPreviewProps {
  pdfBytes?: Uint8Array | ArrayBuffer | null;
  src?: string | null;
  className?: string;
  initialScale?: number;
  showControls?: boolean;
}

async function resolvePdfBytes(
  pdfBytes?: Uint8Array | ArrayBuffer | null,
  src?: string | null
): Promise<Uint8Array | null> {
  if (pdfBytes) {
    return pdfBytes instanceof Uint8Array
      ? new Uint8Array(pdfBytes)
      : new Uint8Array(pdfBytes.slice(0));
  }
  if (!src) return null;

  if (src.startsWith('data:')) {
    const commaIdx = src.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = src.slice(0, commaIdx);
    const body = src.slice(commaIdx + 1);
    if (meta.includes(';base64')) {
      const bin = atob(body);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  }

  const resp = await fetch(src);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Renderiza todas las páginas de un PDF a imágenes PNG de alta resolución
 * para impresión directa sin depender del plugin PDF del navegador.
 */
export async function renderPdfToPrintImages(
  bytes: Uint8Array,
  renderScale = 2.2
): Promise<Array<{ dataUrl: string; widthPt: number; heightPt: number }>> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const pages: Array<{ dataUrl: string; widthPt: number; heightPt: number }> = [];

  try {
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        pages.push({
          dataUrl: canvas.toDataURL('image/png'),
          widthPt: baseVp.width,
          heightPt: baseVp.height,
        });
      }
    }
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
  return pages;
}

export const PdfCanvasPreview: React.FC<PdfCanvasPreviewProps> = ({
  pdfBytes,
  src,
  className = '',
  initialScale = 1,
  showControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(initialScale);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<Array<{ pageNum: number; src: string; width: number; height: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    let activeTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const renderAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const bytes = await resolvePdfBytes(pdfBytes, src);
        if (cancelled) return;
        if (!bytes || bytes.byteLength === 0) {
          setPageImages([]);
          setNumPages(0);
          setLoading(false);
          return;
        }

        activeTask = pdfjsLib.getDocument({ data: bytes });
        const pdfDoc = await activeTask.promise;
        if (cancelled) {
          await activeTask.destroy().catch(() => {});
          return;
        }

        setNumPages(pdfDoc.numPages);
        const dpr = Math.min(window.devicePixelRatio || 1.5, 2.5);
        const renderScale = 1.65 * dpr;
        const rendered: Array<{ pageNum: number; src: string; width: number; height: number }> = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(pageNum);
          const displayVp = page.getViewport({ scale: 1.25 });
          const hiResVp = page.getViewport({ scale: renderScale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(hiResVp.width);
          canvas.height = Math.ceil(hiResVp.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport: hiResVp, canvas }).promise;
            rendered.push({
              pageNum,
              src: canvas.toDataURL('image/png'),
              width: Math.round(displayVp.width),
              height: Math.round(displayVp.height),
            });
          }
        }

        await activeTask.destroy().catch(() => {});
        if (!cancelled) {
          setPageImages(rendered);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'No se pudo renderizar la vista previa del documento PDF.');
          setPageImages([]);
          setLoading(false);
        }
      }
    };

    renderAll();

    return () => {
      cancelled = true;
      if (activeTask) {
        activeTask.destroy().catch(() => {});
      }
    };
  }, [pdfBytes, src]);

  return (
    <div className={`flex flex-col h-full w-full bg-slate-200 ${className}`}>
      {showControls && (
        <div className="bg-slate-800 text-slate-100 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-semibold">
              {loading
                ? 'Renderizando páginas...'
                : numPages > 0
                ? `${numPages} ${numPages === 1 ? 'página' : 'páginas'} generada${numPages === 1 ? '' : 's'}`
                : 'Sin páginas'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 font-mono text-[10px] font-bold cursor-pointer"
              title="Restablecer zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center gap-5 bg-slate-300/80"
      >
        {loading ? (
          <div className="m-auto flex flex-col items-center gap-2 text-slate-700 bg-white/90 px-6 py-5 rounded-xl border border-slate-300 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-800" />
            <span className="text-xs font-semibold">Generando vista previa de páginas PDF...</span>
          </div>
        ) : error ? (
          <div className="m-auto max-w-md bg-white border border-red-200 rounded-xl p-5 text-center shadow-sm space-y-1.5">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
            <p className="text-xs font-bold text-red-700">No se pudo mostrar la vista previa</p>
            <p className="text-[11px] text-slate-600">{error}</p>
          </div>
        ) : pageImages.length === 0 ? (
          <div className="m-auto text-xs text-slate-500 font-medium">
            No hay páginas disponibles para previsualizar.
          </div>
        ) : (
          pageImages.map((pg) => (
            <div
              key={pg.pageNum}
              className="bg-white shadow-xl border border-slate-300 rounded-xs overflow-hidden shrink-0 transition-all"
              style={{
                width: `${Math.round(pg.width * zoom)}px`,
                maxWidth: zoom <= 1 ? '100%' : 'none',
              }}
            >
              <img
                src={pg.src}
                alt={`Página ${pg.pageNum} de ${numPages}`}
                className="w-full h-auto block select-none"
                draggable={false}
              />
              <div className="bg-slate-50 border-t border-slate-200 px-3 py-1 text-[10px] text-slate-500 flex justify-between font-mono">
                <span>Vista Preliminar</span>
                <span>
                  Página {pg.pageNum} / {numPages}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

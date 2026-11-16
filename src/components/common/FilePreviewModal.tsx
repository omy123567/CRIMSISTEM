import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';

export interface PreviewAttachmentItem {
  id?: string;
  nombre: string;
  tipo?: string;
  dataUrl: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  file: PreviewAttachmentItem | null;
  files?: PreviewAttachmentItem[];
  initialIndex?: number;
  onClose: () => void;
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

function detectKind(item: PreviewAttachmentItem | null): 'image' | 'pdf' | 'other' {
  if (!item) return 'other';
  const url = (item.dataUrl || '').toLowerCase();
  const mime = (item.tipo || '').toLowerCase();
  const name = (item.nombre || '').toLowerCase();

  if (
    url.startsWith('data:image/') ||
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)
  ) {
    return 'image';
  }
  if (
    url.startsWith('data:application/pdf') ||
    mime === 'application/pdf' ||
    name.endsWith('.pdf')
  ) {
    return 'pdf';
  }
  return 'other';
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  files,
  initialIndex = 0,
  onClose,
}) => {
  const gallery: PreviewAttachmentItem[] = React.useMemo(() => {
    if (files && files.length > 0) return files;
    return file ? [file] : [];
  }, [files, file]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState<number>(1);
  const [fitMode, setFitMode] = useState<boolean>(true);
  const [rotation, setRotation] = useState<number>(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, Math.max(0, gallery.length - 1))));
      setZoom(1);
      setFitMode(true);
      setRotation(0);
      setNaturalSize(null);
    }
  }, [isOpen, initialIndex, file?.dataUrl, gallery.length]);

  const activeItem = gallery[currentIndex] || file || null;
  const kind = detectKind(activeItem);

  const resetView = useCallback(() => {
    setZoom(1);
    setFitMode(true);
    setRotation(0);
  }, []);

  const applyZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(nextZoom * 100) / 100));
    setFitMode(false);
    setZoom(clamped);
  }, []);

  const handleZoomIn = useCallback(() => {
    applyZoom((fitMode ? 1 : zoom) + ZOOM_STEP);
  }, [applyZoom, fitMode, zoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom((fitMode ? 1 : zoom) - ZOOM_STEP);
  }, [applyZoom, fitMode, zoom]);

  const handlePrev = useCallback(() => {
    if (gallery.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
    setNaturalSize(null);
    resetView();
  }, [gallery.length, resetView]);

  const handleNext = useCallback(() => {
    if (gallery.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % gallery.length);
    setNaturalSize(null);
    resetView();
  }, [gallery.length, resetView]);

  // Atajos de teclado: Esc, +, -, flechas
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, resetView, handlePrev, handleNext]);

  if (!isOpen || !activeItem) return null;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (kind === 'other') return;
    if (e.ctrlKey || kind === 'image') {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      applyZoom((fitMode ? 1 : zoom) + delta);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (kind !== 'image' || !viewportRef.current) return;
    if (fitMode && zoom <= 1) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current || !viewportRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const stopPanning = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activeItem.dataUrl;
    a.download = activeItem.nombre || 'archivo_adjunto';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cálculo de dimensiones reales para que el zoom nunca recorte bordes y permita scroll/pan completo
  const isRotated90 = rotation % 180 !== 0;
  let imageWidthPx: number | undefined;
  let imageHeightPx: number | undefined;
  if (!fitMode && naturalSize) {
    const baseFitScale = Math.min(820 / naturalSize.w, 600 / naturalSize.h, 1);
    const displayScale = baseFitScale * zoom;
    imageWidthPx = Math.round(naturalSize.w * displayScale);
    imageHeightPx = Math.round(naturalSize.h * displayScale);
  }

  return (
    <div
      className="fixed inset-0 z-70 bg-slate-950/90 backdrop-blur-xs flex flex-col animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Barra superior de herramientas */}
      <div
        className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nombre y tipo */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-full sm:max-w-[35%]">
          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 shrink-0">
            {kind === 'image' ? (
              <ImageIcon className="w-4 h-4" />
            ) : kind === 'pdf' ? (
              <FileText className="w-4 h-4 text-rose-400" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate" title={activeItem.nombre}>
              {activeItem.nombre || 'Archivo Adjunto'}
            </div>
            {gallery.length > 1 && (
              <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                Archivo {currentIndex + 1} de {gallery.length}
              </div>
            )}
          </div>
        </div>

        {/* Controles de Zoom y Rotación */}
        {kind !== 'other' && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!fitMode && zoom <= ZOOM_MIN}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"
              title="Alejar (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.05}
              value={fitMode ? 1 : zoom}
              onChange={(e) => applyZoom(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-blue-500 cursor-pointer"
              title="Control deslizante de zoom"
            />

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!fitMode && zoom >= ZOOM_MAX}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 disabled:opacity-40 cursor-pointer"
              title="Acercar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="font-mono tabular-nums font-bold text-[11px] text-blue-300 px-1.5 min-w-[46px] text-center">
              {fitMode ? 'Ajust.' : `${Math.round(zoom * 100)}%`}
            </span>

            <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-1.5">
              {[1, 1.5, 2, 3].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyZoom(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                    !fitMode && Math.abs(zoom - preset) < 0.05
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {preset * 100}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={resetView}
              className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer border-l border-slate-800 ml-0.5 ${
                fitMode ? 'text-blue-300 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Ajustar a pantalla (0)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajustar</span>
            </button>

            {kind === 'image' && (
              <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
                  title="Rotar 90° izquierda"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
                  title="Rotar 90° derecha"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navegación, Descargar y Cerrar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {gallery.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                title="Archivo anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                title="Archivo siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            title="Descargar archivo"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-700 text-slate-200 hover:text-white cursor-pointer transition-colors"
            title="Cerrar vista preliminar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de Visualización */}
      <div
        ref={viewportRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
        className={`flex-1 overflow-auto p-4 sm:p-6 select-none ${
          kind === 'image' && (!fitMode || zoom > 1)
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        <div className="min-w-full min-h-full flex items-center justify-center">
          {kind === 'image' ? (
            <div
              className="relative flex items-center justify-center transition-all duration-100"
              style={
                !fitMode && imageWidthPx && imageHeightPx
                  ? {
                      width: `${isRotated90 ? imageHeightPx : imageWidthPx}px`,
                      height: `${isRotated90 ? imageWidthPx : imageHeightPx}px`,
                    }
                  : undefined
              }
            >
              <img
                src={activeItem.dataUrl}
                alt={activeItem.nombre}
                draggable={false}
                onLoad={(e) => {
                  const imgEl = e.currentTarget;
                  setNaturalSize({ w: imgEl.naturalWidth, h: imgEl.naturalHeight });
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: !fitMode && imageWidthPx ? `${imageWidthPx}px` : undefined,
                  height: !fitMode && imageHeightPx ? `${imageHeightPx}px` : undefined,
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}
                className={
                  fitMode
                    ? 'max-h-[80vh] max-w-[92vw] object-contain rounded-lg shadow-2xl bg-slate-900/40'
                    : 'object-contain rounded-lg shadow-2xl shrink-0 max-w-none'
                }
              />
            </div>
          ) : kind === 'pdf' ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700"
              style={{
                width: fitMode ? 'min(960px, 94vw)' : `${Math.round(920 * zoom)}px`,
                height: fitMode ? '80vh' : `${Math.round(78 * Math.max(1, zoom))}vh`,
              }}
            >
              <iframe
                src={activeItem.dataUrl}
                title={activeItem.nombre}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center text-white space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-blue-400">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white break-all">{activeItem.nombre}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Este formato de documento ({activeItem.tipo || 'archivo adjunto'}) no admite vista directa en navegador. Puede descargarlo para abrirlo en su equipo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pie informativo */}
      {kind === 'image' && (
        <div
          className="bg-slate-950/90 border-t border-slate-800 px-4 py-1.5 text-center text-[11px] text-slate-400 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Use la rueda del mouse o los controles superiores para hacer zoom · Arrastre con el cursor para desplazarse sobre la imagen ampliada
        </div>
      )}
    </div>
  );
};

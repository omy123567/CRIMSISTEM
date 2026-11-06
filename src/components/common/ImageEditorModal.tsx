import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Crop,
  Check,
  RotateCcw as ResetIcon,
  ZoomIn,
  ZoomOut,
  Sliders,
  FileText,
  Sparkles,
} from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  onSave: (editedDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

type FilterMode = 'normal' | 'grayscale' | 'bw_document' | 'invert' | 'sepia';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageSrc,
  onSave,
  onClose,
  title = 'Editor de Documento / Evidencia Fotográfica',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Ajustes de imagen
  const [brightness, setBrightness] = useState<number>(0); // -100 a +100
  const [contrast, setContrast] = useState<number>(0);     // -100 a +100
  const [rotation, setRotation] = useState<number>(0);     // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('normal');

  // Herramienta de recorte (Crop)
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [cropStartPos, setCropStartPos] = useState<{ x: number; y: number } | null>(null);

  // Zoom de visualización
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Cargar imagen
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      handleReset();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setFilterMode('normal');
    setIsCropping(false);
    setCropRect(null);
    setZoomLevel(1);
  };

  // Renderizar canvas con todos los ajustes
  const renderCanvas = useCallback(
    (targetCanvas?: HTMLCanvasElement, forExport = false): HTMLCanvasElement | null => {
      const cvs = targetCanvas || canvasRef.current;
      if (!cvs || !image) return null;

      const ctx = cvs.getContext('2d');
      if (!ctx) return null;

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const baseW = isRotated90or270 ? image.naturalHeight : image.naturalWidth;
      const baseH = isRotated90or270 ? image.naturalWidth : image.naturalHeight;

      cvs.width = baseW;
      cvs.height = baseH;

      ctx.save();
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Posicionar origen en el centro para rotación y volteo
      ctx.translate(cvs.width / 2, cvs.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Dibujar imagen original
      ctx.drawImage(
        image,
        -image.naturalWidth / 2,
        -image.naturalHeight / 2,
        image.naturalWidth,
        image.naturalHeight
      );
      ctx.restore();

      // Aplicar manipulación de píxeles para brillo, contraste y filtros
      const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const data = imageData.data;

      // Factores de ajuste
      const bFactor = brightness * 1.5; // -150 a +150
      // Contraste factor: [-100..100] -> [0..3]
      const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Brillo
        if (brightness !== 0) {
          r += bFactor;
          g += bFactor;
          b += bFactor;
        }

        // 2. Contraste
        if (contrast !== 0) {
          r = cFactor * (r - 128) + 128;
          g = cFactor * (g - 128) + 128;
          b = cFactor * (b - 128) + 128;
        }

        // 3. Filtros especializados
        if (filterMode === 'grayscale') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray;
          g = gray;
          b = gray;
        } else if (filterMode === 'bw_document') {
          // Escáner documental: binarización nítida con umbral dinámico
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = gray > 140 ? 255 : 0;
          r = val;
          g = val;
          b = val;
        } else if (filterMode === 'invert') {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        } else if (filterMode === 'sepia') {
          const tr = 0.393 * r + 0.769 * g + 0.189 * b;
          const tg = 0.349 * r + 0.686 * g + 0.168 * b;
          const tb = 0.272 * r + 0.534 * g + 0.131 * b;
          r = tr;
          g = tg;
          b = tb;
        }

        // Clamping 0..255
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Si no es para exportar y estamos recortando, dibujar recuadro de recorte visual
      if (!forExport && isCropping && cropRect) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = Math.max(2, cvs.width / 400);
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fillRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.restore();
      }

      return cvs;
    },
    [image, brightness, contrast, rotation, flipH, flipV, filterMode, isCropping, cropRect]
  );

  // Redibujar cada vez que cambien los controles
  useEffect(() => {
    if (image) {
      renderCanvas();
    }
  }, [image, renderCanvas]);

  // Manejar acciones de rotación
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Manejar Recorte Interactivo
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCropStartPos({ x, y });
    setCropRect({ x, y, w: 0, h: 0 });
    setIsDraggingCrop(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !isDraggingCrop || !cropStartPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(cropStartPos.x, currentX);
    const y = Math.min(cropStartPos.y, currentY);
    const w = Math.abs(currentX - cropStartPos.x);
    const h = Math.abs(currentY - cropStartPos.y);

    setCropRect({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCrop(false);
  };

  // Aplicar Recorte Definitivo
  const handleApplyCrop = () => {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10 || !canvasRef.current) {
      alert('Por favor dibuje un área de recorte válida arrastrando con el cursor.');
      return;
    }

    const currentCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropRect.w;
    croppedCanvas.height = cropRect.h;

    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    croppedCtx.drawImage(
      currentCanvas,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      cropRect.w,
      cropRect.h
    );

    const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);
    const newImg = new Image();
    newImg.onload = () => {
      setImage(newImg);
      setCropRect(null);
      setIsCropping(false);
      setBrightness(0);
      setContrast(0);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    };
    newImg.src = croppedDataUrl;
  };

  // Guardar y exportar imagen editada final
  const handleSaveAndExport = () => {
    if (!image) return;

    const exportCanvas = document.createElement('canvas');
    renderCanvas(exportCanvas, true);

    const finalDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    onSave(finalDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800/80 rounded-lg text-blue-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-300">
                Ajuste de brillo, contraste, filtros forenses, rotación y recorte pericial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Restablecer todos los cambios"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Principal: Canvas a la izquierda y Controles a la derecha */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          {/* Área de Visualización del Canvas */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center overflow-auto relative min-h-[300px]">
            <div
              className="relative shadow-lg border border-slate-300 bg-white rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className={`max-h-[60vh] max-w-full object-contain ${
                  isCropping ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />
            </div>

            {/* Floating Zoom & Crop Status Banner */}
            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs shadow-md">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                className="hover:text-blue-300"
                title="Alejar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] font-semibold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="hover:text-blue-300"
                title="Acercar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {isCropping && (
                <span className="ml-2 pl-2 border-l border-slate-700 text-blue-300 font-bold text-[10px]">
                  Modo Recorte Activo (Arrastre para definir área)
                </span>
              )}
            </div>
          </div>

          {/* Panel Lateral de Controles */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 space-y-4 overflow-y-auto text-xs">
            {/* Control de Recorte */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Crop className="w-4 h-4 text-blue-700" />
                  Recortar Documento
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCropping(!isCropping);
                    setCropRect(null);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    isCropping
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isCropping ? 'Cancelar Recorte' : 'Activar Recorte'}
                </button>
              </div>

              {isCropping && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <p className="text-[11px] text-slate-500">
                    Haga clic y arrastre sobre la imagen para seleccionar el área que desea conservar.
                  </p>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={!cropRect || cropRect.w < 10}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Recorte</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rotación y Orientación */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Rotación y Orientación</label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-700 transition-colors"
                  title="Rotar 90° izquierda"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] font-semibold">-90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-700 transition-colors"
                  title="Rotar 90° derecha"
                >
                  <RotateCw className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] font-semibold">+90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
                    flipH ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Voltear horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span className="text-[10px]">Voltear H</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
                    flipV ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Voltear vertical"
                >
                  <FlipVertical className="w-4 h-4" />
                  <span className="text-[10px]">Voltear V</span>
                </button>
              </div>
            </div>

            {/* Brillo */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Brillo
                </span>
                <span className="font-mono text-xs">{brightness > 0 ? `+${brightness}` : brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Contraste */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Contrast className="w-4 h-4 text-blue-700" />
                  Contraste
                </span>
                <span className="font-mono text-xs">{contrast > 0 ? `+${contrast}` : contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Filtros Forenses Especializados */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Filtros Forenses & Documentales
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'normal', label: 'Color Normal' },
                  { id: 'grayscale', label: 'Escala de Grises' },
                  { id: 'bw_document', label: 'Escáner Nítido B&N' },
                  { id: 'invert', label: 'Invertir / Negativo' },
                  { id: 'sepia', label: 'Tono Cálido' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterMode(f.id as FilterMode)}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all font-medium ${
                      filterMode === f.id
                        ? 'bg-blue-900 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAndExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Guardar y Aplicar al Documento</span>
          </button>
        </div>
      </div>
    </div>
  );
};

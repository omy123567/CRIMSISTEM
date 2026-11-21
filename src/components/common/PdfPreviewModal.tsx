import React, { useEffect, useState, useMemo } from 'react';
import { X, Download, Eye, Printer, FileText, RefreshCw } from 'lucide-react';
import { PdfOrientation, PdfPaperSize } from '../../types/police';
import { PdfPreviewRequest, subscribePdfPreviewRequests } from '../../services/pdfExportBus';
import { PdfCanvasPreview, renderPdfToPrintImages } from './PdfCanvasPreview';

const PAPER_OPTIONS: Array<{ id: PdfPaperSize; label: string; dimensions: string; widthMm: number; heightMm: number }> = [
  { id: 'a4', label: 'A4', dimensions: '210 × 297 mm', widthMm: 210, heightMm: 297 },
  { id: 'oficio', label: 'Oficio', dimensions: '216 × 330 mm', widthMm: 216, heightMm: 330 },
  { id: 'legal', label: 'Legal', dimensions: '216 × 356 mm', widthMm: 216, heightMm: 356 },
  { id: 'letter', label: 'Carta', dimensions: '216 × 279 mm', widthMm: 216, heightMm: 279 },
];

export const PdfPreviewModal: React.FC = () => {
  const [request, setRequest] = useState<PdfPreviewRequest | null>(null);
  const [orientation, setOrientation] = useState<PdfOrientation>('portrait');
  const [paperSize, setPaperSize] = useState<PdfPaperSize>('a4');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    return subscribePdfPreviewRequests((req) => {
      setRequest(req);
      setOrientation(req.defaultOrientation || 'portrait');
      setPaperSize(req.defaultPaperSize || 'a4');
      setBuildError(null);
    });
  }, []);

  const generatedDoc = useMemo(() => {
    if (!request) return null;
    try {
      const doc = request.buildDoc({ orientation, paperSize });
      return doc;
    } catch (err: any) {
      setBuildError(err?.message || 'No se pudo generar la vista previa del documento PDF.');
      return null;
    }
  }, [request, orientation, paperSize]);

  useEffect(() => {
    if (!generatedDoc) {
      setPdfBytes(null);
      return;
    }
    try {
      const ab = generatedDoc.output('arraybuffer');
      setPdfBytes(new Uint8Array(ab));
      setBuildError(null);
    } catch (err: any) {
      setBuildError(err?.message || 'Error generando vista previa PDF.');
      setPdfBytes(null);
    }
  }, [generatedDoc]);

  if (!request) return null;

  const handleClose = () => {
    setRequest(null);
    setPdfBytes(null);
    setBuildError(null);
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    generatedDoc.save(request.fileName);
  };

  const handlePrint = async () => {
    if (!pdfBytes) {
      handleDownload();
      return;
    }
    setIsPrinting(true);
    try {
      const images = await renderPdfToPrintImages(pdfBytes, 2.2);
      if (images.length === 0) {
        handleDownload();
        return;
      }

      const paper = PAPER_OPTIONS.find((p) => p.id === paperSize) || PAPER_OPTIONS[0];
      const pageWidth = orientation === 'landscape' ? paper.heightMm : paper.widthMm;
      const pageHeight = orientation === 'landscape' ? paper.widthMm : paper.heightMm;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      const imgTags = images
        .map(
          (img) =>
            `<div class="page"><img src="${img.dataUrl}" alt="Página" /></div>`
        )
        .join('');

      iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${request.title.replace(/</g, '&lt;')}</title>
  <style>
    @page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; background: #fff; }
    .page { width: 100%; page-break-after: always; break-after: page; display: flex; justify-content: center; align-items: flex-start; }
    .page:last-child { page-break-after: auto; break-after: auto; }
    img { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>${imgTags}</body>
</html>`;

      document.body.appendChild(iframe);
      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        setTimeout(resolve, 600);
      });

      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
        setTimeout(() => {
          iframe.remove();
        }, 4000);
      } else {
        iframe.remove();
        handleDownload();
      }
    } catch {
      handleDownload();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-800/70 border border-blue-500/40 shrink-0">
              <FileText className="w-4 h-4 text-blue-200" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate">{request.title}</h3>
              <p className="text-[11px] text-slate-300 truncate">
                Seleccione orientación, tamaño de papel y verifique la vista previa antes de descargar o imprimir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Controles: Orientación + Tamaño de Papel + Acciones */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Selector de Orientación */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Orientación:</span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-block w-2.5 h-3.5 border-[1.5px] border-current rounded-[2px]" />
                  <span>Vertical</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-block w-3.5 h-2.5 border-[1.5px] border-current rounded-[2px]" />
                  <span>Horizontal</span>
                </button>
              </div>
            </div>

            {/* Selector de Tamaño de Papel */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Papel:</span>
              <div className="inline-flex flex-wrap rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                {PAPER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaperSize(opt.id)}
                    title={opt.dimensions}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      paperSize === opt.id
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="hidden xl:inline text-[10px] font-normal opacity-80 ml-1">
                      ({opt.dimensions})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfBytes || isPrinting}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Preparando...' : 'Imprimir'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!generatedDoc}
              className="px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* Área de Vista Previa PDF renderizada en Canvas */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden flex flex-col">
          {buildError ? (
            <div className="m-auto max-w-md bg-white border border-red-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-sm font-bold text-red-700 mb-1">Error en vista previa PDF</p>
              <p className="text-xs text-slate-600">{buildError}</p>
            </div>
          ) : pdfBytes ? (
            <>
              <div className="bg-slate-900/95 text-slate-200 px-4 py-1.5 text-[11px] flex items-center justify-between border-b border-slate-700 shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <Eye className="w-3.5 h-3.5 text-blue-300" />
                  Vista Previa: <strong className="text-white">{PAPER_OPTIONS.find((p) => p.id === paperSize)?.label}</strong> —{' '}
                  <strong className="text-white">{orientation === 'portrait' ? 'Vertical' : 'Horizontal'}</strong>
                </span>
                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[320px]">{request.fileName}</span>
              </div>
              <PdfCanvasPreview pdfBytes={pdfBytes} className="flex-1 min-h-0" />
            </>
          ) : (
            <div className="m-auto flex flex-col items-center gap-2 text-slate-600">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-800" />
              <span className="text-xs font-semibold">Generando vista previa del PDF...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

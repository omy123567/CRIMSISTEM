import jsPDF from 'jspdf';
import { PdfExportOptions, PdfOrientation, PdfPaperSize } from '../types/police';

export interface PdfPreviewRequest {
  title: string;
  fileName: string;
  defaultOrientation?: PdfOrientation;
  defaultPaperSize?: PdfPaperSize;
  /**
   * Función constructora que genera el jsPDF según la orientación y tamaño de papel elegidos por el usuario.
   */
  buildDoc: (options: PdfExportOptions) => jsPDF;
}

type Listener = (req: PdfPreviewRequest) => void;
const listeners = new Set<Listener>();

export function subscribePdfPreviewRequests(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Solicita abrir el modal universal de configuración (Orientación + Tamaño de Papel) y Vista Previa PDF.
 * Todas las exportaciones PDF de todos los módulos pasan por aquí antes de descargar/imprimir.
 */
export function requestPdfExport(req: PdfPreviewRequest): void {
  if (listeners.size === 0) {
    const doc = req.buildDoc({
      orientation: req.defaultOrientation || 'portrait',
      paperSize: req.defaultPaperSize || 'a4',
    });
    doc.save(req.fileName);
    return;
  }
  listeners.forEach((l) => l(req));
}

/**
 * Convierte PdfPaperSize al formato exacto aceptado por jsPDF ('a4' | 'legal' | 'letter' | [216, 330]).
 */
export function resolveJsPdfFormat(paperSize: PdfPaperSize): string | [number, number] {
  if (paperSize === 'oficio') {
    // Oficio argentino estándar: 216 mm x 330 mm
    return [216, 330];
  }
  return paperSize || 'a4';
}

export function resolveJsPdfOrientation(orientation: PdfOrientation): 'p' | 'l' {
  return orientation === 'landscape' ? 'l' : 'p';
}

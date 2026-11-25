import jsPDF from 'jspdf';

export interface PdfChartSeriesItem {
  label: string;
  value: number;
  color?: string;
}

export interface PdfMultiSeriesPoint {
  label: string;
  values: Array<{ name: string; value: number; color: string }>;
}

export interface PdfKpiCardItem {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: [number, number, number];
}

const DEFAULT_PALETTE = [
  '#11264d',
  '#1d4ed8',
  '#0284c7',
  '#0f766e',
  '#d97706',
  '#dc2626',
  '#6d28d9',
  '#475569',
];

function createHiDpiCanvas(widthPx: number, heightPx: number, scale = 2.5) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(widthPx * scale);
  canvas.height = Math.round(heightPx * scale);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
  }
  return { canvas, ctx, width: widthPx, height: heightPx };
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const safe = String(text ?? '');
  if (ctx.measureText(safe).width <= maxWidth) return safe;
  let truncated = safe;
  while (truncated.length > 2 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawEmptyChartState(ctx: CanvasRenderingContext2D, w: number, h: number, msg: string) {
  ctx.fillStyle = '#f8fafc';
  drawRoundedRectPath(ctx, 12, 12, w - 24, h - 24, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, w / 2, h / 2);
}

/**
 * Renderiza un gráfico de barras verticales en alta resolución (PNG DataURL) para embeber en jsPDF.
 */
export function renderBarChartPng(
  data: PdfChartSeriesItem[],
  options?: { width?: number; height?: number; barColor?: string; emptyMessage?: string }
): string {
  const width = options?.width ?? 560;
  const height = options?.height ?? 260;
  const { canvas, ctx } = createHiDpiCanvas(width, height);
  if (!ctx) return '';

  const items = data.filter((d) => d.value >= 0).slice(0, 12);
  if (items.length === 0 || items.every((d) => d.value === 0)) {
    drawEmptyChartState(ctx, width, height, options?.emptyMessage || 'Sin datos registrados en el período');
    return canvas.toDataURL('image/png');
  }

  const padLeft = 44;
  const padRight = 18;
  const padTop = 26;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...items.map((d) => d.value), 1);
  const steps = 4;
  const niceMax = Math.ceil(maxVal / steps) * steps || steps;

  // Grid horizontal + ejes Y
  ctx.font = '500 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= steps; i++) {
    const val = Math.round((niceMax / steps) * i);
    const y = padTop + plotH - (plotH * i) / steps;

    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillText(String(val), padLeft - 8, y);
  }

  const slotW = plotW / items.length;
  const barW = Math.min(38, Math.max(12, slotW * 0.56));

  items.forEach((item, idx) => {
    const xCenter = padLeft + slotW * idx + slotW / 2;
    const xBar = xCenter - barW / 2;
    const hBar = Math.max(item.value > 0 ? 3 : 0, (item.value / niceMax) * plotH);
    const yBar = padTop + plotH - hBar;
    const color = item.color || options?.barColor || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];

    if (hBar > 0) {
      ctx.fillStyle = color;
      drawRoundedRectPath(ctx, xBar, yBar, barW, hBar, 4);
      ctx.fill();
    }

    // Valor encima de la barra
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(item.value), xCenter, yBar - 4);

    // Etiqueta eje X
    ctx.fillStyle = '#475569';
    ctx.font = '600 9.5px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const maxLblW = Math.max(slotW - 6, 44);
    const lbl = truncateText(ctx, item.label, maxLblW);
    if (items.length > 6) {
      ctx.save();
      ctx.translate(xCenter, padTop + plotH + 6);
      ctx.rotate(-Math.PI / 10);
      ctx.textAlign = 'right';
      ctx.fillText(truncateText(ctx, item.label, 68), 4, 0);
      ctx.restore();
    } else {
      ctx.fillText(lbl, xCenter, padTop + plotH + 8);
    }
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renderiza un gráfico de barras horizontales ideal para categorías o rankings.
 */
export function renderHorizontalBarChartPng(
  data: PdfChartSeriesItem[],
  options?: { width?: number; height?: number; barColor?: string; emptyMessage?: string }
): string {
  const width = options?.width ?? 560;
  const height = options?.height ?? 260;
  const { canvas, ctx } = createHiDpiCanvas(width, height);
  if (!ctx) return '';

  const items = [...data].sort((a, b) => b.value - a.value).slice(0, 8);
  if (items.length === 0 || items.every((d) => d.value === 0)) {
    drawEmptyChartState(ctx, width, height, options?.emptyMessage || 'Sin datos registrados');
    return canvas.toDataURL('image/png');
  }

  const padLeft = 158;
  const padRight = 46;
  const padTop = 14;
  const padBottom = 18;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(...items.map((d) => d.value), 1);

  const rowH = plotH / items.length;
  const barH = Math.min(20, Math.max(10, rowH * 0.56));

  items.forEach((item, idx) => {
    const yCenter = padTop + rowH * idx + rowH / 2;
    const yBar = yCenter - barH / 2;
    const wBar = Math.max(item.value > 0 ? 4 : 0, (item.value / maxVal) * plotW);
    const color = item.color || options?.barColor || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];

    // Etiqueta izquierda
    ctx.fillStyle = '#334155';
    ctx.font = '600 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateText(ctx, item.label, padLeft - 14), padLeft - 10, yCenter);

    // Track fondo
    ctx.fillStyle = '#f1f5f9';
    drawRoundedRectPath(ctx, padLeft, yBar, plotW, barH, 4);
    ctx.fill();

    // Barra de valor
    if (wBar > 0) {
      ctx.fillStyle = color;
      drawRoundedRectPath(ctx, padLeft, yBar, wBar, barH, 4);
      ctx.fill();
    }

    // Valor derecha
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(item.value), padLeft + wBar + 8, yCenter);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renderiza un gráfico Donut con leyenda lateral derecha limpia en PNG DataURL.
 */
export function renderDonutChartPng(
  data: PdfChartSeriesItem[],
  options?: { width?: number; height?: number; centerLabel?: string; emptyMessage?: string }
): string {
  const width = options?.width ?? 560;
  const height = options?.height ?? 260;
  const { canvas, ctx } = createHiDpiCanvas(width, height);
  if (!ctx) return '';

  const items = data.filter((d) => d.value > 0).slice(0, 7);
  const total = items.reduce((acc, d) => acc + d.value, 0);

  if (items.length === 0 || total === 0) {
    drawEmptyChartState(ctx, width, height, options?.emptyMessage || 'Sin distribución para graficar');
    return canvas.toDataURL('image/png');
  }

  const cx = Math.round(width * 0.27);
  const cy = Math.round(height * 0.5);
  const outerR = Math.min(cx - 20, cy - 18, 88);
  const innerR = Math.round(outerR * 0.58);

  let startAngle = -Math.PI / 2;
  items.forEach((item, idx) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const color = item.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Separación blanca limpia entre segmentos
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Centro del donut
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 9.5px Inter, system-ui, sans-serif';
  ctx.fillText((options?.centerLabel || 'TOTAL').toUpperCase(), cx, cy + 12);

  // Leyenda lateral derecha
  const legendX = Math.round(width * 0.52);
  const legendW = width - legendX - 16;
  const rowH = Math.min(30, (height - 32) / items.length);
  const startY = Math.max(18, (height - rowH * items.length) / 2);

  items.forEach((item, idx) => {
    const y = startY + idx * rowH + rowH / 2;
    const color = item.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
    const pct = Math.round((item.value / total) * 100);

    // Punto de color
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(legendX + 6, y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Nombre categoría
    ctx.fillStyle = '#334155';
    ctx.font = '600 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateText(ctx, item.label, legendW - 76), legendX + 18, y);

    // Valor + porcentaje alineados a la derecha
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.value} (${pct}%)`, legendX + legendW, y);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renderiza un gráfico comparativo multi-serie (ej. tendencia mensual) en PNG DataURL.
 */
export function renderGroupedBarChartPng(
  points: PdfMultiSeriesPoint[],
  seriesMeta: Array<{ name: string; color: string }>,
  options?: { width?: number; height?: number; emptyMessage?: string }
): string {
  const width = options?.width ?? 560;
  const height = options?.height ?? 260;
  const { canvas, ctx } = createHiDpiCanvas(width, height);
  if (!ctx) return '';

  const hasData = points.some((p) => p.values.some((v) => v.value > 0));
  if (points.length === 0 || !hasData) {
    drawEmptyChartState(ctx, width, height, options?.emptyMessage || 'Sin actividad registrada en el período');
    return canvas.toDataURL('image/png');
  }

  // Leyenda superior
  let lx = 44;
  seriesMeta.forEach((s) => {
    ctx.fillStyle = s.color;
    drawRoundedRectPath(ctx, lx, 10, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, lx + 14, 15);
    lx += ctx.measureText(s.name).width + 32;
  });

  const padLeft = 44;
  const padRight = 16;
  const padTop = 34;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(...points.flatMap((p) => p.values.map((v) => v.value)), 1);
  const steps = 4;
  const niceMax = Math.ceil(maxVal / steps) * steps || steps;

  ctx.font = '500 9.5px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((niceMax / steps) * i);
    const y = padTop + plotH - (plotH * i) / steps;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.fillText(String(val), padLeft - 8, y);
  }

  const slotW = plotW / points.length;
  const innerGroupW = slotW * 0.72;
  const nSeries = Math.max(seriesMeta.length, 1);
  const barW = Math.max(4, Math.min(16, (innerGroupW - (nSeries - 1) * 2) / nSeries));

  points.forEach((pt, idx) => {
    const xSlotCenter = padLeft + slotW * idx + slotW / 2;
    const totalGroupW = nSeries * barW + (nSeries - 1) * 2;
    const xStart = xSlotCenter - totalGroupW / 2;

    pt.values.forEach((v, sIdx) => {
      const hBar = v.value > 0 ? Math.max(2, (v.value / niceMax) * plotH) : 0;
      const xBar = xStart + sIdx * (barW + 2);
      const yBar = padTop + plotH - hBar;
      if (hBar > 0) {
        ctx.fillStyle = v.color;
        drawRoundedRectPath(ctx, xBar, yBar, barW, hBar, 2.5);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#475569';
    ctx.font = '600 9.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(truncateText(ctx, pt.label, slotW - 2), xSlotCenter, padTop + plotH + 7);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Dibuja una fila moderna de tarjetas KPI ejecutivas directamente en jsPDF.
 * Devuelve el nuevo Y tras la fila.
 */
export function drawExecutiveKpiStrip(
  doc: jsPDF,
  startY: number,
  cards: PdfKpiCardItem[],
  marginX = 14
): number {
  if (!cards || cards.length === 0) return startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cardH = 19;

  let y = startY;
  if (y + cardH + 6 > pageHeight - 16) {
    doc.addPage();
    y = 18;
  }

  const gap = 3.5;
  const availW = pageWidth - marginX * 2;
  const cardW = (availW - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, idx) => {
    const x = marginX + idx * (cardW + gap);
    const accent = card.accentColor || [17, 38, 77];

    // Tarjeta fondo limpio
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

    // Acento superior fino (2px)
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(x + 0.5, y, cardW - 1, 1.3, 'F');

    // Label superior
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const rawLabel = (card.label || '').toUpperCase();
    const lbl = doc.splitTextToSize(rawLabel, cardW - 5)[0] || rawLabel;
    doc.text(lbl, x + 3, y + 5.3);

    // Valor numérico grande
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(String(card.value), x + 3, y + 12.2);

    // Subtítulo opcional
    if (card.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.3);
      doc.setTextColor(100, 116, 139);
      const sub = doc.splitTextToSize(card.subtitle, cardW - 5)[0] || '';
      doc.text(sub, x + 3, y + 16.5);
    }
  });

  return y + cardH + 5;
}

/**
 * Dibuja 1 o 2 gráficos enmarcados lado a lado en el PDF, manejando saltos de página.
 */
export function drawChartSectionGrid(
  doc: jsPDF,
  startY: number,
  charts: Array<{ title: string; subtitle?: string; imageDataUrl: string }>,
  marginX = 14
): number {
  if (!charts || charts.length === 0) return startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const availW = pageWidth - marginX * 2;
  const cols = charts.length === 1 ? 1 : 2;
  const gap = 4;
  const boxW = cols === 1 ? availW : (availW - gap) / 2;
  const boxH = cols === 1 ? 54 : 52;

  let y = startY;
  if (y + boxH + 6 > pageHeight - 16) {
    doc.addPage();
    y = 18;
  }

  charts.slice(0, 2).forEach((ch, idx) => {
    const x = marginX + idx * (boxW + gap);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');

    // Título del gráfico
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(17, 38, 77);
    doc.text(ch.title, x + 3.5, y + 5.2);

    if (ch.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(ch.subtitle, x + 3.5, y + 8.8);
    }

    const imgTop = ch.subtitle ? y + 10.2 : y + 7.2;
    const imgH = boxH - (imgTop - y) - 2;
    const imgW = boxW - 5;

    if (ch.imageDataUrl) {
      try {
        doc.addImage(ch.imageDataUrl, 'PNG', x + 2.5, imgTop, imgW, imgH);
      } catch {
        // Fallback silencioso si canvas falla
      }
    }
  });

  return y + boxH + 5;
}

/**
 * Dibuja una banda de metadatos/filtros limpios antes de las tablas.
 */
export function drawReportFilterBanner(
  doc: jsPDF,
  startY: number,
  summaryText: string,
  marginX = 14
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - marginX * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(summaryText, maxW - 6);
  const h = Math.max(7.5, lines.length * 3.8 + 3.5);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginX, startY, maxW, h, 1.5, 1.5, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.text(lines, marginX + 3, startY + 4.8);

  return startY + h + 4;
}

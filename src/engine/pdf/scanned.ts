import { PDFDocument } from 'pdf-lib';
import { openPdf, renderPage } from './pdfjs';

export interface ScannedSettings {
  dpi: number;
  quality: number;
}

function isGrayscale(img: ImageData): boolean {
  const d = img.data;
  const step = Math.max(4, Math.floor(d.length / 4 / 50_000) * 4);
  for (let i = 0; i < d.length; i += step) {
    const r = d[i]!,
      g = d[i + 1]!,
      b = d[i + 2]!;
    if (Math.abs(r - g) > 12 || Math.abs(g - b) > 12 || Math.abs(r - b) > 12) return false;
  }
  return true;
}

/**
 * Rasterises every page to a JPEG and rebuilds the PDF. Much smaller for scans and photo-heavy
 * documents, but text is no longer selectable.
 */
export async function scannedCompress(
  bytes: Uint8Array,
  settings: ScannedSettings,
  onProgress: (f: number) => void,
): Promise<Uint8Array> {
  const { default: encodeJpeg } = await import('@jsquash/jpeg/encode.js');
  // pdf.js takes ownership of (detaches) the buffer it's given.
  const { doc: src, close } = await openPdf(bytes.slice());
  const out = await PDFDocument.create();
  try {
    for (let n = 1; n <= src.numPages; n++) {
      onProgress(0.05 + 0.9 * ((n - 1) / src.numPages));
      const page = await src.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const canvas = await renderPage(src, n, settings.dpi);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      const jpeg = await encodeJpeg(img, {
        quality: settings.quality,
        progressive: true,
        optimize_coding: true,
        color_space: isGrayscale(img) ? 1 : 3,
      });
      const embedded = await out.embedJpg(new Uint8Array(jpeg));
      const p = out.addPage([width, height]);
      p.drawImage(embedded, { x: 0, y: 0, width, height });
    }
  } finally {
    await close();
  }
  return out.save({ useObjectStreams: true });
}

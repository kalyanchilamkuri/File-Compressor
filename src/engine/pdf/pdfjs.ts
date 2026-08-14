import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Static pdf.js assets (fonts, CMaps, image-decoder WASM) copied to /vendor by scripts/copy-vendor.mjs. */
const VENDOR = '/vendor/pdfjs/';

const inWorker = typeof document === 'undefined';

/** Canvas factory backed by OffscreenCanvas, so pdf.js can render inside a Web Worker. */
class OffscreenCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc: { canvas: OffscreenCanvas }, width: number, height: number) {
    cc.canvas.width = Math.max(1, width);
    cc.canvas.height = Math.max(1, height);
  }
  destroy(cc: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (cc.canvas) {
      cc.canvas.width = 0;
      cc.canvas.height = 0;
    }
    cc.canvas = null;
    cc.context = null;
  }
}

/** SVG filters need the DOM; without them pdf.js skips transfer functions, which is harmless here. */
class NoFilterFactory {
  addFilter() {
    return 'none';
  }
  addHCMFilter() {
    return 'none';
  }
  addAlphaFilter() {
    return 'none';
  }
  addLuminosityFilter() {
    return 'none';
  }
  addHighlightHCMFilter() {
    return 'none';
  }
  destroy() {}
}

let lib: Promise<typeof import('pdfjs-dist')> | null = null;

function loadLib() {
  lib ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    if (inWorker) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: 'module' });
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    return pdfjs;
  })();
  return lib;
}

export class PdfLockedError extends Error {}

export interface OpenedPdf {
  doc: PDFDocumentProxy;
  close: () => Promise<void>;
}

export async function openPdf(data: Uint8Array): Promise<OpenedPdf> {
  const pdfjs = await loadLib();
  const task = pdfjs.getDocument({
    data,
    disableFontFace: inWorker,
    useSystemFonts: false,
    standardFontDataUrl: `${VENDOR}standard_fonts/`,
    cMapUrl: `${VENDOR}cmaps/`,
    cMapPacked: true,
    wasmUrl: `${VENDOR}wasm/`,
    // Must be explicit: pdf.js derives this default by reading document.baseURI, which throws a
    // ReferenceError inside a Web Worker. True matches what it computes on the main thread.
    useWorkerFetch: true,
    enableXfa: false,
    isOffscreenCanvasSupported: true,
    ...(inWorker ? { CanvasFactory: OffscreenCanvasFactory, FilterFactory: NoFilterFactory } : {}),
  });
  try {
    return { doc: await task.promise, close: () => task.destroy() };
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') throw new PdfLockedError();
    throw err;
  }
}

/** Renders one page (1-based) to a canvas at the given DPI, on a white background. */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  dpi: number,
  maxPixels = 16_000_000,
): Promise<OffscreenCanvas | HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  let scale = dpi / 72;
  const base = page.getViewport({ scale: 1 });
  const pixels = base.width * base.height * scale * scale;
  if (pixels > maxPixels) scale *= Math.sqrt(maxPixels / pixels);
  const viewport = page.getViewport({ scale });
  const width = Math.max(1, Math.floor(viewport.width));
  const height = Math.max(1, Math.floor(viewport.height));
  const canvas = inWorker ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  await page.render({
    canvas: inWorker ? null : (canvas as HTMLCanvasElement),
    canvasContext: ctx,
    viewport,
    background: 'white',
  }).promise;
  page.cleanup();
  return canvas;
}

import { encodeImage } from '../image/encode';
import type { PdfPageImage, PdfToImagesOptions, PdfToImagesResult, ProgressFn } from '../types';
import { UserFacingError } from '../types';
import { isEncrypted } from './encrypted';
import { PdfLockedError, openPdf, renderPage } from './pdfjs';

const EXT = { jpeg: 'jpg', png: 'png' } as const;
const MIME = { jpeg: 'image/jpeg', png: 'image/png' } as const;

/** "report.pdf" + page 3 of 12 → "report-page-03.jpg" */
function pageName(pdfName: string, page: number, total: number, ext: string): string {
  const dot = pdfName.lastIndexOf('.');
  const base = dot > 0 ? pdfName.slice(0, dot) : pdfName;
  const width = String(total).length;
  return `${base}-page-${String(page).padStart(width, '0')}.${ext}`;
}

/** Renders every page of a PDF to its own image. Pages come back in document order. */
export async function pdfToImages(
  file: File,
  opts: PdfToImagesOptions,
  onProgress: ProgressFn,
): Promise<PdfToImagesResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isEncrypted(bytes)) {
    throw new UserFacingError(
      'This PDF is locked with a password, so its pages can’t be exported.',
    );
  }
  let opened;
  try {
    // pdf.js takes ownership of (detaches) the buffer it's given.
    opened = await openPdf(bytes.slice());
  } catch (err) {
    if (err instanceof PdfLockedError) {
      throw new UserFacingError(
        'This PDF is locked with a password, so its pages can’t be exported.',
      );
    }
    throw new UserFacingError('This PDF could not be read. It may be damaged.');
  }

  const { doc, close } = opened;
  const pages: PdfPageImage[] = [];
  const warnings: string[] = [];
  let outputBytes = 0;
  try {
    const total = doc.numPages;
    for (let n = 1; n <= total; n++) {
      onProgress(0.02 + 0.96 * ((n - 1) / total));
      const canvas = await renderPage(doc, n, opts.dpi);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      const encoded = await encodeImage(img, opts.format, opts.quality);
      const blob = new Blob([encoded as BlobPart], { type: MIME[opts.format] });
      outputBytes += blob.size;
      pages.push({ fileName: pageName(file.name, n, total, EXT[opts.format]), blob });
    }
  } finally {
    await close();
  }
  onProgress(1);
  if (opts.format === 'png' && outputBytes > bytes.byteLength * 3) {
    warnings.push(
      'PNG pages are lossless, so they came out much larger than the PDF. JPG is smaller.',
    );
  }
  return { pages, inputBytes: bytes.byteLength, outputBytes, warnings };
}

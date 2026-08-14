import { openPdf, renderPage } from './pdfjs';

export interface PdfPreview {
  /** First page as a PNG blob. */
  png: Blob;
  pageCount: number;
}

/**
 * Renders the first page of a PDF to a PNG blob and reports its length (main thread; previews
 * only). The page count comes free from the document pdf.js already had to open.
 */
export async function pdfPreview(blob: Blob, dpi: number): Promise<PdfPreview> {
  const { doc, close } = await openPdf(new Uint8Array(await blob.arrayBuffer()));
  try {
    const canvas = (await renderPage(doc, 1, dpi)) as HTMLCanvasElement;
    const png = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), 'image/png'),
    );
    return { png, pageCount: doc.numPages };
  } finally {
    await close();
  }
}

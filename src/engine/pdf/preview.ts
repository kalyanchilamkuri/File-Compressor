import { openPdf, renderPage } from './pdfjs';

/** Renders the first page of a PDF to a PNG blob (main thread; used for previews only). */
export async function firstPagePng(blob: Blob, dpi: number): Promise<Blob> {
  const { doc, close } = await openPdf(new Uint8Array(await blob.arrayBuffer()));
  try {
    const canvas = (await renderPage(doc, 1, dpi)) as HTMLCanvasElement;
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), 'image/png'),
    );
  } finally {
    await close();
  }
}

import { PDFDocument, PDFName, type PDFImage } from 'pdf-lib';
import { decodeImage, flattenOnWhite, hasTransparency, isAnimatedGif } from '../image/decode';
import { encodeImage } from '../image/encode';
import { SNIFF_BYTES, detectType, engineFor } from '../router';
import type { ImagesToPdfOptions, ImagesToPdfResult, ProgressFn } from '../types';
import { UserFacingError } from '../types';

/** Points, at PDF's 72 per inch. */
const A4 = { width: 595.28, height: 841.89 };
const LETTER = { width: 612, height: 792 };

/** Longest side of a "fit" page, so pages keep the image's aspect at a sane physical size. */
const FIT_LONG_SIDE = A4.height;

function pageBox(
  pageSize: ImagesToPdfOptions['pageSize'],
  imgWidth: number,
  imgHeight: number,
): { width: number; height: number } {
  if (pageSize === 'fit') {
    const scale = FIT_LONG_SIDE / Math.max(imgWidth, imgHeight);
    return { width: imgWidth * scale, height: imgHeight * scale };
  }
  const base = pageSize === 'letter' ? LETTER : A4;
  // Landscape images get a landscape page, so they aren't shrunk to a thin strip.
  return imgWidth > imgHeight ? { width: base.height, height: base.width } : base;
}

/** JPEG and PNG go into the PDF untouched; anything else is decoded and re-encoded as JPEG. */
async function embed(doc: PDFDocument, file: File, quality: number): Promise<PDFImage> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  const type = detectType(head);
  if (!type || engineFor(type) !== 'image') {
    throw new UserFacingError(`“${file.name}” isn’t an image, so it can’t be added to a PDF.`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (type === 'jpeg') return doc.embedJpg(bytes);
  if (type === 'png') return doc.embedPng(bytes);
  if (type === 'gif' && isAnimatedGif(bytes)) {
    throw new UserFacingError(
      `“${file.name}” is an animated GIF. Only still images can be put into a PDF.`,
    );
  }
  let pixels = await decodeImage(file, type);
  if (hasTransparency(pixels)) pixels = flattenOnWhite(pixels);
  return doc.embedJpg(await encodeImage(pixels, 'jpeg', quality));
}

/**
 * Builds one PDF with a page per image, in the order given. Photos keep their original JPEG data,
 * so a JPG → PDF conversion loses no quality and the PDF stays about as big as its inputs.
 */
export async function imagesToPdf(
  files: File[],
  opts: ImagesToPdfOptions,
  onProgress: ProgressFn,
): Promise<ImagesToPdfResult> {
  if (!files.length) throw new UserFacingError('Add at least one image.');
  const doc = await PDFDocument.create();
  const warnings: string[] = [];
  const margin = opts.pageSize === 'fit' ? 0 : Math.max(0, opts.margin);
  let inputBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    onProgress(0.9 * (i / files.length));
    inputBytes += file.size;
    const image = await embed(doc, file, opts.quality);
    const { width: iw, height: ih } = image.size();
    const box = pageBox(opts.pageSize, iw, ih);
    const page = doc.addPage([box.width, box.height]);
    const fitted = image.scaleToFit(box.width - margin * 2, box.height - margin * 2);
    page.drawImage(image, {
      x: (box.width - fitted.width) / 2,
      y: (box.height - fitted.height) / 2,
      width: fitted.width,
      height: fitted.height,
    });
  }

  if (opts.stripMetadata) {
    doc.catalog.delete(PDFName.of('Metadata'));
    doc.setProducer('');
    doc.setCreator('');
  }
  if (opts.title) doc.setTitle(opts.title);

  onProgress(0.95);
  const saved = await doc.save({ useObjectStreams: true });
  onProgress(1);
  const blob = new Blob([saved as BlobPart], { type: 'application/pdf' });
  if (blob.size > inputBytes * 1.5) {
    warnings.push('The PDF is noticeably larger than the images. Compress PDF can shrink it.');
  }
  return {
    blob,
    fileName: 'images.pdf',
    pageCount: doc.getPageCount(),
    inputBytes,
    outputBytes: blob.size,
    warnings,
  };
}

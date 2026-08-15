import { EncryptedPDFError, PDFDocument, PDFName } from 'pdf-lib';
import type { MergeOptions, MergeResult, ProgressFn } from '../types';
import { UserFacingError } from '../types';
import { isEncrypted } from './encrypted';

/**
 * Names the file that failed. The single-file message in ./compress can't do that, and in a batch
 * "this PDF is locked" is useless when you dropped twelve of them.
 */
const lockedError = (name: string) =>
  new UserFacingError(`“${name}” is locked with a password, so it can’t be merged.`);

const unreadableError = (name: string, err: unknown) =>
  err instanceof EncryptedPDFError
    ? lockedError(name)
    : new UserFacingError(`“${name}” could not be read. It may be damaged or not a real PDF.`);

/**
 * Joins PDFs into one, in the order given. Inputs are never reordered and never skipped: a file
 * that can't be read stops the merge, because a quietly incomplete document is worse than an error.
 */
export async function mergePdfs(
  files: File[],
  opts: MergeOptions,
  onProgress: ProgressFn,
): Promise<MergeResult> {
  if (files.length < 2) throw new UserFacingError('Add at least two PDFs to merge.');
  const warnings: string[] = [];
  const out = await PDFDocument.create();
  let inputBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    onProgress(0.9 * (i / files.length));
    const bytes = new Uint8Array(await file.arrayBuffer());
    inputBytes += bytes.byteLength;
    if (isEncrypted(bytes)) throw lockedError(file.name);
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch (err) {
      throw unreadableError(file.name, err);
    }
    const indices = src.getPageIndices();
    if (!indices.length) {
      warnings.push(`“${file.name}” has no pages and was left out.`);
      continue;
    }
    for (const page of await out.copyPages(src, indices)) out.addPage(page);
  }

  const pageCount = out.getPageCount();
  if (!pageCount) throw new UserFacingError('None of these PDFs had any pages to merge.');

  if (opts.stripMetadata) {
    out.catalog.delete(PDFName.of('Metadata'));
    out.setProducer('');
    out.setCreator('');
  }
  if (opts.title) out.setTitle(opts.title);

  onProgress(0.95);
  const saved = await out.save({ useObjectStreams: true });
  onProgress(1);
  const blob = new Blob([saved as BlobPart], { type: 'application/pdf' });
  return {
    blob,
    fileName: 'merged.pdf',
    pageCount,
    inputBytes,
    outputBytes: blob.size,
    warnings,
  };
}

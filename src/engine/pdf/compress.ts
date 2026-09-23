import { EncryptedPDFError } from 'pdf-lib';
import { compressedName } from '../../lib/format';
import { TARGET_UNREACHABLE_WARNING, stepDownToTarget } from '../targetSize';
import type { CompressOptions, CompressResult, PdfLevel, ProgressFn } from '../types';
import { UserFacingError } from '../types';
import { isEncrypted } from './encrypted';
import { PdfLockedError } from './pdfjs';
import { scannedCompress } from './scanned';
import { smartCompress, type SmartStats } from './smart';

export const PDF_LEVELS: Record<PdfLevel, { dpi: number; quality: number }> = {
  light: { dpi: 200, quality: 80 },
  balanced: { dpi: 150, quality: 70 },
  strong: { dpi: 100, quality: 55 },
};

/** Best to worst quality, tried in order until the target fits. */
const TARGET_STEPS = [
  { dpi: 200, quality: 80 },
  { dpi: 150, quality: 70 },
  { dpi: 120, quality: 60 },
  { dpi: 100, quality: 50 },
  { dpi: 85, quality: 42 },
  { dpi: 72, quality: 35 },
  { dpi: 60, quality: 28 },
] as const;

export const SCANNED_TEXT_WARNING =
  'Pages were turned into images, so text can no longer be selected or searched.';

export interface PdfCompressResult extends CompressResult {
  /** Set when the file looks scanned and "Scanned" mode would likely do much better. */
  suggestScanned?: boolean;
}

function looksScanned(stats: SmartStats, fileBytes: number) {
  return stats.images >= stats.pages * 0.8 && stats.imageBytes > fileBytes * 0.75;
}

export async function compressPdf(
  file: File,
  opts: CompressOptions,
  onProgress: ProgressFn,
): Promise<PdfCompressResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const warnings: string[] = [];

  let smartStats: SmartStats | null = null;
  const smart = async (s: { dpi: number; quality: number }, progress: ProgressFn) => {
    try {
      const r = await smartCompress(bytes, s, opts.stripMetadata, progress);
      smartStats = r.stats;
      return new Blob([r.bytes as BlobPart], { type: 'application/pdf' });
    } catch (err) {
      if (err instanceof EncryptedPDFError || isEncrypted(bytes)) {
        throw new UserFacingError('This PDF is locked with a password, so it can’t be compressed.');
      }
      throw new UserFacingError('This PDF could not be read. It may be damaged.');
    }
  };
  const scanned = async (s: { dpi: number; quality: number }, progress: ProgressFn) => {
    try {
      return new Blob([(await scannedCompress(bytes, s, progress)) as BlobPart], {
        type: 'application/pdf',
      });
    } catch (err) {
      if (err instanceof PdfLockedError) {
        throw new UserFacingError('This PDF is locked with a password, so it can’t be compressed.');
      }
      throw err;
    }
  };

  const mode = opts.pdfMode ?? 'smart';
  const run = mode === 'scanned' ? scanned : smart;
  if (mode === 'scanned') warnings.push(SCANNED_TEXT_WARNING);

  let output: Blob;
  if (opts.mode === 'targetSize' && opts.targetBytes) {
    let i = 0;
    const found = await stepDownToTarget(
      TARGET_STEPS,
      (s) => {
        const base = i++ / TARGET_STEPS.length;
        return run(s, (f) => onProgress(base + f / TARGET_STEPS.length));
      },
      opts.targetBytes,
    );
    output = found.output;
    if (!found.hitTarget) warnings.push(TARGET_UNREACHABLE_WARNING);
  } else {
    output = await run(PDF_LEVELS[opts.pdfLevel ?? 'balanced'], onProgress);
  }
  onProgress(1);

  const stats = smartStats as SmartStats | null;
  const suggestScanned =
    mode === 'smart' && !!stats && looksScanned(stats, file.size) && output.size > file.size * 0.6;

  if (output.size >= file.size) {
    return {
      blob: file,
      fileName: file.name,
      originalBytes: file.size,
      outputBytes: file.size,
      warnings: [],
      keptOriginal: true,
      suggestScanned,
    };
  }
  return {
    blob: output,
    fileName: compressedName(file.name, 'pdf'),
    originalBytes: file.size,
    outputBytes: output.size,
    warnings,
    suggestScanned,
  };
}

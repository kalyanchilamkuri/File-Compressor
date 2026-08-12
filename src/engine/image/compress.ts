import { compressedName } from '../../lib/format';
import { TARGET_UNREACHABLE_WARNING, searchImageTarget } from '../targetSize';
import type {
  CompressOptions,
  CompressResult,
  DetectedType,
  ImageFormat,
  ProgressFn,
} from '../types';
import { UserFacingError } from '../types';
import { decodeImage, flattenOnWhite, hasTransparency, isAnimatedGif } from './decode';
import { EXT, MIME, encodeImage, resizeImage, type EncodeFormat } from './encode';
import { extractExifSegment, insertExif, resetOrientation } from './exif';
import { stripOriginal } from './metadata';

export interface ImageSuggestion {
  format: 'webp';
  savePercent: number;
}

export interface ImageCompressResult extends CompressResult {
  suggestion?: ImageSuggestion;
}

const NATIVE_FORMAT: Partial<Record<DetectedType, EncodeFormat>> = {
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

export function resolveImageFormat(
  input: DetectedType,
  requested: ImageFormat | undefined,
  transparent: boolean,
): EncodeFormat {
  if (requested && requested !== 'keep') return requested;
  const native = NATIVE_FORMAT[input];
  if (native) return native;
  // HEIC isn't viewable in most browsers/apps; GIF/BMP have no good encoder here.
  if (input === 'heic') return 'jpeg';
  return transparent ? 'png' : 'jpeg';
}

/** Scale (≤ 1) that fits the image within the optional max box. */
export function fitScale(width: number, height: number, maxW?: number, maxH?: number): number {
  let s = 1;
  if (maxW && width > maxW) s = Math.min(s, maxW / width);
  if (maxH && height > maxH) s = Math.min(s, maxH / height);
  return s;
}

export async function compressImage(
  file: File,
  type: DetectedType,
  opts: CompressOptions,
  onProgress: ProgressFn,
  signal?: AbortSignal,
): Promise<ImageCompressResult> {
  const warnings: string[] = [];
  const quality = Math.min(95, Math.max(5, opts.quality ?? 75));
  const keepsFormat = !opts.imageFormat || opts.imageFormat === 'keep';

  if (type === 'gif') {
    const head = new Uint8Array(await file.arrayBuffer());
    if (isAnimatedGif(head)) {
      throw new UserFacingError(
        'Animated GIFs aren’t supported yet. Convert it to a video (MP4) for a much smaller file.',
      );
    }
  }

  /** The original bytes, minus private metadata when stripping is on. Null if that isn't safe. */
  const keepOriginal = async (): Promise<ImageCompressResult | null> => {
    let blob: Blob = file;
    if (opts.stripMetadata) {
      const stripped = stripOriginal(type, new Uint8Array(await file.arrayBuffer()));
      if (!stripped) return null;
      blob = new Blob([stripped as BlobPart], { type: file.type || MIME[NATIVE_FORMAT[type]!] });
    }
    return {
      blob,
      fileName: blob.size < file.size ? compressedName(file.name) : file.name,
      originalBytes: file.size,
      outputBytes: blob.size,
      warnings: [],
      keptOriginal: true,
    };
  };

  const noResize = !opts.maxWidth && !opts.maxHeight;
  const canKeep = keepsFormat && noResize && !!NATIVE_FORMAT[type];
  if (canKeep && opts.mode === 'targetSize' && opts.targetBytes && file.size <= opts.targetBytes) {
    const kept = await keepOriginal();
    if (kept && kept.outputBytes <= opts.targetBytes) {
      kept.warnings.push('Already under the target size.');
      return kept;
    }
  }

  onProgress(0.05);
  let pixels = await decodeImage(file, type);
  signal?.throwIfAborted();
  onProgress(0.25);

  const transparent = hasTransparency(pixels);
  const format = resolveImageFormat(type, opts.imageFormat, transparent);
  if (format === 'jpeg' && transparent) {
    pixels = flattenOnWhite(pixels);
    warnings.push('Transparent areas were filled with white (JPEG has no transparency).');
  }

  const baseScale = fitScale(pixels.width, pixels.height, opts.maxWidth, opts.maxHeight);
  const resized = new Map<number, ImageData>();
  const atScale = async (scale: number) => {
    const s = baseScale * scale;
    const w = Math.max(1, Math.round(pixels.width * s));
    const h = Math.max(1, Math.round(pixels.height * s));
    const key = w * 100_000 + h;
    let img = resized.get(key);
    if (!img) {
      img = await resizeImage(pixels, w, h);
      resized.set(key, img);
    }
    return img;
  };

  const pngMode = opts.pngPalette ? 'palette' : 'lossless';
  let output: Uint8Array;
  if (opts.mode === 'targetSize' && opts.targetBytes) {
    const target = opts.targetBytes;
    // Lossless PNG can't trade quality for size, so target mode quantizes (lossy palette).
    const mode = format === 'png' ? 'palette' : pngMode;
    let steps = 0;
    const found = await searchImageTarget(
      async (q, scale) => {
        const bytes = await encodeImage(await atScale(scale), format, q, mode);
        return { bytes, size: bytes.byteLength };
      },
      target,
      {
        longSide: Math.max(pixels.width, pixels.height) * baseScale,
        signal,
        onStep: () => onProgress(Math.min(0.95, 0.3 + 0.65 * (1 - 1 / (1 + ++steps / 4)))),
      },
    );
    output = found.output.bytes;
    if (!found.hitTarget) warnings.push(TARGET_UNREACHABLE_WARNING);
    else if (found.scale < 1) {
      warnings.push('Dimensions were reduced to reach the target size.');
    }
  } else {
    output = await encodeImage(await atScale(1), format, quality, pngMode);
  }
  signal?.throwIfAborted();
  onProgress(0.97);

  if (!opts.stripMetadata && type === 'jpeg' && format === 'jpeg') {
    const exif = extractExifSegment(new Uint8Array(await file.arrayBuffer()));
    if (exif) {
      resetOrientation(exif);
      output = insertExif(output, exif);
    }
  } else if (!opts.stripMetadata) {
    warnings.push('Photo details (EXIF) can only be kept for JPEG → JPEG.');
  }

  const sameFormat = NATIVE_FORMAT[type] === format;
  if (sameFormat && output.byteLength >= file.size && noResize) {
    const kept = await keepOriginal();
    if (kept && kept.outputBytes <= output.byteLength) return kept;
  }
  if (!sameFormat && output.byteLength >= file.size) {
    warnings.push(`The ${format.toUpperCase()} version is larger than the original.`);
  }

  const blob = new Blob([output as BlobPart], { type: MIME[format] });
  const result: ImageCompressResult = {
    blob,
    fileName: compressedName(file.name, EXT[format]),
    originalBytes: file.size,
    outputBytes: blob.size,
    warnings,
  };

  if (opts.mode === 'quality' && keepsFormat && (format === 'jpeg' || format === 'png')) {
    result.suggestion = await suggestWebp(await atScale(1), format, quality, pngMode).catch(
      () => undefined,
    );
  }
  return result;
}

/** Estimates WebP savings on a small downscaled sample so the check stays cheap. */
async function suggestWebp(
  img: ImageData,
  format: 'jpeg' | 'png',
  quality: number,
  pngMode: 'lossless' | 'palette',
): Promise<ImageSuggestion | undefined> {
  const long = Math.max(img.width, img.height);
  if (long < 200) return undefined;
  if (format === 'png' && pngMode === 'lossless' && !looksLikePhoto(img)) return undefined;
  const s = Math.min(1, 512 / long);
  const sample = await resizeImage(
    img,
    Math.max(1, Math.round(img.width * s)),
    Math.max(1, Math.round(img.height * s)),
  );
  const [current, webp] = await Promise.all([
    encodeImage(sample, format, quality, pngMode),
    encodeImage(sample, 'webp', quality),
  ]);
  const savePercent = Math.round((1 - webp.byteLength / current.byteLength) * 100);
  return savePercent >= 15 ? { format: 'webp', savePercent } : undefined;
}

/** Photos have many distinct colours; screenshots and logos have few. */
function looksLikePhoto(img: ImageData): boolean {
  const seen = new Set<number>();
  const d = img.data;
  const step = Math.max(4, Math.floor(d.length / 4 / 20_000) * 4);
  for (let i = 0; i < d.length; i += step) {
    seen.add(((d[i]! >> 3) << 10) | ((d[i + 1]! >> 3) << 5) | (d[i + 2]! >> 3));
    if (seen.size > 3000) return true;
  }
  return false;
}

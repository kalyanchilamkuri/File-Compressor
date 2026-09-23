import { UserFacingError, type DetectedType } from '../types';

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function wasmDecode(file: Blob, type: DetectedType): Promise<ImageData | null> {
  const buf = await file.arrayBuffer();
  switch (type) {
    case 'avif':
      return (await import('@jsquash/avif/decode.js')).default(buf);
    case 'webp':
      return (await import('@jsquash/webp/decode.js')).default(buf);
    case 'jpeg':
      return (await import('@jsquash/jpeg/decode.js')).default(buf);
    case 'png':
      return (await import('@jsquash/png/decode.js')).default(buf);
    default:
      return null;
  }
}

/**
 * Decodes to sRGB RGBA pixels with EXIF orientation applied, so the pixels are upright and any
 * orientation tag can be dropped. Native decoding is tried first because it is much faster.
 */
export async function decodeImage(file: Blob, type: DetectedType): Promise<ImageData> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      premultiplyAlpha: 'none',
    });
    return bitmapToImageData(bitmap);
  } catch {
    // Fall through to the codec-specific decoders below.
  }

  if (type === 'heic') {
    try {
      const { heicTo } = await import('heic-to/csp');
      return bitmapToImageData(await heicTo({ blob: file, type: 'bitmap' }));
    } catch {
      throw new UserFacingError('This HEIC photo could not be opened. It may be damaged.');
    }
  }

  const decoded = await wasmDecode(file, type).catch(() => null);
  if (decoded) return decoded;
  throw new UserFacingError(
    `This ${type.toUpperCase()} image could not be opened. It may be damaged, or this browser can't read it.`,
  );
}

export function hasTransparency(img: ImageData): boolean {
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i]! < 255) return true;
  return false;
}

/** Composites onto white; JPEG has no alpha and would otherwise turn transparent areas black. */
export function flattenOnWhite(img: ImageData): ImageData {
  const out = new ImageData(img.width, img.height);
  const s = img.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3]! / 255;
    d[i] = s[i]! * a + 255 * (1 - a);
    d[i + 1] = s[i + 1]! * a + 255 * (1 - a);
    d[i + 2] = s[i + 2]! * a + 255 * (1 - a);
    d[i + 3] = 255;
  }
  return out;
}

/** True for animated GIFs (more than one graphic control block). */
export function isAnimatedGif(bytes: Uint8Array): boolean {
  let count = 0;
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      if (++count > 1) return true;
    }
  }
  return false;
}

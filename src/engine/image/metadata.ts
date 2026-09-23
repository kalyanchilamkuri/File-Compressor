import type { DetectedType } from '../types';

/** EXIF orientation (1–8) of a JPEG, or 1 if absent. */
export function jpegOrientation(jpeg: Uint8Array): number {
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1]!;
    if (marker === 0xda || marker === 0xd9) break;
    const len = (jpeg[i + 2]! << 8) | jpeg[i + 3]!;
    if (marker === 0xe1 && jpeg[i + 4] === 0x45 && jpeg[i + 5] === 0x78) {
      const tiff = i + 10;
      const view = new DataView(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
      const little = jpeg[tiff] === 0x49;
      const ifd0 = tiff + view.getUint32(tiff + 4, little);
      if (ifd0 + 2 > jpeg.length) return 1;
      const count = view.getUint16(ifd0, little);
      for (let e = 0; e < count; e++) {
        const entry = ifd0 + 2 + e * 12;
        if (entry + 12 > jpeg.length) return 1;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
}

/**
 * Drops EXIF/XMP (APP1), IPTC (APP13) and comments from a JPEG without re-encoding.
 * Keeps JFIF, ICC colour profiles (APP2) and Adobe (APP14), which affect how pixels render.
 */
export function stripJpeg(jpeg: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [jpeg.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1]!;
    if (marker === 0xda) break;
    const len = (jpeg[i + 2]! << 8) | jpeg[i + 3]!;
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) parts.push(jpeg.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  parts.push(jpeg.subarray(i));
  return concat(parts);
}

const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/** Drops text, EXIF and timestamp chunks from a PNG without re-encoding. */
export function stripPng(png: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let i = 8;
  while (i + 12 <= png.length) {
    const len = view.getUint32(i);
    const type = String.fromCharCode(...png.subarray(i + 4, i + 8));
    const end = i + 12 + len;
    if (!PNG_DROP.has(type)) parts.push(png.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return concat(parts);
}

/** Drops EXIF and XMP chunks from a WebP (and clears their VP8X flags) without re-encoding. */
export function stripWebp(webp: Uint8Array): Uint8Array {
  const view = new DataView(webp.buffer, webp.byteOffset, webp.byteLength);
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= webp.length) {
    const fourcc = String.fromCharCode(...webp.subarray(i, i + 4));
    const size = view.getUint32(i + 4, true);
    const end = Math.min(webp.length, i + 8 + size + (size & 1));
    if (fourcc === 'VP8X') {
      const chunk = webp.slice(i, end);
      chunk[8]! &= ~(0x08 | 0x04); // EXIF and XMP flags
      parts.push(chunk);
    } else if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      parts.push(webp.subarray(i, end));
    }
    i = end;
  }
  const body = concat(parts);
  const out = new Uint8Array(12 + body.length);
  out.set(webp.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, 4 + body.length, true);
  out.set(body, 12);
  return out;
}

/**
 * Losslessly removes private metadata from an original file when it's kept as-is.
 * Returns null when this can't be done safely (e.g. the image relies on its EXIF rotation).
 */
export function stripOriginal(type: DetectedType, bytes: Uint8Array): Uint8Array | null {
  try {
    if (type === 'jpeg') return jpegOrientation(bytes) === 1 ? stripJpeg(bytes) : null;
    if (type === 'png') return stripPng(bytes);
    if (type === 'webp') return stripWebp(bytes);
  } catch {
    return null;
  }
  return null;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

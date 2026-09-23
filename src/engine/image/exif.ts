const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

/** Returns the raw APP1 Exif segment (marker included) of a JPEG, or null. */
export function extractExifSegment(jpeg: Uint8Array): Uint8Array | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= jpeg.length) {
    if (jpeg[i] !== 0xff) return null;
    const marker = jpeg[i + 1]!;
    // Start of scan or end of image: no more metadata segments.
    if (marker === 0xda || marker === 0xd9) return null;
    const len = (jpeg[i + 2]! << 8) | jpeg[i + 3]!;
    if (marker === 0xe1 && EXIF_HEADER.every((b, k) => jpeg[i + 4 + k] === b)) {
      return jpeg.slice(i, i + 2 + len);
    }
    i += 2 + len;
  }
  return null;
}

/**
 * Sets the EXIF orientation tag to 1 (upright) in place. Pixels are already rotated on decode,
 * so keeping the original tag would rotate the image a second time in viewers.
 */
export function resetOrientation(segment: Uint8Array): void {
  const tiff = 10; // FF E1 len(2) "Exif\0\0"
  if (segment.length < tiff + 8) return;
  const little = segment[tiff] === 0x49;
  const view = new DataView(segment.buffer, segment.byteOffset, segment.byteLength);
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  const ifd0 = tiff + u32(tiff + 4);
  if (ifd0 + 2 > segment.length) return;
  const count = u16(ifd0);
  for (let e = 0; e < count; e++) {
    const entry = ifd0 + 2 + e * 12;
    if (entry + 12 > segment.length) return;
    if (u16(entry) === 0x0112) {
      view.setUint16(entry + 8, 1, little);
      return;
    }
  }
}

/** Inserts an APP1 Exif segment right after SOI of an encoded JPEG. */
export function insertExif(jpeg: Uint8Array, segment: Uint8Array): Uint8Array {
  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(jpeg.subarray(2), 2 + segment.length);
  return out;
}

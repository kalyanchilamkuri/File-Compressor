// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractExifSegment, insertExif, resetOrientation } from '../../src/engine/image/exif';
import {
  jpegOrientation,
  stripJpeg,
  stripOriginal,
  stripPng,
  stripWebp,
} from '../../src/engine/image/metadata';

import { fixture as load } from './fixtures';
const has = (hay: Uint8Array, needle: string) =>
  Buffer.from(hay).includes(Buffer.from(needle, 'latin1'));

/** Builds a PNG chunk (CRC is not checked by our code, so zeros are fine here). */
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(Buffer.from(type, 'latin1'), 4);
  out.set(data, 8);
  return out;
}

describe('JPEG EXIF', () => {
  const exifJpeg = load('photo-exif.jpg');

  it('reads the orientation of the fixture (6 = rotated 90°)', () => {
    expect(jpegOrientation(exifJpeg)).toBe(6);
    expect(jpegOrientation(load('photo.jpg'))).toBe(1);
  });

  it('extracts, resets orientation, and re-inserts the EXIF segment', () => {
    const seg = extractExifSegment(exifJpeg)!;
    expect(seg).not.toBeNull();
    expect(has(seg, 'Exif')).toBe(true);
    resetOrientation(seg);
    const plain = load('photo.jpg');
    const merged = insertExif(plain, seg);
    expect(merged.length).toBe(plain.length + seg.length);
    expect(jpegOrientation(merged)).toBe(1);
    expect(extractExifSegment(merged)).toEqual(seg);
  });

  it('strips EXIF (incl. GPS) losslessly and keeps the image data', () => {
    const withExif = insertExif(
      load('photo.jpg'),
      (() => {
        const s = extractExifSegment(exifJpeg)!;
        resetOrientation(s);
        return s;
      })(),
    );
    const stripped = stripJpeg(withExif);
    expect(extractExifSegment(stripped)).toBeNull();
    expect(stripped).toEqual(load('photo.jpg'));
  });

  it('refuses to strip a rotated original (the rotation lives in EXIF)', () => {
    expect(stripOriginal('jpeg', exifJpeg)).toBeNull();
  });
});

describe('PNG and WebP metadata', () => {
  it('drops text and EXIF chunks from PNG but keeps image chunks', () => {
    const png = load('graphic.png');
    const iend = png.length - 12;
    const withText = new Uint8Array([
      ...png.subarray(0, iend),
      ...chunk('tEXt', Buffer.from('Author\0Someone')),
      ...chunk('eXIf', new Uint8Array(8)),
      ...png.subarray(iend),
    ]);
    const stripped = stripPng(withText);
    expect(has(stripped, 'tEXt')).toBe(false);
    expect(has(stripped, 'eXIf')).toBe(false);
    expect(stripped).toEqual(png);
  });

  it('drops EXIF from WebP and fixes the RIFF size', () => {
    const webp = load('photo.webp');
    const exif = new Uint8Array([...Buffer.from('EXIF', 'latin1'), 4, 0, 0, 0, 1, 2, 3, 4]);
    const joined = new Uint8Array([...webp, ...exif]);
    new DataView(joined.buffer).setUint32(4, joined.length - 8, true);
    const stripped = stripWebp(joined);
    expect(has(stripped, 'EXIF')).toBe(false);
    expect(new DataView(stripped.buffer).getUint32(4, true)).toBe(stripped.length - 8);
    expect(stripped.length).toBe(webp.length);
  });
});

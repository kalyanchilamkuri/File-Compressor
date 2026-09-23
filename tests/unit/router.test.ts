import { describe, expect, it } from 'vitest';
import { SNIFF_BYTES, detectType, engineFor } from '../../src/engine/router';
import { fixture as load } from './fixtures';

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

const ftyp = (major: string, ...compat: string[]) => {
  const brands = [major, '\0\0\0\0', ...compat].join('');
  const size = 8 + brands.length;
  return bytes([0, 0, 0, size], 'ftyp', brands);
};

const fixture = (name: string) => load(name).subarray(0, SNIFF_BYTES);

describe('detectType', () => {
  it.each([
    ['jpeg', bytes([0xff, 0xd8, 0xff, 0xe0])],
    ['png', bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['gif', bytes('GIF89a')],
    ['webp', bytes('RIFF', [0, 0, 0, 0], 'WEBP')],
    ['wav', bytes('RIFF', [0, 0, 0, 0], 'WAVE')],
    ['pdf', bytes('%PDF-1.7')],
    ['avif', ftyp('avif', 'mif1')],
    ['avif', ftyp('mif1', 'avif')],
    ['heic', ftyp('heic', 'mif1')],
    ['heic', ftyp('mif1', 'heic')],
    ['mov', ftyp('qt  ')],
    ['m4a', ftyp('M4A ', 'isom')],
    ['mp4', ftyp('isom', 'mp41')],
    ['webm', bytes([0x1a, 0x45, 0xdf, 0xa3], [0x42, 0x82, 0x84], 'webm')],
    ['mkv', bytes([0x1a, 0x45, 0xdf, 0xa3], [0x42, 0x82, 0x88], 'matroska')],
    ['ogg', bytes('OggS')],
    ['flac', bytes('fLaC')],
    ['mp3', bytes('ID3', [3, 0])],
    ['mp3', bytes([0xff, 0xfb, 0x90])],
    ['aac', bytes([0xff, 0xf1, 0x50])],
    ['zip', bytes('PK', [3, 4])],
    ['rar', bytes('Rar!', [0x1a, 0x07, 0x01, 0x00])],
    ['7z', bytes([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])],
    ['gzip', bytes([0x1f, 0x8b, 0x08])],
    ['bmp', bytes('BM', new Array(20).fill(0))],
  ])('detects %s', (type, head) => {
    expect(detectType(head)).toBe(type);
  });

  it('detects TAR by the ustar magic at offset 257', () => {
    const head = new Uint8Array(512);
    head.set(bytes('ustar'), 257);
    expect(detectType(head)).toBe('tar');
  });

  it('ignores file extensions and MIME types: unknown bytes are unsupported', () => {
    expect(detectType(bytes('hello world, not a real file'))).toBeNull();
    expect(detectType(new Uint8Array(0))).toBeNull();
  });

  it.each([
    ['photo.jpg', 'jpeg'],
    ['graphic.png', 'png'],
    ['photo.webp', 'webp'],
    ['images.pdf', 'pdf'],
    ['clip.webm', 'webm'],
    ['tone.wav', 'wav'],
    ['archive.zip', 'zip'],
    ['archive.7z', '7z'],
    ['archive.tar.gz', 'gzip'],
  ])('detects the %s fixture as %s', (name, type) => {
    expect(detectType(fixture(name))).toBe(type);
  });
});

describe('engineFor', () => {
  it('routes each type to its engine', () => {
    expect(engineFor('heic')).toBe('image');
    expect(engineFor('pdf')).toBe('pdf');
    expect(engineFor('mov')).toBe('video');
    expect(engineFor('m4a')).toBe('audio');
    expect(engineFor('7z')).toBe('archive');
  });
});

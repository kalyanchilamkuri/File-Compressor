import type { DetectedType, EngineId } from './types';

/** Enough bytes for every signature we check, including TAR's at offset 257. */
export const SNIFF_BYTES = 512;

const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.subarray(start, start + len));

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

function sniffIsoBmff(b: Uint8Array): DetectedType | null {
  if (b.length < 12 || ascii(b, 4, 4) !== 'ftyp') return null;
  const boxSize = Math.min((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!, b.length);
  const brands = [ascii(b, 8, 4)];
  for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(ascii(b, i, 4));
  if (brands.some((x) => AVIF_BRANDS.has(x))) return 'avif';
  if (brands.some((x) => HEIC_BRANDS.has(x))) return 'heic';
  const major = brands[0]!;
  // mif1/msf1 alone = generic HEIF, which in practice is HEIC.
  if (major === 'mif1' || major === 'msf1') return 'heic';
  if (major === 'qt  ') return 'mov';
  if (major.startsWith('M4A') || major.startsWith('M4B')) return 'm4a';
  return 'mp4';
}

function sniffMatroska(b: Uint8Array): DetectedType | null {
  if (!startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return null;
  return ascii(b, 0, Math.min(b.length, 64)).includes('webm') ? 'webm' : 'mkv';
}

/** Identifies a file from its leading bytes. Never trusts the extension or MIME type. */
export function detectType(head: Uint8Array): DetectedType | null {
  const b = head;
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (ascii(b, 0, 4) === 'GIF8') return 'gif';
  if (ascii(b, 0, 4) === 'RIFF') {
    const form = ascii(b, 8, 4);
    if (form === 'WEBP') return 'webp';
    if (form === 'WAVE') return 'wav';
    return null;
  }
  if (ascii(b, 0, 5) === '%PDF-') return 'pdf';
  const iso = sniffIsoBmff(b);
  if (iso) return iso;
  const mkv = sniffMatroska(b);
  if (mkv) return mkv;
  if (ascii(b, 0, 4) === 'OggS') return 'ogg';
  if (ascii(b, 0, 4) === 'fLaC') return 'flac';
  if (ascii(b, 0, 3) === 'ID3') return 'mp3';
  if (startsWith(b, [0x50, 0x4b]) && [0x0304, 0x0506, 0x0708].includes((b[2]! << 8) | b[3]!)) {
    return 'zip';
  }
  if (ascii(b, 0, 6) === 'Rar!\x1a\x07') return 'rar';
  if (startsWith(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return '7z';
  if (startsWith(b, [0x1f, 0x8b])) return 'gzip';
  if (ascii(b, 257, 5) === 'ustar') return 'tar';
  if (ascii(b, 0, 2) === 'BM' && b.length >= 14) return 'bmp';
  // MPEG audio frame sync: 11 set bits. Layer bits 00 = ADTS AAC, otherwise MP3.
  if (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) {
    return (b[1]! & 0x06) === 0 ? 'aac' : 'mp3';
  }
  return null;
}

const ENGINE_BY_TYPE: Record<DetectedType, EngineId> = {
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  avif: 'image',
  heic: 'image',
  gif: 'image',
  bmp: 'image',
  pdf: 'pdf',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  mkv: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  flac: 'audio',
  aac: 'audio',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gzip: 'archive',
};

export const engineFor = (type: DetectedType): EngineId => ENGINE_BY_TYPE[type];

export async function sniffFile(file: Blob): Promise<DetectedType | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  return detectType(head);
}

export const TYPE_LABEL: Record<DetectedType, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
  heic: 'HEIC',
  gif: 'GIF',
  bmp: 'BMP',
  pdf: 'PDF',
  mp4: 'MP4',
  mov: 'MOV',
  webm: 'WebM',
  mkv: 'MKV',
  mp3: 'MP3',
  wav: 'WAV',
  ogg: 'OGG',
  m4a: 'M4A',
  flac: 'FLAC',
  aac: 'AAC',
  zip: 'ZIP',
  rar: 'RAR',
  '7z': '7z',
  tar: 'TAR',
  gzip: 'GZIP',
};

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Formats bytes with 1024-based units, e.g. 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace(/\.0$/, '')} ${UNITS[unit]}`;
}

/** Percentage saved going from `before` to `after` bytes, rounded. Negative if it grew. */
export function percentSaved(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** Parses user input like "100", "100kb", "1.5 MB" into bytes. `defaultUnit` applies when none is typed. */
export function parseSize(input: string, defaultUnit: 'KB' | 'MB' = 'KB'): number | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(b|kb|k|mb|m|gb|g)?\s*$/i.exec(input);
  if (!m) return null;
  const value = Number(m[1]!.replace(',', '.'));
  if (!(value > 0)) return null;
  const unit = (m[2] ?? defaultUnit).toLowerCase();
  const mult =
    unit === 'b' ? 1 : unit.startsWith('k') ? 1024 : unit.startsWith('m') ? 1024 ** 2 : 1024 ** 3;
  return Math.round(value * mult);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'application/zip': 'zip',
};

export const extensionForMime = (mime: string) => EXT_BY_MIME[mime.split(';')[0]!.trim()];

/** "photo.large.JPG" + "webp" → "photo.large-compressed.webp" */
export function compressedName(original: string, ext?: string): string {
  const dot = original.lastIndexOf('.');
  const base = dot > 0 ? original.slice(0, dot) : original;
  const origExt = dot > 0 ? original.slice(dot + 1) : '';
  const finalExt = ext ?? origExt;
  return `${base}-compressed${finalExt ? `.${finalExt}` : ''}`;
}

/**
 * "photo.large.JPG" + "webp" → "photo.large.webp". Converting is not compressing: the output is a
 * different format of the same picture, so it keeps the name and only swaps the extension.
 */
export function convertedName(original: string, ext: string): string {
  const dot = original.lastIndexOf('.');
  const base = dot > 0 ? original.slice(0, dot) : original;
  return ext ? `${base}.${ext}` : base;
}

/** The extension of a file name, without the dot. Empty when there isn't one. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
}

/** Makes names unique within a ZIP: "a.jpg", "a.jpg" → "a.jpg", "a (2).jpg". */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 1) return name;
    const slash = name.lastIndexOf('/');
    const dot = name.lastIndexOf('.');
    const cut = dot > slash + 1 ? dot : name.length;
    const candidate = `${name.slice(0, cut)} (${n})${name.slice(cut)}`;
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}

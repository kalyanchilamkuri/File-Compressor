import { uniqueNames } from '../../lib/format';

export interface ZipEntry {
  /** Path inside the ZIP; may contain "/" for folders. */
  name: string;
  blob: Blob;
  lastModified?: number;
}

/** Already-compressed formats gain nothing from deflate, so they're stored as-is (much faster). */
const STORE_EXT =
  /\.(jpe?g|png|gif|webp|avif|heic|heif|mp4|m4v|mov|webm|mkv|mp3|m4a|aac|ogg|opus|flac|zip|rar|7z|gz|bz2|xz|zst|pdf|docx|xlsx|pptx)$/i;

/**
 * Builds a ZIP by streaming each input in chunks, so large files never need to be fully in memory
 * at once. Returns a Blob assembled from the output chunks.
 */
export async function createZip(
  entries: readonly ZipEntry[],
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const { Zip, AsyncZipDeflate, ZipPassThrough } = await import('fflate');
  const names = uniqueNames(entries.map((e) => e.name.replace(/^\/+/, '')));
  const total = entries.reduce((n, e) => n + e.blob.size, 0) || 1;
  let done = 0;

  const parts: BlobPart[] = [];
  let fail: (e: unknown) => void = () => {};
  let finish: () => void = () => {};
  const finished = new Promise<void>((res, rej) => {
    finish = res;
    fail = rej;
  });
  const zip = new Zip((err, chunk, final) => {
    if (err) return fail(err);
    parts.push(chunk as Uint8Array<ArrayBuffer>);
    if (final) finish();
  });

  for (let i = 0; i < entries.length; i++) {
    signal?.throwIfAborted();
    const entry = entries[i]!;
    const name = names[i]!;
    const file = STORE_EXT.test(name)
      ? new ZipPassThrough(name)
      : new AsyncZipDeflate(name, { level: 6 });
    file.mtime = entry.lastModified ?? Date.now();
    zip.add(file);
    const reader = entry.blob.stream().getReader();
    for (;;) {
      const { value, done: eof } = await reader.read();
      if (eof) break;
      signal?.throwIfAborted();
      file.push(value, false);
      done += value.byteLength;
      onProgress?.(Math.min(0.99, done / total));
    }
    file.push(new Uint8Array(0), true);
  }
  zip.end();
  await finished;
  onProgress?.(1);
  return new Blob(parts, { type: 'application/zip' });
}

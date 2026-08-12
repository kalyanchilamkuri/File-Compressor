import type { ArchiveReader } from 'libarchive.js/dist/build/compiled/archive-reader';

export interface ExtractedEntry {
  path: string;
  file: File;
}

export interface ListedEntry {
  path: string;
  size: number;
}

/** libarchive's worker and WASM are copied to /vendor by scripts/copy-vendor.mjs. */
const WORKER_URL = '/vendor/libarchive/worker-bundle.js';

let initialised = false;
async function lib() {
  const mod = await import('libarchive.js');
  if (!initialised) {
    mod.Archive.init({ workerUrl: WORKER_URL });
    initialised = true;
  }
  return mod.Archive;
}

export class ArchivePasswordError extends Error {}

export class OpenArchive {
  private constructor(private reader: ArchiveReader) {}

  static async open(file: File): Promise<OpenArchive> {
    const Archive = await lib();
    return new OpenArchive(await Archive.open(file));
  }

  async isEncrypted(): Promise<boolean> {
    return (await this.reader.hasEncryptedData()) === true;
  }

  async usePassword(password: string) {
    await this.reader.usePassword(password);
  }

  async list(): Promise<ListedEntry[]> {
    const items = (await this.reader.getFilesArray()) as {
      file: { name: string; size: number };
      path: string;
    }[];
    return items.map(({ file, path }) => ({ path: `${path}${file.name}`, size: file.size }));
  }

  async extractAll(): Promise<ExtractedEntry[]> {
    try {
      // libarchive.js fires its per-file callback via setTimeout *after* this resolves, so the
      // results are read back from the reader instead.
      await this.reader.extractFiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/passphrase|password|encrypt|decrypt/i.test(msg)) throw new ArchivePasswordError(msg);
      throw err;
    }
    const items = (await this.reader.getFilesArray()) as {
      file: File | { name: string };
      path: string;
    }[];
    const files = items.filter((i): i is { file: File; path: string } => i.file instanceof File);
    if (files.length < items.length) {
      // Entries that stayed un-extracted are the sign of a wrong password with ZipCrypto.
      throw new ArchivePasswordError('Some files could not be decrypted');
    }
    return files.map(({ file, path }) => ({ path: `${path}${file.name}`, file }));
  }

  async close() {
    await this.reader.close().catch(() => {});
  }
}

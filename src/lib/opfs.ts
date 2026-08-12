export const OPFS_TEMP_DIR = 'squish-tmp';

async function tempDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_TEMP_DIR, { create: true });
  } catch {
    return null;
  }
}

/**
 * Deletes leftover temp files from earlier visits. Files are named `<timestamp>-<random>`; recent
 * ones are left alone because another open tab may still be offering them for download.
 */
export async function clearTempFiles(maxAgeMs = 6 * 60 * 60 * 1000): Promise<void> {
  const dir = await tempDir();
  if (!dir) return;
  const cutoff = Date.now() - maxAgeMs;
  try {
    for await (const name of dir.keys()) {
      const created = Number(name.split('-')[0]);
      if (!(created > cutoff)) await dir.removeEntry(name).catch(() => {});
    }
  } catch {
    // OPFS unsupported or iteration unavailable: nothing to clean.
  }
}

export async function deleteTempFile(name: string): Promise<void> {
  const dir = await tempDir();
  try {
    await dir?.removeEntry(name);
  } catch {
    // Already gone.
  }
}

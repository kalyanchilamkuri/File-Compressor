export interface PickedFile {
  file: File;
  /** Folder path inside a dropped folder, e.g. "holiday/day1/photo.jpg". */
  path: string;
}

const IGNORED = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX\/.*)$/i;

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const next = () =>
      reader.readEntries((batch) => {
        // readEntries returns results in batches (100 in Chrome) until it returns none.
        if (!batch.length) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

async function walk(entry: FileSystemEntry, out: PickedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej),
    );
    out.push({ file, path: entry.fullPath.replace(/^\//, '') });
  } else if (entry.isDirectory) {
    const children = await readAllEntries((entry as FileSystemDirectoryEntry).createReader());
    for (const child of children) await walk(child, out);
  }
}

/** Collects files from a drop, recursing into folders where the browser supports it. */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<PickedFile[]> {
  const out: PickedFile[] = [];
  const items = Array.from(dt.items ?? []).filter((i) => i.kind === 'file');
  const entries = items.map((i) => i.webkitGetAsEntry?.() ?? null);
  if (entries.length && entries.every((e) => e)) {
    for (const entry of entries) await walk(entry!, out);
  } else {
    for (const file of Array.from(dt.files)) out.push({ file, path: file.name });
  }
  return out.filter((f) => !IGNORED.test(f.path));
}

export function filesFromInput(list: FileList | null): PickedFile[] {
  return Array.from(list ?? [])
    .map((file) => ({ file, path: file.webkitRelativePath || file.name }))
    .filter((f) => !IGNORED.test(f.path));
}

/** Pasted screenshots are all called "image.png"; give them a readable, unique name. */
export function filesFromClipboard(data: DataTransfer | null): PickedFile[] {
  if (!data) return [];
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return Array.from(data.files).map((file, i) => {
    const generic = /^image\.\w+$/i.test(file.name) || !file.name;
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
    const name = generic ? `pasted-${stamp}${i ? `-${i + 1}` : ''}.${ext}` : file.name;
    const renamed = generic
      ? new File([file], name, { type: file.type, lastModified: Date.now() })
      : file;
    return { file: renamed, path: name };
  });
}

import { useCallback, useId, useRef, useState } from 'react';
import { resolveOptions, type CompressibleEngine } from '../config/presets';
import { createZip } from '../engine/archive/zip';
import { runInWorker } from '../engine/pool';
import { engineFor, sniffFile } from '../engine/router';
import { downloadBlob } from '../lib/download';
import type { PickedFile } from '../lib/files';
import { formatBytes } from '../lib/format';
import ArchivePanel, { archiveKey } from './ArchivePanel';
import DropZone from './DropZone';
import { ArchiveIcon, XIcon } from './icons';

interface Entry extends PickedFile {
  id: number;
  isArchive: boolean;
}

let nextId = 0;

export default function ZipTool() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [compressFirst, setCompressFirst] = useState(true);
  const [name, setName] = useState('files');
  const [busy, setBusy] = useState<string | null>(null);
  const [opened, setOpened] = useState<File | null>(null);
  const abort = useRef<AbortController | null>(null);
  const nameId = useId();

  const add = useCallback(async (picked: PickedFile[]) => {
    const typed = await Promise.all(
      picked.map(async (p) => {
        const t = await sniffFile(p.file).catch(() => null);
        return { ...p, id: nextId++, isArchive: !!t && engineFor(t) === 'archive' };
      }),
    );
    setEntries((prev) => [...prev, ...typed]);
  }, []);

  const total = entries.reduce((n, e) => n + e.file.size, 0);

  const build = async () => {
    abort.current = new AbortController();
    const signal = abort.current.signal;
    try {
      const prepared: { name: string; blob: Blob; lastModified: number }[] = [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]!;
        let blob: Blob = e.file;
        let path = e.path;
        const type = compressFirst ? await sniffFile(e.file).catch(() => null) : null;
        const engine = type ? engineFor(type) : null;
        if (type && engine && engine !== 'archive') {
          setBusy(`Compressing ${i + 1} of ${entries.length}…`);
          try {
            const opts = resolveOptions(engine as CompressibleEngine, 'balanced', null, {
              stripMetadata: true,
            });
            const r = await runInWorker(engine, e.file, type, opts, () => {}, signal);
            if (r.outputBytes < e.file.size) {
              blob = r.blob;
              const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
              path = `${dir}${r.fileName}`;
            }
          } catch (err) {
            if (signal.aborted) throw err;
            // Keep the original if this one file can't be compressed.
          }
        }
        prepared.push({ name: path, blob, lastModified: e.file.lastModified });
      }
      setBusy('Zipping… 0%');
      const zip = await createZip(
        prepared,
        (p) => setBusy(`Zipping… ${Math.round(p * 100)}%`),
        signal,
      );
      downloadBlob(zip, `${(name.trim() || 'files').replace(/[\\/:*?"<>|]+/g, '-')}.zip`);
    } catch (err) {
      if (!signal.aborted) console.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DropZone
        onFiles={(f) => void add(f)}
        compact={entries.length > 0}
        hint="Add files or folders to zip, or drop a ZIP, RAR, 7z or TAR to open it."
      />

      {entries.length > 0 && (
        <section
          className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          aria-label="Files to zip"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {entries.length} file{entries.length === 1 ? '' : 's'} · {formatBytes(total)}
            </p>
            <button
              type="button"
              onClick={() => setEntries([])}
              className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-400"
            >
              Clear all
            </button>
          </div>
          <ul
            className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800"
            data-testid="zip-list"
          >
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="truncate">{e.path}</span>
                <span className="flex shrink-0 items-center gap-2 text-slate-500">
                  {e.isArchive && (
                    <button
                      type="button"
                      onClick={() => setOpened(e.file)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ArchiveIcon className="h-3.5 w-3.5" /> Open
                    </button>
                  )}
                  {formatBytes(e.file.size)}
                  <button
                    type="button"
                    aria-label={`Remove ${e.path}`}
                    onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                    className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compressFirst}
                  onChange={(e) => setCompressFirst(e.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                Compress images, PDFs, videos and audio first
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor={nameId} className="text-sm">
                  ZIP name
                </label>
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <span className="text-sm text-slate-500">.zip</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {busy && (
                <button
                  type="button"
                  onClick={() => abort.current?.abort()}
                  className="text-sm font-medium hover:underline"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void build()}
                className="rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-70"
                aria-live="polite"
              >
                {busy ?? 'Create ZIP'}
              </button>
            </div>
          </div>
        </section>
      )}

      <ArchivePanel
        key={archiveKey(opened)}
        file={opened}
        onClose={() => setOpened(null)}
        compressLabel="Add these files to the ZIP list"
        onCompress={(files) => {
          setOpened(null);
          void add(files);
        }}
      />
    </div>
  );
}

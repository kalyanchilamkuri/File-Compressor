import { useCallback, useId, useRef, useState } from 'react';
import { isUserFacing } from '../engine/types';
import { mergeInWorker } from '../engine/pool';
import { sniffFile } from '../engine/router';
import { downloadBlob } from '../lib/download';
import type { PickedFile } from '../lib/files';
import { formatBytes } from '../lib/format';
import DropZone from './DropZone';
import OrderedList, { type OrderedEntry } from './OrderedList';
import { AlertIcon, DownloadIcon } from './icons';

interface MergeEntry extends OrderedEntry {
  pageCount?: number;
}

let nextId = 0;

const safeName = (name: string) => (name.trim() || 'merged').replace(/[\\/:*?"<>|]+/g, '-');

export default function MergePdfTool() {
  const [entries, setEntries] = useState<MergeEntry[]>([]);
  const [name, setName] = useState('merged');
  const [stripMetadata, setStripMetadata] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const nameId = useId();

  const add = useCallback(async (picked: PickedFile[]) => {
    const types = await Promise.all(picked.map((p) => sniffFile(p.file).catch(() => null)));
    const pdfs = picked.filter((_, i) => types[i] === 'pdf');
    const skipped = picked.length - pdfs.length;
    setNotice(
      skipped
        ? `${skipped} file${skipped === 1 ? ' was' : 's were'} skipped because ${skipped === 1 ? "it isn't a PDF" : "they aren't PDFs"}.`
        : null,
    );
    if (!pdfs.length) return;
    const fresh: MergeEntry[] = pdfs.map(({ file }) => ({ id: nextId++, file }));
    setEntries((prev) => [...prev, ...fresh]);

    // Page counts and covers come from the same pdf.js open, one file at a time so a batch of
    // large scans doesn't spike memory.
    const { pdfPreview } = await import('../engine/pdf/preview');
    for (const entry of fresh) {
      try {
        const { png, pageCount } = await pdfPreview(entry.file, 18);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  thumb: png,
                  pageCount,
                  detail: `${pageCount} page${pageCount === 1 ? '' : 's'}`,
                }
              : e,
          ),
        );
      } catch {
        // Locked or damaged: leave the placeholder. Merging will report it by name.
      }
    }
  }, []);

  const merge = async () => {
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setError(null);
    setBusy('Merging… 0%');
    let finished = false;
    try {
      const result = await mergeInWorker(
        entries.map((e) => e.file),
        { stripMetadata, title: safeName(name) },
        // A trailing progress message can arrive after the result resolves, which would put
        // the button back into its busy state for good.
        (p) => !finished && setBusy(`Merging… ${Math.round(p * 100)}%`),
        signal,
      );
      downloadBlob(result.blob, `${safeName(name)}.pdf`);
      setNotice(
        `${result.pageCount} page${result.pageCount === 1 ? '' : 's'} · ${formatBytes(result.outputBytes)}. ${result.warnings.join(' ')}`.trim(),
      );
    } catch (err) {
      if (signal.aborted) return;
      setError(
        isUserFacing(err) ? err.message : 'Something went wrong while merging. You can try again.',
      );
      if (!isUserFacing(err)) console.error(err);
    } finally {
      finished = true;
      setBusy(null);
    }
  };

  const pages = entries.reduce((n, e) => n + (e.pageCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <DropZone
        onFiles={(f) => void add(f)}
        accept="application/pdf,.pdf"
        compact={entries.length > 0}
        hint="Two or more PDFs. They are joined in the order shown below."
      />

      {notice && (
        <p
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <>
          <OrderedList
            entries={entries}
            onChange={setEntries}
            label="PDFs to merge"
            testId="merge-list"
            placeholder={<span className="text-xs font-bold">PDF</span>}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={stripMetadata}
                  onChange={(e) => setStripMetadata(e.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                Remove hidden details like author and producer (recommended)
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor={nameId} className="text-sm">
                  File name
                </label>
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <span className="text-sm text-slate-500">.pdf</span>
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
                disabled={!!busy || entries.length < 2}
                onClick={() => void merge()}
                className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
                aria-live="polite"
              >
                <DownloadIcon className="h-4 w-4" />
                {busy ??
                  (entries.length < 2
                    ? 'Add one more PDF'
                    : `Merge ${entries.length} PDFs${pages ? ` · ${pages} pages` : ''}`)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

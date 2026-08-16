import { useCallback, useId, useRef, useState } from 'react';
import { imagesToPdfInWorker } from '../engine/pool';
import { engineFor, sniffFile } from '../engine/router';
import type { ImagesToPdfOptions } from '../engine/types';
import { isUserFacing } from '../engine/types';
import { downloadBlob } from '../lib/download';
import type { PickedFile } from '../lib/files';
import { formatBytes } from '../lib/format';
import DropZone from './DropZone';
import OrderedList, { type OrderedEntry } from './OrderedList';
import { AlertIcon, DownloadIcon, ImageIcon } from './icons';

/** Browsers can show these directly, so the row thumbnail is the file itself. */
const BROWSER_VIEWABLE = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp']);

const PAGE_SIZES: readonly { id: ImagesToPdfOptions['pageSize']; label: string }[] = [
  { id: 'fit', label: 'Fit each image' },
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'US Letter' },
];

let nextId = 0;

const safeName = (name: string) => (name.trim() || 'images').replace(/[\\/:*?"<>|]+/g, '-');

export default function JpgToPdfTool() {
  const [entries, setEntries] = useState<OrderedEntry[]>([]);
  const [name, setName] = useState('images');
  const [pageSize, setPageSize] = useState<ImagesToPdfOptions['pageSize']>('fit');
  const [margin, setMargin] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const nameId = useId();
  const sizeId = useId();

  const add = useCallback(async (picked: PickedFile[]) => {
    const typed = await Promise.all(
      picked.map(async (p) => ({ file: p.file, type: await sniffFile(p.file).catch(() => null) })),
    );
    const images = typed.filter((t) => !!t.type && engineFor(t.type) === 'image');
    const skipped = typed.length - images.length;
    setNotice(
      skipped
        ? `${skipped} file${skipped === 1 ? ' was' : 's were'} skipped because ${skipped === 1 ? "it isn't an image" : "they aren't images"}.`
        : null,
    );
    if (!images.length) return;
    setEntries((prev) => [
      ...prev,
      ...images.map(({ file, type }) => ({
        id: nextId++,
        file,
        // HEIC has no browser preview; those rows keep the placeholder icon.
        thumb: type && BROWSER_VIEWABLE.has(type) ? file : null,
      })),
    ]);
  }, []);

  const build = async () => {
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setError(null);
    setBusy('Building… 0%');
    let finished = false;
    try {
      const result = await imagesToPdfInWorker(
        entries.map((e) => e.file),
        {
          stripMetadata: true,
          title: safeName(name),
          pageSize,
          margin: margin && pageSize !== 'fit' ? 36 : 0,
          quality: 85,
        },
        // A trailing progress message can arrive after the result resolves, which would put
        // the button back into its busy state for good.
        (p) => !finished && setBusy(`Building… ${Math.round(p * 100)}%`),
        signal,
      );
      downloadBlob(result.blob, `${safeName(name)}.pdf`);
      setNotice(
        `${result.pageCount} page${result.pageCount === 1 ? '' : 's'} · ${formatBytes(result.outputBytes)}. ${result.warnings.join(' ')}`.trim(),
      );
    } catch (err) {
      if (signal.aborted) return;
      setError(
        isUserFacing(err)
          ? err.message
          : 'Something went wrong while building the PDF. You can try again.',
      );
      if (!isUserFacing(err)) console.error(err);
    } finally {
      finished = true;
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DropZone
        onFiles={(f) => void add(f)}
        accept="image/*,.heic,.heif,.avif"
        compact={entries.length > 0}
        hint="JPG, PNG, WebP, AVIF, HEIC. One page per image, in the order shown below."
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
            label="Images to put in the PDF"
            testId="images-list"
            placeholder={<ImageIcon className="h-5 w-5" />}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={sizeId} className="text-sm">
                  Page size
                </label>
                <select
                  id={sizeId}
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as ImagesToPdfOptions['pageSize'])}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {pageSize !== 'fit' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={margin}
                      onChange={(e) => setMargin(e.target.checked)}
                      className="h-4 w-4 accent-sky-600"
                    />
                    Add a margin
                  </label>
                )}
              </div>
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
                disabled={!!busy}
                onClick={() => void build()}
                className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
                aria-live="polite"
              >
                <DownloadIcon className="h-4 w-4" />
                {busy ?? `Create PDF · ${entries.length} page${entries.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

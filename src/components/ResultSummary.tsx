import { useRef, useState } from 'react';
import { createZip } from '../engine/archive/zip';
import { downloadBlob } from '../lib/download';
import { formatBytes, percentSaved } from '../lib/format';
import AdSlot from './AdSlot';
import AffiliateLine from './AffiliateLine';
import SupportButton from './SupportButton';
import { CheckIcon, DownloadIcon } from './icons';
import type { Item } from './useCompressor';

interface Props {
  items: Item[];
  onClear: () => void;
  nameFor: (item: Item) => string;
  /** Name for the "download all" archive. */
  zipName?: string;
}

/** Keeps folder structure from folder drops: "trip/day1/a.jpg" → "trip/day1/a-compressed.jpg". */
export const zipPath = (item: Item, name: string) => {
  const slash = item.path.lastIndexOf('/');
  return `${slash >= 0 ? item.path.slice(0, slash + 1) : ''}${name}`;
};

export default function ResultSummary({
  items,
  onClear,
  nameFor,
  zipName = 'compressed-files.zip',
}: Props) {
  const [zipping, setZipping] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const done = items.filter((i) => i.status === 'done' && i.result);
  const working = items.some((i) => ['detecting', 'queued', 'processing'].includes(i.status));
  if (!done.length && !working) {
    return items.length ? (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-400"
        >
          Clear all
        </button>
      </div>
    ) : null;
  }

  const compressible = items.filter((i) => i.engine && i.engine !== 'archive').length;
  const before = done.reduce((n, i) => n + i.result!.originalBytes, 0);
  const after = done.reduce((n, i) => n + i.result!.outputBytes, 0);
  const saved = Math.max(0, before - after);
  const pct = percentSaved(before, after);

  const downloadAll = async () => {
    if (done.length === 1) {
      return downloadBlob(done[0]!.result!.blob, nameFor(done[0]!));
    }
    abort.current = new AbortController();
    setZipping(0);
    try {
      const zip = await createZip(
        done.map((i) => ({
          name: zipPath(i, nameFor(i)),
          blob: i.result!.blob,
          lastModified: i.file.lastModified,
        })),
        (p) => setZipping(p),
        abort.current.signal,
      );
      downloadBlob(zip, zipName);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) console.error(err);
    } finally {
      setZipping(null);
    }
  };

  return (
    <section
      aria-label="Results"
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-600 p-2 text-white">
            <CheckIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold" data-testid="saved-summary">
              {done.length === 0
                ? 'Compressing…'
                : saved > 0
                  ? `You saved ${formatBytes(saved)} (${pct}%)`
                  : 'Your files were already well optimized'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {done.length} of {compressible} file{compressible === 1 ? '' : 's'} done
              {done.length > 0 && ` · ${formatBytes(before)} → ${formatBytes(after)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {done.length > 0 && (
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={zipping !== null}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-70"
            >
              <DownloadIcon className="h-4 w-4" />
              {zipping !== null
                ? `Zipping… ${Math.round(zipping * 100)}%`
                : done.length === 1
                  ? 'Download'
                  : `Download all (${done.length}) as ZIP`}
            </button>
          )}
          {zipping !== null && (
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
            onClick={onClear}
            className="rounded-full px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Clear all
          </button>
        </div>
      </div>
      {done.length > 0 && !working && (
        <div className="mt-4 flex justify-center">
          <SupportButton />
        </div>
      )}
      {done.length > 0 && !working && <AffiliateLine />}
      <AdSlot slot="results" />
    </section>
  );
}

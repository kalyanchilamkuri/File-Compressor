import { memo, useEffect, useState } from 'react';
import { TYPE_LABEL } from '../engine/router';
import { downloadBlob } from '../lib/download';
import { formatBytes, formatDuration, percentSaved } from '../lib/format';
import {
  AlertIcon,
  ArchiveIcon,
  CompareIcon,
  DownloadIcon,
  FileIcon,
  MusicIcon,
  RetryIcon,
  SparkIcon,
  VideoIcon,
  XIcon,
} from './icons';
import type { Item } from './useCompressor';
import { useObjectUrl } from './useObjectUrl';

interface Props {
  item: Item;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string, extra?: Item['extra']) => void;
  onCompare: (item: Item) => void;
  onOpenArchive: (item: Item) => void;
  nameFor: (item: Item) => string;
}

const BROWSER_VIEWABLE = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp']);

/** First-page thumbnail for PDFs; pdf.js loads only once a PDF is added. */
function usePdfThumb(item: Item) {
  const [thumb, setThumb] = useState<{ file: File; blob: Blob } | null>(null);
  useEffect(() => {
    if (item.engine !== 'pdf') return;
    let cancelled = false;
    void import('../engine/pdf/preview')
      .then(({ firstPagePng }) => firstPagePng(item.file, 18))
      .then((blob) => !cancelled && setThumb({ file: item.file, blob }))
      .catch(() => {
        // Locked or damaged PDFs just keep the "PDF" badge.
      });
    return () => {
      cancelled = true;
    };
  }, [item.engine, item.file]);
  return thumb?.file === item.file ? thumb.blob : null;
}

function Thumb({ item }: { item: Item }) {
  const pdfThumb = usePdfThumb(item);
  const source =
    item.engine === 'image'
      ? item.type && BROWSER_VIEWABLE.has(item.type)
        ? item.file
        : item.result?.blob
      : pdfThumb;
  const url = useObjectUrl(source);
  const box =
    'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  if (url) {
    return (
      <div className={box}>
        <img
          src={url}
          alt=""
          className={`h-full w-full ${item.engine === 'pdf' ? 'bg-white object-contain' : 'object-cover'}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  const Icon =
    item.engine === 'video'
      ? VideoIcon
      : item.engine === 'audio'
        ? MusicIcon
        : item.engine === 'archive'
          ? ArchiveIcon
          : FileIcon;
  return (
    <div className={box}>
      {item.engine === 'pdf' ? (
        <span className="text-xs font-bold">PDF</span>
      ) : (
        <Icon className="h-6 w-6" />
      )}
    </div>
  );
}

const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500 dark:text-slate-300 dark:hover:bg-slate-800';

function eta(item: Item): string {
  if (!item.startedAt || item.progress < 0.05 || item.progress >= 1) return '';
  const elapsed = (Date.now() - item.startedAt) / 1000;
  if (elapsed < 3) return '';
  const left = (elapsed * (1 - item.progress)) / item.progress;
  return `about ${formatDuration(left)} left`;
}

function FileRow({ item, onRemove, onCancel, onRetry, onCompare, onOpenArchive, nameFor }: Props) {
  const r = item.result;
  const busy =
    item.status === 'queued' || item.status === 'processing' || item.status === 'detecting';
  const saved = r ? percentSaved(r.originalBytes, r.outputBytes) : 0;
  const pct = Math.round(item.progress * 100);
  const canCompare = r && !r.keptOriginal && (item.engine === 'image' || item.engine === 'pdf');
  const canPreview = r && (item.engine === 'video' || item.engine === 'audio');

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-4 dark:border-slate-800 dark:bg-slate-900"
      data-testid="file-row"
      data-status={item.status}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Thumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={item.path}>
            {item.file.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600 dark:text-slate-400">
            {item.type && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-slate-800">
                {TYPE_LABEL[item.type]}
              </span>
            )}
            {r ? (
              <>
                <span>
                  {formatBytes(r.originalBytes)} →{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {formatBytes(r.outputBytes)}
                  </strong>
                </span>
                {r.keptOriginal && r.outputBytes >= r.originalBytes ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Already optimized
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.outputBytes < r.originalBytes
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {saved > 0
                      ? `−${saved}%`
                      : r.outputBytes < r.originalBytes
                        ? '−<1%'
                        : `+${Math.max(1, -saved)}%`}
                  </span>
                )}
              </>
            ) : (
              <span>{formatBytes(item.file.size)}</span>
            )}
            {item.status === 'detecting' && <span>Checking…</span>}
            {item.status === 'queued' && <span>Waiting…</span>}
            {item.status === 'processing' && (
              <span>
                {pct}% {eta(item)}
              </span>
            )}
          </div>

          {item.status === 'processing' && (
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-label={`Compressing ${item.file.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full rounded-full bg-sky-700 transition-[width] duration-200"
                style={{ width: `${Math.max(3, pct)}%` }}
              />
            </div>
          )}
          {(item.status === 'error' || item.status === 'unsupported') && item.error && (
            <p
              className="mt-1 flex items-start gap-1.5 text-sm text-red-700 dark:text-red-400"
              role="alert"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {item.error}
            </p>
          )}
          {r?.warnings.map((w) => (
            <p key={w} className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {w}
            </p>
          ))}
          {r?.suggestion && item.extra?.imageFormat !== 'webp' && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-sky-800 dark:text-sky-300">
              <SparkIcon className="h-4 w-4" />
              Convert to WebP to save about {r.suggestion.savePercent}% more.
              <button
                type="button"
                className="font-semibold underline underline-offset-2 hover:no-underline"
                onClick={() => onRetry(item.id, { imageFormat: 'webp' })}
              >
                Convert
              </button>
            </p>
          )}
          {r?.suggestScanned && item.extra?.pdfMode !== 'scanned' && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-sky-800 dark:text-sky-300">
              <SparkIcon className="h-4 w-4" />
              This looks like a scanned document. “Scanned” mode can make it much smaller.
              <button
                type="button"
                className="font-semibold underline underline-offset-2 hover:no-underline"
                onClick={() => onRetry(item.id, { pdfMode: 'scanned' })}
              >
                Try it
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1">
        {item.status === 'archive' && (
          <button
            type="button"
            onClick={() => onOpenArchive(item)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Open archive
          </button>
        )}
        {(canCompare || canPreview) && (
          <button
            type="button"
            className={iconBtn}
            onClick={() => onCompare(item)}
            aria-label={`${canCompare ? 'Compare' : 'Preview'} ${item.file.name}`}
            title={canCompare ? 'Compare before and after' : 'Preview'}
          >
            <CompareIcon />
          </button>
        )}
        {r && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            onClick={() => downloadBlob(r.blob, nameFor(item))}
            aria-label={`Download ${nameFor(item)}`}
          >
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
        {item.status === 'error' && item.engine && item.engine !== 'archive' && (
          <button
            type="button"
            className={iconBtn}
            onClick={() => onRetry(item.id)}
            aria-label={`Retry ${item.file.name}`}
            title="Try again"
          >
            <RetryIcon />
          </button>
        )}
        {busy ? (
          <button
            type="button"
            className={iconBtn}
            onClick={() => onCancel(item.id)}
            aria-label={`Cancel ${item.file.name}`}
            title="Cancel"
          >
            <XIcon />
          </button>
        ) : (
          <button
            type="button"
            className={iconBtn}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.file.name}`}
            title="Remove"
          >
            <XIcon />
          </button>
        )}
      </div>
    </li>
  );
}

export default memo(FileRow);

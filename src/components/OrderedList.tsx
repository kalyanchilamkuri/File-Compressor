import type { ReactNode } from 'react';
import { formatBytes } from '../lib/format';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from './icons';
import { useObjectUrl } from './useObjectUrl';

export interface OrderedEntry {
  id: number;
  file: File;
  /** Row thumbnail, once it has been rendered. */
  thumb?: Blob | null;
  /** Second line under the name, e.g. "12 pages". */
  detail?: string;
}

interface Props<T extends OrderedEntry> {
  entries: T[];
  onChange: (next: T[]) => void;
  /** Accessible name of the section, e.g. "PDFs to merge". */
  label: string;
  testId: string;
  /** Shown in the thumbnail box until a thumbnail exists. */
  placeholder: ReactNode;
}

const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800';

function Row({
  entry,
  index,
  total,
  onMove,
  onRemove,
  placeholder,
}: {
  entry: OrderedEntry;
  index: number;
  total: number;
  onMove: (index: number, delta: number) => void;
  onRemove: (id: number) => void;
  placeholder: ReactNode;
}) {
  const url = useObjectUrl(entry.thumb);
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="w-5 shrink-0 text-right text-sm text-slate-500 tabular-nums">
        {index + 1}
      </span>
      <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {url ? (
          <img src={url} alt="" className="h-full w-full bg-white object-contain" loading="lazy" />
        ) : (
          placeholder
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={entry.file.name}>
          {entry.file.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {entry.detail ? `${entry.detail} · ` : ''}
          {formatBytes(entry.file.size)}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className={iconBtn}
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          aria-label={`Move ${entry.file.name} up`}
          title="Move up"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconBtn}
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          aria-label={`Move ${entry.file.name} down`}
          title="Move down"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => onRemove(entry.id)}
          aria-label={`Remove ${entry.file.name}`}
          title="Remove"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/**
 * A reorderable list of input files. Output order is exactly list order, so nothing is ever
 * silently rearranged. Up/down buttons rather than drag: they work from the keyboard as they are.
 */
export default function OrderedList<T extends OrderedEntry>({
  entries,
  onChange,
  label,
  testId,
  placeholder,
}: Props<T>) {
  const total = entries.reduce((n, e) => n + e.file.size, 0);

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    [next[index], next[to]] = [next[to]!, next[index]!];
    onChange(next);
  };

  // Folder drops arrive in filesystem order, so "scan-2" can land after "scan-10" without this.
  const sort = () =>
    onChange(
      [...entries].sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' }),
      ),
    );

  return (
    <section
      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
      aria-label={label}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {entries.length} file{entries.length === 1 ? '' : 's'} · {formatBytes(total)}
        </p>
        <div className="flex items-center gap-3 text-sm font-medium">
          <button type="button" onClick={sort} className="hover:underline">
            Sort A→Z
          </button>
          <button
            type="button"
            onClick={() => onChange([...entries].reverse())}
            className="hover:underline"
          >
            Reverse
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-slate-600 hover:underline dark:text-slate-400"
          >
            Clear all
          </button>
        </div>
      </div>
      <ul
        className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800"
        data-testid={testId}
      >
        {entries.map((entry, i) => (
          <Row
            key={entry.id}
            entry={entry}
            index={i}
            total={entries.length}
            onMove={move}
            onRemove={(id) => onChange(entries.filter((e) => e.id !== id))}
            placeholder={placeholder}
          />
        ))}
      </ul>
    </section>
  );
}

import { useId, type KeyboardEvent } from 'react';
import type { UserOverrides } from '../config/presets';
import type { Settings } from './useCompressor';

type Target = NonNullable<Exclude<UserOverrides['imageFormat'], 'keep'>>;

const FORMATS: readonly { id: Target; label: string; hint: string }[] = [
  { id: 'jpeg', label: 'JPG', hint: 'Opens everywhere. Best for photos.' },
  { id: 'png', label: 'PNG', hint: 'Lossless, keeps transparency.' },
  { id: 'webp', label: 'WebP', hint: 'Much smaller than JPG at the same quality.' },
  { id: 'avif', label: 'AVIF', hint: 'Smallest, but slower and newer.' },
];

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

/**
 * The output format, front and centre on conversion pages. It writes the same
 * `overrides.imageFormat` as the Format select in More options, so the two stay in sync.
 */
export default function FormatPicker({ settings, onChange }: Props) {
  const labelId = useId();
  const current = settings.overrides.imageFormat;

  const select = (id: Target) =>
    onChange({ ...settings, overrides: { ...settings.overrides, imageFormat: id } });

  /** Arrow keys move between formats, as in a native radio group. */
  const onArrow = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = (
      { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>
    )[e.key];
    if (!step) return;
    e.preventDefault();
    const i = FORMATS.findIndex((f) => f.id === current);
    const next = FORMATS[(Math.max(0, i) + step + FORMATS.length) % FORMATS.length]!;
    select(next.id);
    e.currentTarget.parentElement
      ?.querySelector<HTMLElement>(`[data-format="${next.id}"]`)
      ?.focus();
  };

  return (
    <div>
      <p id={labelId} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Convert to
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {FORMATS.map((f) => {
          const checked = current === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-format={f.id}
              onKeyDown={onArrow}
              title={f.hint}
              onClick={() => select(f.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                checked
                  ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500'
              }`}
            >
              {f.label}
              <span className="sr-only">{`, ${f.hint}`}</span>
            </button>
          );
        })}
      </div>
      {current === 'png' && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          PNG is lossless, so the quality slider does nothing and photos usually come out larger
          than the original.
        </p>
      )}
    </div>
  );
}

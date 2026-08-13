import { useId, useState, type KeyboardEvent } from 'react';
import { PRESETS, presetById, type CompressibleEngine, type PresetId } from '../config/presets';
import { formatBytes, parseSize } from '../lib/format';
import type { Settings } from './useCompressor';

const ENGINE_NAMES: Record<CompressibleEngine, string> = {
  image: 'images',
  pdf: 'PDFs',
  video: 'videos',
  audio: 'audio',
};

const list = (engines: readonly CompressibleEngine[]) => {
  const names = engines.map((e) => ENGINE_NAMES[e]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  /** Engines of the files currently added; presets that fit none of them are disabled. */
  engines: readonly CompressibleEngine[];
}

export default function GoalPicker({ settings, onChange, engines }: Props) {
  const labelId = useId();
  const customId = useId();
  const [unit, setUnit] = useState<'KB' | 'MB'>('KB');
  const [text, setText] = useState('');
  // When the target changes from outside (e.g. saved settings load), show it in the input.
  const [shownBytes, setShownBytes] = useState<number | null>(null);
  const bytes = settings.customTargetBytes;
  if (bytes !== shownBytes) {
    setShownBytes(bytes);
    if (bytes) {
      const u = bytes >= 1024 * 1024 ? 'MB' : 'KB';
      setUnit(u);
      setText(String(+(bytes / (u === 'MB' ? 1024 * 1024 : 1024)).toFixed(2)));
    }
  }

  const select = (id: PresetId) => onChange({ ...settings, presetId: id });

  /** Arrow keys move between goals, as in a native radio group. */
  const onArrow = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = (
      { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>
    )[e.key];
    if (!step) return;
    e.preventDefault();
    const usable = PRESETS.filter(
      (p) => engines.length === 0 || engines.some((x) => p.appliesTo.includes(x)),
    );
    const i = usable.findIndex((p) => p.id === settings.presetId);
    const next = usable[(i + step + usable.length) % usable.length]!;
    select(next.id);
    e.currentTarget.parentElement
      ?.querySelector<HTMLElement>(`[data-preset="${next.id}"]`)
      ?.focus();
  };
  const active = presetById(settings.presetId);
  const partial =
    engines.length > 0 && engines.some((e) => !active.appliesTo.includes(e))
      ? `${active.label} applies to ${list(active.appliesTo)}; other files use Balanced.`
      : null;

  const commitCustom = (value: string, u: 'KB' | 'MB') => {
    const bytes = parseSize(value, u);
    onChange({ ...settings, presetId: 'custom', customTargetBytes: bytes });
  };

  return (
    <div>
      <p id={labelId} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        Goal
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const usable = engines.length === 0 || engines.some((e) => p.appliesTo.includes(e));
          const checked = settings.presetId === p.id;
          const tip = usable ? p.hint : `Only for ${list(p.appliesTo)}`;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={!usable}
              tabIndex={checked ? 0 : -1}
              data-preset={p.id}
              onKeyDown={onArrow}
              title={tip}
              onClick={() => usable && select(p.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                checked
                  ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950'
                  : usable
                    ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600'
              }`}
            >
              {p.label}
              <span className="sr-only">{`, ${tip}`}</span>
            </button>
          );
        })}
      </div>

      {settings.presetId === 'custom' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={customId} className="text-sm text-slate-700 dark:text-slate-300">
            Make each file smaller than
          </label>
          <input
            id={customId}
            inputMode="decimal"
            placeholder="e.g. 150"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => commitCustom(text, unit)}
            onKeyDown={(e) => e.key === 'Enter' && commitCustom(text, unit)}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <select
            aria-label="Unit"
            value={unit}
            onChange={(e) => {
              const u = e.target.value as 'KB' | 'MB';
              setUnit(u);
              if (text) commitCustom(text, u);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option>KB</option>
            <option>MB</option>
          </select>
          {settings.customTargetBytes ? (
            <span className="text-sm text-slate-500">
              = {formatBytes(settings.customTargetBytes)}
            </span>
          ) : (
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Enter a size to use it.
            </span>
          )}
        </div>
      )}
      {partial && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{partial}</p>}
    </div>
  );
}

import { useId, useState } from 'react';
import { usePro } from '../lib/license';
import { DEFAULT_PATTERN } from '../lib/rename';
import type { Settings } from './useCompressor';

const KEY = 'squish:saved-presets:v1';

interface Saved {
  name: string;
  settings: Settings;
}

function load(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Saved[];
  } catch {
    return [];
  }
}

function store(list: Saved[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Not persisted.
  }
}

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

/** Pro-only: saved presets and a rename pattern. Renders nothing for everyone else. */
export default function ProTools({ settings, onChange }: Props) {
  const pro = usePro();
  // Only rendered for Pro users, which is never during server rendering, so reading storage here is safe.
  const [saved, setSaved] = useState<Saved[]>(() => (typeof window === 'undefined' ? [] : load()));
  const [naming, setNaming] = useState<string | null>(null);
  const patternId = useId();

  if (!pro) return null;

  const save = () => {
    const name = naming?.trim();
    if (!name) return;
    const next = [...saved.filter((s) => s.name !== name), { name, settings }];
    setSaved(next);
    store(next);
    setNaming(null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-700 dark:text-slate-300">My presets</span>
        {saved.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600"
          >
            <button type="button" className="px-3 py-1" onClick={() => onChange(s.settings)}>
              {s.name}
            </button>
            <button
              type="button"
              aria-label={`Delete preset ${s.name}`}
              className="pr-2 text-slate-400 hover:text-slate-700"
              onClick={() => {
                const next = saved.filter((x) => x.name !== s.name);
                setSaved(next);
                store(next);
              }}
            >
              ×
            </button>
          </span>
        ))}
        {naming === null ? (
          <button
            type="button"
            className="rounded-full px-3 py-1 text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
            onClick={() => setNaming('')}
          >
            + Save current settings
          </button>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              aria-label="Preset name"
              value={naming}
              onChange={(e) => setNaming(e.target.value)}
              placeholder="Preset name"
              className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
            />
            <button type="submit" className="font-medium text-sky-700 dark:text-sky-400">
              Save
            </button>
            <button type="button" onClick={() => setNaming(null)}>
              Cancel
            </button>
          </form>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={patternId} className="font-medium text-slate-700 dark:text-slate-300">
          File names
        </label>
        <input
          id={patternId}
          value={settings.renamePattern ?? DEFAULT_PATTERN}
          onChange={(e) => onChange({ ...settings, renamePattern: e.target.value })}
          className="w-48 rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono dark:border-slate-600 dark:bg-slate-900"
        />
        <span className="text-slate-500">
          Use <code>{'{name}'}</code> and <code>{'{n}'}</code>
        </span>
      </div>
    </div>
  );
}

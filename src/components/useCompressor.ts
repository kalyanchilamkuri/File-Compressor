import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PRESET,
  presetById,
  resolveOptions,
  type CompressibleEngine,
  type PresetId,
  type UserOverrides,
} from '../config/presets';
import { AbortError, runInWorker } from '../engine/pool';
import { JobQueue, defaultLaneLimit } from '../engine/queue';
import { engineFor, sniffFile } from '../engine/router';
import type { CompressOptions, CompressResult, DetectedType, EngineId } from '../engine/types';
import { isUserFacing } from '../engine/types';
import { detectCapabilities, missingFor } from '../lib/capabilities';
import type { PickedFile } from '../lib/files';
import { clearTempFiles, deleteTempFile } from '../lib/opfs';

export type ItemStatus =
  'detecting' | 'queued' | 'processing' | 'done' | 'error' | 'unsupported' | 'archive';

export interface ItemResult extends CompressResult {
  suggestion?: { format: 'webp'; savePercent: number };
  suggestScanned?: boolean;
  tempName?: string;
}

export interface Item {
  id: string;
  file: File;
  path: string;
  type: DetectedType | null;
  engine: EngineId | null;
  status: ItemStatus;
  progress: number;
  startedAt?: number;
  error?: string;
  result?: ItemResult;
  /** Options this result was produced with, to spot results made with old settings. */
  optionsKey?: string;
  /** Per-file override, e.g. from "Convert to WebP" or "Use Scanned mode". */
  extra?: Partial<CompressOptions>;
}

export interface Settings {
  presetId: PresetId;
  customTargetBytes: number | null;
  overrides: UserOverrides;
  /** Pro: download name pattern, e.g. "{name}-web". */
  renamePattern?: string;
}

const STORAGE_KEY = 'shrinkly:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  presetId: DEFAULT_PRESET,
  customTargetBytes: null,
  overrides: { stripMetadata: true },
};

function loadSettings(
  initialPreset?: PresetId,
  initialOverrides?: Partial<UserOverrides>,
): Settings {
  // Landing pages preselect their own goal instead of whatever the visitor used last time.
  if (initialPreset || initialOverrides) {
    return {
      ...DEFAULT_SETTINGS,
      presetId: initialPreset ?? DEFAULT_PRESET,
      overrides: { ...DEFAULT_SETTINGS.overrides, ...initialOverrides },
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Settings;
      if (presetById(parsed.presetId)) return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Storage blocked or corrupt: use defaults.
  }
  return DEFAULT_SETTINGS;
}

let counter = 0;
const newId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

export function optionsFor(item: Item, settings: Settings): CompressOptions {
  const base = resolveOptions(
    item.engine as CompressibleEngine,
    settings.presetId,
    settings.customTargetBytes,
    settings.overrides,
  );
  return { ...base, ...item.extra };
}

export function useCompressor(initialPreset?: PresetId, initialOverrides?: Partial<UserOverrides>) {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [announcement, setAnnouncement] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  // Latest values for callbacks that run later (queued jobs, event handlers).
  const itemsRef = useRef(items);
  const settingsRef = useRef(settings);
  useEffect(() => {
    itemsRef.current = items;
    settingsRef.current = settings;
  });
  const queue = useMemo(() => new JobQueue((lane) => defaultLaneLimit(lane)), []);
  const caps = useMemo(() => (typeof window === 'undefined' ? null : detectCapabilities()), []);

  const overridesKey = JSON.stringify(initialOverrides ?? null);
  useEffect(() => {
    // Saved settings live in localStorage, which the server render can't see; loading them after
    // hydration keeps the first client render identical to the HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(loadSettings(initialPreset, JSON.parse(overridesKey) ?? undefined));
    void clearTempFiles();
    return () => queue.cancelAll();
  }, [initialPreset, overridesKey, queue]);

  const setSettings = useCallback((next: Settings) => {
    settingsRef.current = next;
    setSettingsState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not persisted; still applies for this visit.
    }
  }, []);

  const patch = useCallback((id: string, changes: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }, []);

  const start = useCallback(
    (item: Item) => {
      if (!item.engine || item.engine === 'archive') return;
      const missing = caps ? missingFor(item.engine, caps) : null;
      if (missing) {
        patch(item.id, { status: 'error', error: missing });
        return;
      }
      const options = optionsFor(item, settingsRef.current);
      const optionsKey = JSON.stringify(options);
      patch(item.id, { status: 'queued', progress: 0, error: undefined, optionsKey });
      queue.add({
        id: item.id,
        lane: item.engine,
        run: async (signal) => {
          patch(item.id, { status: 'processing', startedAt: Date.now() });
          let lastTick = 0;
          try {
            const result = (await runInWorker(
              item.engine!,
              item.file,
              item.type!,
              options,
              (p) => {
                const now = performance.now();
                // Progress arrives very often; re-rendering on each one would waste frames.
                if (now - lastTick < 100 && p < 1) return;
                lastTick = now;
                patch(item.id, { progress: p });
              },
              signal,
            )) as ItemResult;
            const old = itemsRef.current.find((i) => i.id === item.id)?.result?.tempName;
            if (old && old !== result.tempName) void deleteTempFile(old);
            patch(item.id, { status: 'done', progress: 1, result });
            const saved = result.originalBytes - result.outputBytes;
            setAnnouncement(
              result.keptOriginal
                ? `${item.file.name} is already optimized.`
                : `${item.file.name} compressed, ${Math.max(0, Math.round((saved / result.originalBytes) * 100))} percent smaller.`,
            );
          } catch (err) {
            if (err instanceof AbortError) return;
            const message = isUserFacing(err)
              ? err.message
              : 'Something went wrong with this file. You can try again.';
            if (!isUserFacing(err)) console.error(err);
            patch(item.id, { status: 'error', error: message });
            setAnnouncement(`${item.file.name} could not be compressed.`);
          }
        },
      });
    },
    [caps, patch, queue],
  );

  const addFiles = useCallback(
    async (picked: PickedFile[], { skipUnsupported = false } = {}) => {
      if (skipUnsupported) {
        const typed = await Promise.all(picked.map((p) => sniffFile(p.file).catch(() => null)));
        const kept = picked.filter((_, i) => {
          const t = typed[i];
          return t && engineFor(t) !== 'archive';
        });
        const skipped = picked.length - kept.length;
        setNotice(
          skipped
            ? `${skipped} file${skipped === 1 ? ' was' : 's were'} skipped because ${skipped === 1 ? 'it isn’t' : 'they aren’t'} an image, PDF, video or audio file.`
            : null,
        );
        picked = kept;
      }
      if (!picked.length) return;
      const fresh: Item[] = picked.map(({ file, path }) => ({
        id: newId(),
        file,
        path,
        type: null,
        engine: null,
        status: 'detecting',
        progress: 0,
      }));
      setItems((prev) => [...prev, ...fresh]);
      setAnnouncement(`${fresh.length} file${fresh.length === 1 ? '' : 's'} added.`);
      for (const item of fresh) {
        const type = await sniffFile(item.file).catch(() => null);
        if (!type) {
          patch(item.id, {
            status: 'unsupported',
            error: 'This file type isn’t supported. Try images, PDFs, videos, audio, or archives.',
          });
          continue;
        }
        const engine = engineFor(type);
        const next: Item = {
          ...item,
          type,
          engine,
          status: engine === 'archive' ? 'archive' : 'queued',
        };
        patch(item.id, { type, engine, status: next.status });
        start(next);
      }
    },
    [patch, start],
  );

  const remove = useCallback(
    (id: string) => {
      queue.cancel(id);
      const item = itemsRef.current.find((i) => i.id === id);
      if (item?.result?.tempName) void deleteTempFile(item.result.tempName);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [queue],
  );

  const cancel = useCallback(
    (id: string) => {
      if (queue.cancel(id)) patch(id, { status: 'error', error: 'Cancelled.', progress: 0 });
    },
    [patch, queue],
  );

  const retry = useCallback(
    (id: string, extra?: Partial<CompressOptions>) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item) return;
      const next = extra ? { ...item, extra: { ...item.extra, ...extra } } : item;
      if (extra) patch(id, { extra: next.extra });
      start(next);
    },
    [patch, start],
  );

  const clear = useCallback(() => {
    queue.cancelAll();
    for (const item of itemsRef.current) {
      if (item.result?.tempName) void deleteTempFile(item.result.tempName);
    }
    setItems([]);
  }, [queue]);

  /** Items whose result was made with different settings than the current ones. */
  const stale = items.filter(
    (i) =>
      (i.status === 'done' || i.status === 'error') &&
      i.engine &&
      i.engine !== 'archive' &&
      i.optionsKey !== undefined &&
      i.optionsKey !== JSON.stringify(optionsFor(i, settings)),
  );

  const reapply = useCallback(() => {
    for (const item of stale) start(item);
  }, [stale, start]);

  return {
    items,
    settings,
    setSettings,
    addFiles,
    remove,
    cancel,
    retry,
    clear,
    stale,
    reapply,
    announcement,
    notice,
    dismissNotice: () => setNotice(null),
    caps,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CompressibleEngine, PresetId, UserOverrides } from '../config/presets';
import type { EngineId } from '../engine/types';
import { convertedName, extensionOf } from '../lib/format';
import { revalidateIfDue, usePro } from '../lib/license';
import { applyPattern } from '../lib/rename';
import AdSlot from './AdSlot';
import AdvancedOptions from './AdvancedOptions';
import ArchivePanel, { archiveKey } from './ArchivePanel';
import CompareSlider from './CompareSlider';
import DropZone from './DropZone';
import FileList from './FileList';
import FormatPicker from './FormatPicker';
import GoalPicker from './GoalPicker';
import ProTools from './ProTools';
import ResultSummary from './ResultSummary';
import { XIcon } from './icons';
import { useCompressor, type Item } from './useCompressor';

interface Props {
  /** Preselects a goal, e.g. on "compress image to 100 KB" landing pages. */
  preset?: PresetId;
  /** Narrows the file picker and options to one kind of file on dedicated pages. */
  focus?: EngineId;
  /** Preselected options, e.g. WebP output on the "PNG to WebP" page. */
  overrides?: Partial<UserOverrides>;
  /**
   * "convert" swaps the size-goal chips for a format picker and names outputs after the original
   * ("photo.webp", not "photo-compressed.webp"). The engine is the same either way.
   */
  mode?: 'compress' | 'convert';
}

const ACCEPT: Partial<Record<EngineId, string>> = {
  image: 'image/*,.heic,.heif,.avif',
  pdf: 'application/pdf,.pdf',
  video: 'video/*,.mkv,.mov',
  audio: 'audio/*,.m4a,.flac,.opus',
};

const HINT: Partial<Record<EngineId, string>> = {
  image: 'JPEG, PNG, WebP, AVIF, HEIC and GIF. Or paste with Ctrl+V.',
  pdf: 'Any PDF. Text stays selectable in Smart mode.',
  video: 'MP4, MOV, WebM and MKV.',
  audio: 'MP3, WAV, M4A, AAC, OGG, Opus and FLAC.',
};

export default function Compressor({ preset, focus, overrides, mode = 'compress' }: Props) {
  const converting = mode === 'convert';
  const c = useCompressor(preset, overrides);
  const [comparing, setComparing] = useState<Item | null>(null);
  const [archive, setArchive] = useState<File | null>(null);

  useEffect(() => {
    void revalidateIfDue();
  }, []);

  const engines = useMemo(() => {
    const set = new Set<CompressibleEngine>();
    for (const i of c.items) if (i.engine && i.engine !== 'archive') set.add(i.engine);
    if (!set.size && focus && focus !== 'archive') set.add(focus);
    return [...set];
  }, [c.items, focus]);

  const onOpenArchive = useCallback((item: Item) => setArchive(item.file), []);
  const pro = usePro();
  const pattern = pro ? c.settings.renamePattern : undefined;
  const items = c.items;
  const nameFor = useCallback(
    (item: Item) => {
      const produced = item.result!.fileName;
      // The engine always appends "-compressed"; converting just wants the new extension.
      const name = converting ? convertedName(item.file.name, extensionOf(produced)) : produced;
      return pattern ? applyPattern(pattern, item.file.name, name, items.indexOf(item) + 1) : name;
    },
    [converting, pattern, items],
  );
  const processing = c.items.some((i) => i.status === 'processing');

  return (
    <div className="flex flex-col gap-5">
      <DropZone
        onFiles={(f) => void c.addFiles(f)}
        accept={focus ? ACCEPT[focus] : undefined}
        hint={focus ? HINT[focus] : undefined}
        compact={c.items.length > 0}
      />

      {converting ? (
        <FormatPicker settings={c.settings} onChange={c.setSettings} />
      ) : (
        <GoalPicker settings={c.settings} onChange={c.setSettings} engines={engines} />
      )}
      <AdvancedOptions settings={c.settings} onChange={c.setSettings} engines={engines} />
      <ProTools settings={c.settings} onChange={c.setSettings} />

      {c.stale.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/40">
          <span>
            Settings changed. Apply them to {c.stale.length} file{c.stale.length === 1 ? '' : 's'}?
          </span>
          <button
            type="button"
            onClick={c.reapply}
            className="rounded-full bg-sky-700 px-4 py-1.5 font-medium text-white hover:bg-sky-800"
          >
            Recompress
          </button>
        </div>
      )}

      {c.notice && (
        <div
          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          role="status"
        >
          <span>{c.notice}</span>
          <button
            type="button"
            onClick={c.dismissNotice}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <ResultSummary
        items={c.items}
        onClear={c.clear}
        nameFor={nameFor}
        zipName={converting ? 'converted-files.zip' : undefined}
      />
      {processing && <AdSlot slot="processing" />}

      <FileList
        items={c.items}
        onRemove={c.remove}
        onCancel={c.cancel}
        onRetry={c.retry}
        onCompare={setComparing}
        onOpenArchive={onOpenArchive}
        nameFor={nameFor}
      />

      <div aria-live="polite" role="status" className="sr-only">
        {c.announcement}
      </div>

      <CompareSlider item={comparing} onClose={() => setComparing(null)} />
      <ArchivePanel
        key={archiveKey(archive)}
        file={archive}
        onClose={() => setArchive(null)}
        onCompress={(f) => void c.addFiles(f, { skipUnsupported: true })}
      />
    </div>
  );
}

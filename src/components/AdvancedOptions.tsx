import { useId, useState, type ReactNode } from 'react';
import { presetById, type CompressibleEngine, type UserOverrides } from '../config/presets';
import { ChevronIcon } from './icons';
import type { Settings } from './useCompressor';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  engines: readonly CompressibleEngine[];
  defaultOpen?: boolean;
}

const selectCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900';
const numCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900';

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-sky-600"
      />
      <span>{children}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-800">
      <legend className="float-left mb-1 w-full text-xs font-semibold tracking-wide text-slate-500 uppercase sm:col-span-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default function AdvancedOptions({
  settings,
  onChange,
  engines,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const id = useId();
  const o = settings.overrides;
  const set = (patch: Partial<UserOverrides>) =>
    onChange({ ...settings, overrides: { ...o, ...patch } });
  const show = (e: CompressibleEngine) => engines.length === 0 || engines.includes(e);
  const num = (v: string) =>
    v.trim() === '' ? undefined : Math.max(1, Math.round(Number(v)) || 1);
  const targetMode =
    presetById(settings.presetId).options(engines[0] ?? 'image').mode === 'targetSize' &&
    (settings.presetId !== 'custom' || !!settings.customTargetBytes);
  const quality = o.quality ?? 75;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        More options
        <ChevronIcon className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} hidden={!open} className="space-y-5 px-4 pb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {(show('image') || show('video')) && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label
                htmlFor={`${id}-q`}
                className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <span>Quality</span>
                <span className="font-normal text-slate-500">
                  {targetMode ? 'Set automatically by your goal' : quality}
                </span>
              </label>
              <input
                id={`${id}-q`}
                type="range"
                min={5}
                max={95}
                step={1}
                value={quality}
                disabled={targetMode}
                onChange={(e) => set({ quality: Number(e.target.value) })}
                className="w-full accent-sky-600 disabled:opacity-40"
                aria-describedby={`${id}-qh`}
              />
              <div id={`${id}-qh`} className="flex justify-between text-xs text-slate-500">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <Check checked={o.stripMetadata} onChange={(v) => set({ stripMetadata: v })}>
              Remove hidden details like location, camera and author (recommended)
            </Check>
          </div>
        </div>

        {show('image') && (
          <Section title="Images">
            <Field label="Format" htmlFor={`${id}-if`}>
              <select
                id={`${id}-if`}
                className={selectCls}
                value={o.imageFormat ?? 'keep'}
                onChange={(e) =>
                  set({ imageFormat: e.target.value as UserOverrides['imageFormat'] })
                }
              >
                <option value="keep">Keep original</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP (smaller)</option>
                <option value="avif">AVIF (smallest, slower)</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Max width (px)" htmlFor={`${id}-mw`}>
                <input
                  id={`${id}-mw`}
                  inputMode="numeric"
                  placeholder="Any"
                  className={numCls}
                  value={o.maxWidth ?? ''}
                  onChange={(e) => set({ maxWidth: num(e.target.value) })}
                />
              </Field>
              <Field label="Max height (px)" htmlFor={`${id}-mh`}>
                <input
                  id={`${id}-mh`}
                  inputMode="numeric"
                  placeholder="Any"
                  className={numCls}
                  value={o.maxHeight ?? ''}
                  onChange={(e) => set({ maxHeight: num(e.target.value) })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Check checked={!!o.pngPalette} onChange={(v) => set({ pngPalette: v || undefined })}>
                Shrink PNGs further by using fewer colours (great for screenshots and logos)
              </Check>
            </div>
          </Section>
        )}

        {show('pdf') && (
          <Section title="PDFs">
            <Field label="Method" htmlFor={`${id}-pm`}>
              <select
                id={`${id}-pm`}
                className={selectCls}
                value={o.pdfMode ?? 'smart'}
                onChange={(e) => set({ pdfMode: e.target.value as UserOverrides['pdfMode'] })}
              >
                <option value="smart">Smart: keeps text selectable</option>
                <option value="scanned">Scanned: smallest, pages become images</option>
              </select>
            </Field>
            <Field label="Strength" htmlFor={`${id}-pl`}>
              <select
                id={`${id}-pl`}
                className={selectCls}
                value={o.pdfLevel ?? 'balanced'}
                disabled={targetMode}
                onChange={(e) => set({ pdfLevel: e.target.value as UserOverrides['pdfLevel'] })}
              >
                <option value="light">Light: best quality</option>
                <option value="balanced">Balanced</option>
                <option value="strong">Strong: smallest file</option>
              </select>
            </Field>
          </Section>
        )}

        {show('video') && (
          <Section title="Videos">
            <Field label="Resolution" htmlFor={`${id}-vr`}>
              <select
                id={`${id}-vr`}
                className={selectCls}
                value={String(o.videoResolution ?? 'original')}
                onChange={(e) =>
                  set({
                    videoResolution:
                      e.target.value === 'original'
                        ? undefined
                        : (Number(e.target.value) as UserOverrides['videoResolution']),
                  })
                }
              >
                <option value="original">Original</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
                <option value="360">360p</option>
              </select>
            </Field>
            <Field label="Format" htmlFor={`${id}-vf`}>
              <select
                id={`${id}-vf`}
                className={selectCls}
                value={o.videoFormat ?? 'mp4'}
                onChange={(e) =>
                  set({ videoFormat: e.target.value as UserOverrides['videoFormat'] })
                }
              >
                <option value="mp4">MP4 (plays everywhere)</option>
                <option value="webm">WebM</option>
              </select>
            </Field>
            <Field label="Frame rate" htmlFor={`${id}-fr`}>
              <select
                id={`${id}-fr`}
                className={selectCls}
                value={String(o.maxFrameRate ?? '')}
                onChange={(e) =>
                  set({ maxFrameRate: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                <option value="">Original</option>
                <option value="30">Up to 30 fps</option>
                <option value="24">Up to 24 fps</option>
              </select>
            </Field>
            <div className="flex items-end pb-2">
              <Check
                checked={!!o.removeAudio}
                onChange={(v) => set({ removeAudio: v || undefined })}
              >
                Remove sound
              </Check>
            </div>
          </Section>
        )}

        {show('audio') && (
          <Section title="Audio">
            <Field label="Format" htmlFor={`${id}-af`}>
              <select
                id={`${id}-af`}
                className={selectCls}
                value={o.audioFormat ?? 'keep'}
                onChange={(e) =>
                  set({ audioFormat: e.target.value as UserOverrides['audioFormat'] })
                }
              >
                <option value="keep">Keep (WAV/FLAC become AAC)</option>
                <option value="aac">AAC (.m4a)</option>
                <option value="mp3">MP3</option>
                <option value="opus">Opus (.ogg, smallest)</option>
              </select>
            </Field>
            <Field label="Quality" htmlFor={`${id}-ab`}>
              <select
                id={`${id}-ab`}
                className={selectCls}
                value={String(o.audioBitrate ?? 128000)}
                disabled={targetMode}
                onChange={(e) => set({ audioBitrate: Number(e.target.value) })}
              >
                <option value="64000">Voice (64 kbps)</option>
                <option value="96000">Good (96 kbps)</option>
                <option value="128000">Great (128 kbps)</option>
                <option value="192000">Excellent (192 kbps)</option>
              </select>
            </Field>
          </Section>
        )}
      </div>
    </div>
  );
}

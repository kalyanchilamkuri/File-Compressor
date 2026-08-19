import type { CompressOptions, EngineId } from '../engine/types';

const KB = 1024;
const MB = 1024 * 1024;

/** Platform limits change; keep them here so they're easy to update. */
export const LIMITS = {
  gmailBytes: 24 * MB,
  discordBytes: 9.5 * MB,
} as const;

export type PresetId =
  | 'balanced'
  | 'u20kb'
  | 'u50kb'
  | 'u100kb'
  | 'u200kb'
  | 'u500kb'
  | 'u1mb'
  | 'email'
  | 'whatsapp'
  | 'discord'
  | 'website'
  | 'custom';

export type CompressibleEngine = Exclude<EngineId, 'archive'>;

export interface Preset {
  id: PresetId;
  label: string;
  hint: string;
  appliesTo: readonly CompressibleEngine[];
  /** Options this preset sets for a given engine; merged over the defaults. */
  options: (engine: CompressibleEngine) => Partial<CompressOptions>;
}

const ALL: readonly CompressibleEngine[] = ['image', 'pdf', 'video', 'audio'];
const target = (bytes: number) => () => ({ mode: 'targetSize' as const, targetBytes: bytes });

export const PRESETS: readonly Preset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    hint: 'Good quality, much smaller',
    appliesTo: ALL,
    options: () => ({ mode: 'quality' }),
  },
  {
    id: 'u20kb',
    label: 'Under 20 KB',
    hint: 'Tiny images, e.g. signatures',
    appliesTo: ['image'],
    options: target(20 * KB),
  },
  {
    id: 'u50kb',
    label: 'Under 50 KB',
    hint: 'Form uploads, avatars',
    appliesTo: ['image'],
    options: target(50 * KB),
  },
  {
    id: 'u100kb',
    label: 'Under 100 KB',
    hint: 'Job and exam applications',
    appliesTo: ['image', 'pdf'],
    options: target(100 * KB),
  },
  {
    id: 'u200kb',
    label: 'Under 200 KB',
    hint: 'Common upload limit',
    appliesTo: ['image', 'pdf'],
    options: target(200 * KB),
  },
  {
    id: 'u500kb',
    label: 'Under 500 KB',
    hint: 'Common upload limit',
    appliesTo: ['image', 'pdf'],
    options: target(500 * KB),
  },
  {
    id: 'u1mb',
    label: 'Under 1 MB',
    hint: 'Common upload limit',
    appliesTo: ['image', 'pdf'],
    options: target(1 * MB),
  },
  {
    id: 'email',
    label: 'Email',
    hint: 'Fits Gmail attachments',
    appliesTo: ALL,
    options: target(LIMITS.gmailBytes),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Sharp on phones, quick to send',
    appliesTo: ['image', 'video'],
    options: (engine) =>
      engine === 'video'
        ? { mode: 'quality', videoResolution: 720 }
        : { mode: 'quality', quality: 80, maxWidth: 1600, maxHeight: 1600 },
  },
  {
    id: 'discord',
    label: 'Discord',
    hint: 'Under the free upload limit',
    appliesTo: ['image', 'video'],
    options: target(LIMITS.discordBytes),
  },
  {
    id: 'website',
    label: 'Website',
    hint: 'WebP, max 1920 px',
    appliesTo: ['image'],
    options: () => ({
      mode: 'quality',
      quality: 78,
      imageFormat: 'webp',
      maxWidth: 1920,
      maxHeight: 1920,
    }),
  },
  {
    id: 'custom',
    label: 'Custom size',
    hint: 'Pick your own target',
    appliesTo: ALL,
    options: () => ({ mode: 'targetSize' }),
  },
];

export const DEFAULT_PRESET: PresetId = 'balanced';

export const presetById = (id: PresetId) => PRESETS.find((p) => p.id === id)!;

/** Per-engine defaults used by "Balanced" and as the base for every preset. */
export const ENGINE_DEFAULTS: Record<CompressibleEngine, Partial<CompressOptions>> = {
  image: { quality: 75, imageFormat: 'keep' },
  pdf: { pdfMode: 'smart', pdfLevel: 'balanced' },
  video: { quality: 60, videoFormat: 'mp4', videoResolution: 'original' },
  audio: { audioFormat: 'keep', audioBitrate: 128_000 },
};

export interface UserOverrides {
  quality?: number;
  imageFormat?: CompressOptions['imageFormat'];
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata: boolean;
  pngPalette?: boolean;
  pdfMode?: CompressOptions['pdfMode'];
  pdfLevel?: CompressOptions['pdfLevel'];
  videoResolution?: CompressOptions['videoResolution'];
  videoFormat?: CompressOptions['videoFormat'];
  maxFrameRate?: number;
  removeAudio?: boolean;
  trimStart?: number;
  trimEnd?: number;
  audioFormat?: CompressOptions['audioFormat'];
  audioBitrate?: number;
}

/** Final options for one file: engine defaults, then the preset, then anything the user set explicitly. */
export function resolveOptions(
  engine: CompressibleEngine,
  presetId: PresetId,
  customTargetBytes: number | null,
  overrides: UserOverrides,
): CompressOptions {
  const preset = presetById(presetId);
  const applicable = preset.appliesTo.includes(engine);
  const fromPreset = applicable ? preset.options(engine) : { mode: 'quality' as const };
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  ) as Partial<CompressOptions>;
  const opts: CompressOptions = {
    mode: 'quality',
    ...ENGINE_DEFAULTS[engine],
    ...fromPreset,
    ...defined,
    stripMetadata: overrides.stripMetadata,
  };
  if (applicable && presetId === 'custom') {
    if (customTargetBytes) opts.targetBytes = customTargetBytes;
    else opts.mode = 'quality';
  }
  if (opts.mode === 'targetSize' && !opts.targetBytes) opts.mode = 'quality';
  return opts;
}

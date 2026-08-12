export interface Sized {
  size: number;
}

export interface ImageSearchResult<T extends Sized> {
  output: T;
  quality: number;
  scale: number;
  hitTarget: boolean;
}

export interface ImageSearchOptions {
  minQuality?: number;
  maxQuality?: number;
  maxIterations?: number;
  downscaleStep?: number;
  /** Long side in px of the full-size image; downscaling stops before it drops below `minLongSide`. */
  longSide?: number;
  minLongSide?: number;
  signal?: AbortSignal;
  onStep?: () => void;
}

export const TARGET_UNREACHABLE_WARNING =
  'Could not reach the target size; used the smallest size that was possible.';

/**
 * Finds the highest quality whose output fits in `targetBytes`, binary searching quality and then
 * shrinking dimensions when even the lowest quality is too big. `encode(quality, scale)` must be
 * monotonic enough in both arguments for the search to be meaningful (real codecs are).
 */
export async function searchImageTarget<T extends Sized>(
  encode: (quality: number, scale: number) => Promise<T>,
  targetBytes: number,
  opts: ImageSearchOptions = {},
): Promise<ImageSearchResult<T>> {
  const {
    minQuality = 5,
    maxQuality = 95,
    maxIterations = 8,
    downscaleStep = 0.85,
    longSide = Infinity,
    minLongSide = 16,
    signal,
    onStep,
  } = opts;

  let smallest: ImageSearchResult<T> | null = null;
  const run = async (quality: number, scale: number) => {
    signal?.throwIfAborted();
    const output = await encode(quality, scale);
    onStep?.();
    if (!smallest || output.size < smallest.output.size) {
      smallest = { output, quality, scale, hitTarget: output.size <= targetBytes };
    }
    return output;
  };

  const searchAt = async (scale: number, lo: number, hi: number) => {
    let best: ImageSearchResult<T> | null = null;
    for (let i = 0; i < maxIterations && lo <= hi; i++) {
      const q = Math.floor((lo + hi) / 2);
      const out = await run(q, scale);
      if (out.size <= targetBytes) {
        best = { output: out, quality: q, scale, hitTarget: true };
        lo = q + 1;
      } else {
        hi = q - 1;
      }
    }
    return best;
  };

  const full = await searchAt(1, minQuality, maxQuality);
  if (full) return full;

  // Even the lowest quality is too big at full size: shrink until the lowest quality fits,
  // then search quality again at that size.
  let scale = 1;
  while (longSide * scale * downscaleStep >= minLongSide) {
    scale *= downscaleStep;
    const floor = await run(minQuality, scale);
    if (floor.size <= targetBytes) {
      const refined = await searchAt(scale, minQuality + 1, maxQuality);
      return refined ?? { output: floor, quality: minQuality, scale, hitTarget: true };
    }
    if (!Number.isFinite(longSide) && scale < 0.05) break;
  }
  return smallest!;
}

export interface VideoPlan {
  videoBitrate: number;
  audioBitrate: number;
  /** Output height, or null to keep the source height. */
  height: number | null;
  warnings: string[];
}

export const VIDEO_STEPS = [1080, 720, 480, 360] as const;

/** Rough H.264 bitrate below which a given height looks bad (1.5 Mbps at 1080p, scaled by area). */
export const minBitrateFor = (height: number) =>
  Math.max(150_000, 1_500_000 * (height / 1080) ** 2);

export const VIDEO_UNREALISTIC_WARNING =
  'This target is very small for a video this long. Expect low quality; try a larger target or trimming the video.';

export function planVideo(
  targetBytes: number,
  durationSeconds: number,
  sourceHeight: number,
  hasAudio: boolean,
): VideoPlan {
  const warnings: string[] = [];
  const totalBps = (targetBytes * 8 * 0.95) / Math.max(durationSeconds, 0.1);
  let audioBitrate = 0;
  if (hasAudio) {
    audioBitrate = totalBps < 1_000_000 ? 64_000 : 96_000;
    // Audio should never eat most of the budget.
    if (audioBitrate > totalBps * 0.4) audioBitrate = Math.max(24_000, totalBps * 0.2);
  }
  const videoBitrate = Math.max(totalBps - audioBitrate, 50_000);

  let height: number | null = null;
  if (videoBitrate < minBitrateFor(sourceHeight)) {
    for (const h of VIDEO_STEPS) {
      if (h >= sourceHeight) continue;
      height = h;
      if (videoBitrate >= minBitrateFor(h)) break;
    }
  }
  if (videoBitrate < minBitrateFor(360) * 0.5) warnings.push(VIDEO_UNREALISTIC_WARNING);
  return {
    videoBitrate: Math.round(videoBitrate),
    audioBitrate: Math.round(audioBitrate),
    height,
    warnings,
  };
}

export function planAudioBitrate(targetBytes: number, durationSeconds: number): number {
  const bps = (targetBytes * 8 * 0.97) / Math.max(durationSeconds, 0.1);
  return Math.round(Math.min(320_000, Math.max(32_000, bps)));
}

/**
 * Tries each setting from best to worst quality and returns the first output that fits the target,
 * or the smallest one with `hitTarget: false`.
 */
export async function stepDownToTarget<S, T extends Sized>(
  steps: readonly S[],
  run: (step: S) => Promise<T>,
  targetBytes: number,
  signal?: AbortSignal,
): Promise<{ output: T; step: S; hitTarget: boolean }> {
  let smallest: { output: T; step: S } | null = null;
  for (const step of steps) {
    signal?.throwIfAborted();
    const output = await run(step);
    if (output.size <= targetBytes) return { output, step, hitTarget: true };
    if (!smallest || output.size < smallest.output.size) smallest = { output, step };
  }
  if (!smallest) throw new Error('stepDownToTarget needs at least one step');
  return { ...smallest, hitTarget: false };
}

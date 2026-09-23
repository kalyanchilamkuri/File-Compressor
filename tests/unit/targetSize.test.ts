import { describe, expect, it } from 'vitest';
import {
  VIDEO_UNREALISTIC_WARNING,
  minBitrateFor,
  planAudioBitrate,
  planVideo,
  searchImageTarget,
  stepDownToTarget,
} from '../../src/engine/targetSize';

/** A fake encoder whose output grows with quality and with area (scale²). */
const fakeEncoder = (bytesAtQ100: number) => {
  const calls: [number, number][] = [];
  const encode = async (q: number, scale: number) => {
    calls.push([q, scale]);
    return { size: Math.round(bytesAtQ100 * (0.1 + 0.9 * (q / 100)) * scale * scale), q, scale };
  };
  return { encode, calls };
};

describe('searchImageTarget', () => {
  it('finds the highest quality that fits, within 8 encodes', async () => {
    const { encode, calls } = fakeEncoder(1_000_000);
    const r = await searchImageTarget(encode, 500_000);
    expect(r.hitTarget).toBe(true);
    expect(r.scale).toBe(1);
    expect(r.output.size).toBeLessThanOrEqual(500_000);
    // One quality step higher must not fit, otherwise the search stopped too early.
    expect((await encode(r.quality + 1, 1)).size).toBeGreaterThan(500_000);
    expect(calls.length - 1).toBeLessThanOrEqual(8);
  });

  it('downscales when even the lowest quality is too big', async () => {
    const { encode } = fakeEncoder(10_000_000);
    const r = await searchImageTarget(encode, 200_000, { longSide: 4000 });
    expect(r.hitTarget).toBe(true);
    expect(r.scale).toBeLessThan(1);
    expect(r.output.size).toBeLessThanOrEqual(200_000);
  });

  it('returns the smallest result with hitTarget=false when the target is impossible', async () => {
    const encode = async () => ({ size: 5_000 });
    const r = await searchImageTarget(encode, 100, { longSide: 64, minLongSide: 16 });
    expect(r.hitTarget).toBe(false);
    expect(r.output.size).toBe(5_000);
  });

  it('stops when aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const { encode } = fakeEncoder(1_000_000);
    await expect(searchImageTarget(encode, 1, { signal: ctrl.signal })).rejects.toThrow();
  });
});

describe('planVideo', () => {
  it('keeps the source resolution when the budget is generous', () => {
    const plan = planVideo(24 * 1024 * 1024, 30, 1080, true);
    expect(plan.height).toBeNull();
    expect(plan.audioBitrate).toBe(96_000);
    // (bytes × 8 × 0.95) / seconds − audio
    expect(plan.videoBitrate).toBe(Math.round((24 * 1024 * 1024 * 8 * 0.95) / 30 - 96_000));
    expect(plan.warnings).toEqual([]);
  });

  it('steps the resolution down when the bitrate is too low for the source', () => {
    const plan = planVideo(9.5 * 1024 * 1024, 120, 1080, true);
    expect(plan.height).not.toBeNull();
    expect(plan.height!).toBeLessThan(1080);
    expect(plan.videoBitrate).toBeGreaterThanOrEqual(minBitrateFor(plan.height!) * 0.99);
  });

  it('uses 64 kbps audio when the target is tight', () => {
    expect(planVideo(5 * 1024 * 1024, 60, 720, true).audioBitrate).toBeLessThanOrEqual(64_000);
  });

  it('allocates everything to video when there is no audio', () => {
    expect(planVideo(10_000_000, 10, 720, false).audioBitrate).toBe(0);
  });

  it('warns when the target is unrealistic', () => {
    const plan = planVideo(1024 * 1024, 600, 1080, true);
    expect(plan.height).toBe(360);
    expect(plan.warnings).toContain(VIDEO_UNREALISTIC_WARNING);
  });
});

describe('planAudioBitrate', () => {
  it('computes bytes × 8 × 0.97 / seconds', () => {
    expect(planAudioBitrate(1_000_000, 60)).toBe(Math.round((1_000_000 * 8 * 0.97) / 60));
  });
  it('clamps to 32–320 kbps', () => {
    expect(planAudioBitrate(10, 600)).toBe(32_000);
    expect(planAudioBitrate(1e9, 1)).toBe(320_000);
  });
});

describe('stepDownToTarget', () => {
  it('returns the first step that fits', async () => {
    const r = await stepDownToTarget([300, 200, 100], async (s) => ({ size: s }), 250);
    expect(r).toMatchObject({ step: 200, hitTarget: true });
  });

  it('returns the smallest result when nothing fits', async () => {
    const r = await stepDownToTarget([300, 200, 150], async (s) => ({ size: s }), 10);
    expect(r).toMatchObject({ step: 150, hitTarget: false });
  });
});

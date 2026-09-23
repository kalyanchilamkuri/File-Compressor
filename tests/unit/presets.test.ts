import { describe, expect, it } from 'vitest';
import { LIMITS, PRESETS, resolveOptions } from '../../src/config/presets';

const base = { stripMetadata: true };

describe('presets', () => {
  it('have unique ids and at least one engine each', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(p.appliesTo.length).toBeGreaterThan(0);
  });

  it('Balanced is quality mode with per-engine defaults', () => {
    expect(resolveOptions('image', 'balanced', null, base)).toMatchObject({
      mode: 'quality',
      quality: 75,
      imageFormat: 'keep',
      stripMetadata: true,
    });
    expect(resolveOptions('pdf', 'balanced', null, base)).toMatchObject({
      pdfMode: 'smart',
      pdfLevel: 'balanced',
    });
  });

  it('size presets set a target for engines they apply to', () => {
    expect(resolveOptions('image', 'u100kb', null, base)).toMatchObject({
      mode: 'targetSize',
      targetBytes: 100 * 1024,
    });
    expect(resolveOptions('pdf', 'u1mb', null, base)).toMatchObject({
      mode: 'targetSize',
      targetBytes: 1024 * 1024,
    });
    expect(resolveOptions('video', 'email', null, base)).toMatchObject({
      targetBytes: LIMITS.gmailBytes,
    });
  });

  it('falls back to Balanced for engines a preset does not apply to', () => {
    expect(resolveOptions('video', 'u20kb', null, base).mode).toBe('quality');
    expect(resolveOptions('audio', 'website', null, base)).toMatchObject({
      mode: 'quality',
      audioBitrate: 128_000,
    });
    expect(resolveOptions('audio', 'website', null, base).imageFormat).toBeUndefined();
  });

  it('WhatsApp resizes images and caps video at 720p', () => {
    expect(resolveOptions('image', 'whatsapp', null, base)).toMatchObject({
      maxWidth: 1600,
      quality: 80,
    });
    expect(resolveOptions('video', 'whatsapp', null, base)).toMatchObject({ videoResolution: 720 });
  });

  it('Custom uses the entered size, or quality mode until one is entered', () => {
    expect(resolveOptions('image', 'custom', 150_000, base)).toMatchObject({
      mode: 'targetSize',
      targetBytes: 150_000,
    });
    expect(resolveOptions('image', 'custom', null, base).mode).toBe('quality');
  });

  it('explicit user choices win over the preset, but undefined ones do not erase it', () => {
    const o = resolveOptions('image', 'website', null, {
      ...base,
      imageFormat: 'avif',
      quality: undefined,
    });
    expect(o.imageFormat).toBe('avif');
    expect(o.quality).toBe(78);
  });

  it('respects the metadata choice', () => {
    expect(resolveOptions('image', 'balanced', null, { stripMetadata: false }).stripMetadata).toBe(
      false,
    );
  });
});

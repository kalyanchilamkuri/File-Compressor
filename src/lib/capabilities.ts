import type { EngineId } from '../engine/types';

export interface Capabilities {
  workers: boolean;
  wasm: boolean;
  offscreenCanvas: boolean;
  webCodecs: boolean;
  opfs: boolean;
  serviceWorker: boolean;
}

export function detectCapabilities(): Capabilities {
  const g = globalThis as typeof globalThis & Record<string, unknown>;
  return {
    workers: typeof Worker !== 'undefined',
    wasm: typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    webCodecs: typeof g.VideoEncoder === 'function' && typeof g.VideoDecoder === 'function',
    opfs: typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory,
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
}

/** A short, plain-language reason an engine can't run here, or null if it can. */
export function missingFor(engine: EngineId, caps: Capabilities): string | null {
  if (!caps.workers || !caps.wasm) {
    return 'This browser is missing features needed to compress files. Please update it or try Chrome, Edge, Firefox, or Safari.';
  }
  if ((engine === 'image' || engine === 'pdf') && !caps.offscreenCanvas) {
    return 'Your browser is too old to compress images here. Please update it (Safari 16.4 or newer).';
  }
  if (engine === 'video' && !caps.webCodecs) {
    return 'Video compression needs a newer browser. Please update to the latest Chrome, Edge, Firefox, or Safari.';
  }
  return null;
}

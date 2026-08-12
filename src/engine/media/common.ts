import {
  BufferTarget,
  StreamTarget,
  canEncodeAudio,
  type StreamTargetChunk,
  type Target,
} from 'mediabunny';
import { OPFS_TEMP_DIR } from '../../lib/opfs';

let polyfilled: Promise<void> | null = null;

/** Registers WASM AAC/MP3 encoders where the browser has none (e.g. Firefox AAC, every browser's MP3). */
export function ensureAudioEncoders(): Promise<void> {
  polyfilled ??= (async () => {
    if (!(await canEncodeAudio('aac'))) {
      (await import('@mediabunny/aac-encoder')).registerAacEncoder();
    }
    if (!(await canEncodeAudio('mp3'))) {
      (await import('@mediabunny/mp3-encoder')).registerMp3Encoder();
    }
  })();
  return polyfilled;
}

export interface OutputSink {
  target: Target;
  /** Resolves to the finished file once the output has been finalized. */
  result: (mime: string) => Promise<Blob>;
  /** Name of the temp file in OPFS, if one was used. */
  tempName?: string;
}

/**
 * Large outputs go to a temp file in the Origin Private File System, so a 1 GB video never has to
 * sit in memory. Falls back to an in-memory buffer where OPFS sync access isn't available.
 */
export async function createSink(): Promise<OutputSink> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_TEMP_DIR, { create: true });
    const tempName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const handle = await dir.getFileHandle(tempName, { create: true });
    const access = await handle.createSyncAccessHandle();
    const writable = new WritableStream<StreamTargetChunk>({
      write(chunk) {
        access.write(chunk.data, { at: chunk.position });
      },
      close() {
        access.flush();
        access.close();
      },
      abort() {
        access.close();
      },
    });
    return {
      target: new StreamTarget(writable, { chunked: true, chunkSize: 8 * 1024 * 1024 }),
      tempName,
      async result(mime) {
        const file = await handle.getFile();
        return new File([file], tempName, { type: mime });
      },
    };
  } catch {
    const target = new BufferTarget();
    return {
      target,
      async result(mime) {
        return new Blob([target.buffer!], { type: mime });
      },
    };
  }
}

export const qualityLevel = (q: number) =>
  q >= 85 ? 'very-high' : q >= 70 ? 'high' : q >= 45 ? 'medium' : q >= 25 ? 'low' : 'very-low';

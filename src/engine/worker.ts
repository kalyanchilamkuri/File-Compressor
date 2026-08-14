/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { CompressOptions, CompressResult, DetectedType, EngineId } from './types';
import { OFFLINE_ENGINE_MESSAGE, isLoadFailure } from './errors';
import { UserFacingError } from './types';

export interface WorkerError {
  userFacing: boolean;
  message: string;
}

export type WorkerResult = { ok: true; result: CompressResult } | { ok: false; error: WorkerError };

async function run(
  engine: EngineId,
  file: File,
  type: DetectedType,
  options: CompressOptions,
  onProgress: (f: number) => void,
): Promise<CompressResult> {
  switch (engine) {
    case 'image':
      return (await import('./image/compress')).compressImage(file, type, options, onProgress);
    case 'pdf':
      return (await import('./pdf/compress')).compressPdf(file, options, onProgress);
    case 'video':
      return (await import('./media/video')).compressVideo(file, type, options, onProgress);
    case 'audio':
      return (await import('./media/audio')).compressAudio(file, type, options, onProgress);
    default:
      throw new UserFacingError('This file type can’t be compressed.');
  }
}

const api = {
  async compress(
    engine: EngineId,
    file: File,
    type: DetectedType,
    options: CompressOptions,
    onProgress: (f: number) => void,
  ): Promise<WorkerResult> {
    try {
      return { ok: true, result: await run(engine, file, type, options, onProgress) };
    } catch (err) {
      // Errors are returned, not thrown, so the user-facing flag survives structured cloning.
      if (!navigator.onLine && isLoadFailure(err)) {
        return { ok: false, error: { userFacing: true, message: OFFLINE_ENGINE_MESSAGE } };
      }
      const userFacing =
        err instanceof UserFacingError || (err instanceof Error && err.name === 'UserFacingError');
      if (!userFacing) console.error(err);
      return {
        ok: false,
        error: {
          userFacing,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

export type WorkerApi = typeof api;

Comlink.expose(api);

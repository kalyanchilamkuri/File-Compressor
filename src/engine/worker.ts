/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type {
  CompressOptions,
  CompressResult,
  DetectedType,
  EngineId,
  ImagesToPdfOptions,
  ImagesToPdfResult,
  MergeOptions,
  MergeResult,
  PdfToImagesOptions,
  PdfToImagesResult,
} from './types';
import { OFFLINE_ENGINE_MESSAGE, isLoadFailure } from './errors';
import { UserFacingError, isUserFacing } from './types';

export interface WorkerError {
  userFacing: boolean;
  message: string;
}

export type WorkerResult<T = CompressResult> =
  { ok: true; result: T } | { ok: false; error: WorkerError };

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

/** Errors are returned, not thrown, so the user-facing flag survives structured cloning. */
async function guard<T>(work: () => Promise<T>): Promise<WorkerResult<T>> {
  try {
    return { ok: true, result: await work() };
  } catch (err) {
    if (!navigator.onLine && isLoadFailure(err)) {
      return { ok: false, error: { userFacing: true, message: OFFLINE_ENGINE_MESSAGE } };
    }
    const userFacing = isUserFacing(err);
    if (!userFacing) console.error(err);
    return {
      ok: false,
      error: {
        userFacing,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

const api = {
  compress(
    engine: EngineId,
    file: File,
    type: DetectedType,
    options: CompressOptions,
    onProgress: (f: number) => void,
  ): Promise<WorkerResult<CompressResult>> {
    return guard(() => run(engine, file, type, options, onProgress));
  },

  mergePdf(
    files: File[],
    options: MergeOptions,
    onProgress: (f: number) => void,
  ): Promise<WorkerResult<MergeResult>> {
    return guard(async () => (await import('./pdf/merge')).mergePdfs(files, options, onProgress));
  },

  pdfToImages(
    file: File,
    options: PdfToImagesOptions,
    onProgress: (f: number) => void,
  ): Promise<WorkerResult<PdfToImagesResult>> {
    return guard(async () =>
      (await import('./pdf/toImages')).pdfToImages(file, options, onProgress),
    );
  },

  imagesToPdf(
    files: File[],
    options: ImagesToPdfOptions,
    onProgress: (f: number) => void,
  ): Promise<WorkerResult<ImagesToPdfResult>> {
    return guard(async () =>
      (await import('./pdf/fromImages')).imagesToPdf(files, options, onProgress),
    );
  },
};

export type WorkerApi = typeof api;

Comlink.expose(api);

import * as Comlink from 'comlink';
import type { WorkerApi } from './worker';
import type { CompressOptions, CompressResult, DetectedType, EngineId } from './types';
import { OFFLINE_ENGINE_MESSAGE } from './errors';
import { UserFacingError } from './types';

interface Handle {
  worker: Worker;
  api: Comlink.Remote<WorkerApi>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/** Idle workers are kept briefly so batches reuse loaded codecs, then freed. */
const IDLE_MS = 20_000;
const idle: Handle[] = [];

function spawn(): Handle {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
    name: 'compressor',
  });
  return { worker, api: Comlink.wrap<WorkerApi>(worker) };
}

function release(h: Handle) {
  h.idleTimer = setTimeout(() => {
    const i = idle.indexOf(h);
    if (i >= 0) idle.splice(i, 1);
    h.worker.terminate();
  }, IDLE_MS);
  idle.push(h);
}

function acquire(): Handle {
  const h = idle.pop();
  if (h) {
    clearTimeout(h.idleTimer);
    return h;
  }
  return spawn();
}

export class AbortError extends Error {
  override name = 'AbortError';
}

/**
 * Runs one compression in a worker. Aborting terminates that worker outright, which is the only
 * way to stop a synchronous WASM encode and immediately frees its memory.
 */
export function runInWorker(
  engine: EngineId,
  file: File,
  type: DetectedType,
  options: CompressOptions,
  onProgress: (f: number) => void,
  signal: AbortSignal,
): Promise<CompressResult> {
  if (signal.aborted) return Promise.reject(new AbortError());
  const h = acquire();
  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      h.worker.terminate();
      reject(new AbortError());
    };
    const onCrash = (e: ErrorEvent) => {
      if (settled) return;
      settled = true;
      h.worker.terminate();
      signal.removeEventListener('abort', onAbort);
      console.error(e);
      reject(
        new UserFacingError(
          navigator.onLine
            ? 'Your browser ran out of memory or hit an error on this file. Try closing other tabs or compressing fewer files at once.'
            : OFFLINE_ENGINE_MESSAGE,
        ),
      );
    };
    signal.addEventListener('abort', onAbort, { once: true });
    h.worker.addEventListener('error', onCrash, { once: true });

    h.api
      .compress(engine, file, type, options, Comlink.proxy(onProgress))
      .then((res) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        h.worker.removeEventListener('error', onCrash);
        release(h);
        if (res.ok) resolve(res.result);
        else
          reject(
            res.error.userFacing
              ? new UserFacingError(res.error.message)
              : new Error(res.error.message),
          );
      })
      .catch((err: unknown) => {
        if (settled) return;
        settled = true;
        h.worker.terminate();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

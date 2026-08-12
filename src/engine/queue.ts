export interface QueuedJob {
  id: string;
  lane: string;
  run: (signal: AbortSignal) => Promise<void>;
}

interface Entry extends QueuedJob {
  controller: AbortController;
}

/**
 * FIFO job queue with a concurrency limit per lane (e.g. many images at once, one video).
 * Jobs report their own results; the queue only schedules and cancels.
 */
export class JobQueue {
  private pending: Entry[] = [];
  private running = new Map<string, Entry>();

  constructor(private readonly limitFor: (lane: string) => number) {}

  add(job: QueuedJob): void {
    this.cancel(job.id);
    this.pending.push({ ...job, controller: new AbortController() });
    this.pump();
  }

  /** Cancels a pending or running job. Returns true if it was found. */
  cancel(id: string): boolean {
    const i = this.pending.findIndex((j) => j.id === id);
    if (i >= 0) {
      this.pending[i]!.controller.abort();
      this.pending.splice(i, 1);
      return true;
    }
    const running = this.running.get(id);
    if (running) {
      running.controller.abort();
      return true;
    }
    return false;
  }

  cancelAll(): void {
    for (const id of [...this.pending.map((j) => j.id), ...this.running.keys()]) this.cancel(id);
  }

  get size(): number {
    return this.pending.length + this.running.size;
  }

  isRunning(id: string): boolean {
    return this.running.has(id);
  }

  private runningIn(lane: string): number {
    let n = 0;
    for (const j of this.running.values()) if (j.lane === lane) n++;
    return n;
  }

  private pump(): void {
    for (let i = 0; i < this.pending.length;) {
      const job = this.pending[i]!;
      if (this.runningIn(job.lane) >= Math.max(1, this.limitFor(job.lane))) {
        i++;
        continue;
      }
      this.pending.splice(i, 1);
      this.running.set(job.id, job);
      job
        .run(job.controller.signal)
        .catch(() => {
          // Jobs handle and report their own errors.
        })
        .finally(() => {
          if (this.running.get(job.id) === job) this.running.delete(job.id);
          this.pump();
        });
    }
  }
}

export function defaultLaneLimit(
  lane: string,
  cores = globalThis.navigator?.hardwareConcurrency ?? 4,
) {
  if (lane === 'image') return Math.max(1, Math.min(cores - 1, 4));
  if (lane === 'pdf' || lane === 'audio') return 2;
  return 1;
}

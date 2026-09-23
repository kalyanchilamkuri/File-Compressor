import { describe, expect, it } from 'vitest';
import { JobQueue, defaultLaneLimit } from '../../src/engine/queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('JobQueue', () => {
  it('limits concurrency per lane and runs jobs in order', async () => {
    const q = new JobQueue((lane) => (lane === 'video' ? 1 : 2));
    const started: string[] = [];
    const gates = new Map<string, ReturnType<typeof deferred>>();
    const job = (id: string, lane: string) => {
      gates.set(id, deferred());
      q.add({
        id,
        lane,
        run: async () => {
          started.push(id);
          await gates.get(id)!.promise;
        },
      });
    };
    job('i1', 'image');
    job('i2', 'image');
    job('i3', 'image');
    job('v1', 'video');
    job('v2', 'video');
    await tick();
    expect(started).toEqual(['i1', 'i2', 'v1']);

    gates.get('i1')!.resolve();
    gates.get('v1')!.resolve();
    await tick();
    await tick();
    expect(started).toEqual(['i1', 'i2', 'v1', 'i3', 'v2']);
  });

  it('cancels pending jobs without running them, and aborts running ones', async () => {
    const q = new JobQueue(() => 1);
    const ran: string[] = [];
    let runningSignal: AbortSignal | null = null;
    const gate = deferred();
    q.add({
      id: 'a',
      lane: 'x',
      run: async (signal) => {
        runningSignal = signal;
        ran.push('a');
        await gate.promise;
      },
    });
    q.add({ id: 'b', lane: 'x', run: async () => void ran.push('b') });
    await tick();
    expect(q.cancel('b')).toBe(true);
    expect(q.cancel('a')).toBe(true);
    expect(runningSignal!.aborted).toBe(true);
    gate.resolve();
    await tick();
    await tick();
    expect(ran).toEqual(['a']);
    expect(q.size).toBe(0);
    expect(q.cancel('missing')).toBe(false);
  });

  it('keeps going after a job fails', async () => {
    const q = new JobQueue(() => 1);
    const ran: string[] = [];
    q.add({ id: 'bad', lane: 'x', run: async () => Promise.reject(new Error('boom')) });
    q.add({ id: 'good', lane: 'x', run: async () => void ran.push('good') });
    await tick();
    await tick();
    expect(ran).toEqual(['good']);
  });
});

describe('defaultLaneLimit', () => {
  it('uses cores − 1 for images, capped at 4, and 1 for video', () => {
    expect(defaultLaneLimit('image', 8)).toBe(4);
    expect(defaultLaneLimit('image', 3)).toBe(2);
    expect(defaultLaneLimit('image', 1)).toBe(1);
    expect(defaultLaneLimit('video', 16)).toBe(1);
  });
});

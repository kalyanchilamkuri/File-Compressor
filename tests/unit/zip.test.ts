// @vitest-environment node
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createZip } from '../../src/engine/archive/zip';

const text = (s: string) => new Blob([s]);

describe('createZip', () => {
  it('round-trips files and folders, de-duplicating names', async () => {
    const progress: number[] = [];
    const zip = await createZip(
      [
        { name: 'a.txt', blob: text('hello '.repeat(100)) },
        { name: 'photos/b.jpg', blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])]) },
        { name: 'a.txt', blob: text('second') },
        { name: '/leading-slash.txt', blob: text('x') },
      ],
      (p) => progress.push(p),
    );
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual([
      'a (2).txt',
      'a.txt',
      'leading-slash.txt',
      'photos/b.jpg',
    ]);
    expect(new TextDecoder().decode(files['a (2).txt'])).toBe('second');
    expect([...files['photos/b.jpg']!]).toEqual([0xff, 0xd8, 0xff, 1, 2, 3]);
    expect(progress.at(-1)).toBe(1);
  });

  it('can be cancelled', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      createZip([{ name: 'a', blob: text('a') }], undefined, ctrl.signal),
    ).rejects.toThrow();
  });
});

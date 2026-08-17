// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { mergePdfs } from '../../src/engine/pdf/merge';
import { UserFacingError } from '../../src/engine/types';
import { fixture } from './fixtures';

const A4: [number, number] = [595, 842];
const LETTER: [number, number] = [612, 792];

/** A PDF with `sizes.length` pages, each a distinct size, so page order is checkable afterwards. */
async function makePdf(name: string, sizes: [number, number][]): Promise<File> {
  const doc = await PDFDocument.create();
  for (const size of sizes) doc.addPage(size);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], name, { type: 'application/pdf' });
}

const pageSizes = async (blob: Blob) => {
  const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
};

const opts = { stripMetadata: true };

describe('mergePdfs', () => {
  it('joins every page in list order', async () => {
    const a = await makePdf('a.pdf', [A4, A4]);
    const b = await makePdf('b.pdf', [LETTER]);
    const progress: number[] = [];

    const result = await mergePdfs([a, b], opts, (p) => progress.push(p));

    expect(result.pageCount).toBe(3);
    expect(result.fileName).toBe('merged.pdf');
    expect(result.inputBytes).toBe(a.size + b.size);
    expect(result.outputBytes).toBe(result.blob.size);
    expect(await pageSizes(result.blob)).toEqual([A4, A4, LETTER]);
    expect(progress.at(-1)).toBe(1);
  });

  it('follows the order it is given, not the order the files were named', async () => {
    const a = await makePdf('a.pdf', [A4]);
    const b = await makePdf('b.pdf', [LETTER]);

    expect(await pageSizes((await mergePdfs([b, a], opts, () => {})).blob)).toEqual([LETTER, A4]);
  });

  it('keeps the merged document readable and its metadata stripped', async () => {
    const merged = await mergePdfs(
      [await makePdf('a.pdf', [A4]), await makePdf('b.pdf', [A4])],
      { stripMetadata: true, title: 'report' },
      () => {},
    );
    // Loading with updateMetadata on would re-stamp Producer, hiding what was actually written.
    const doc = await PDFDocument.load(new Uint8Array(await merged.blob.arrayBuffer()), {
      updateMetadata: false,
    });
    expect(doc.getTitle()).toBe('report');
    expect(doc.getProducer()).toBe('');
    expect(doc.getCreator()).toBe('');
  });

  it('names the locked file instead of merging around it', async () => {
    const locked = new File([fixture('locked.pdf') as BlobPart], 'secret-report.pdf', {
      type: 'application/pdf',
    });
    const ok = await makePdf('fine.pdf', [A4]);

    const err = await mergePdfs([ok, locked], opts, () => {}).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(UserFacingError);
    expect((err as Error).message).toContain('secret-report.pdf');
    expect((err as Error).message).toContain('password');
  });

  it('refuses a single file, because that is not a merge', async () => {
    await expect(mergePdfs([await makePdf('a.pdf', [A4])], opts, () => {})).rejects.toThrow(
      UserFacingError,
    );
  });
});

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addFiles, fixturePath, needsOffscreenCanvas, open } from './helpers';

const list = (page: Page) => page.getByTestId('merge-list');

/** Page sizes of a PDF, rounded, so page order can be asserted in Node. */
async function pageSizes(path: string): Promise<[number, number][]> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(new Uint8Array(readFileSync(path)));
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
}

const fixturePages = (name: string) => pageSizes(fixturePath(name));

test.describe('Merge PDF', () => {
  test('joins every page in list order, and a reorder changes the output', async ({ page }) => {
    const text = await fixturePages('text.pdf');
    const images = await fixturePages('images.pdf');

    await open(page, '/merge-pdf');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['text.pdf', 'images.pdf']);
    await expect(list(page).getByRole('listitem')).toHaveCount(2);
    // Page counts and covers arrive from pdf.js a moment after the rows do.
    await expect(list(page)).toContainText('page', { timeout: 30_000 });

    let download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Merge 2 PDFs/ }).click();
    const d = await download;
    expect(d.suggestedFilename()).toBe('merged.pdf');
    expect(await pageSizes(await d.path())).toEqual([...text, ...images]);
    await expect(page.getByRole('status')).toContainText(`${text.length + images.length} pages`);

    await list(page)
      .getByRole('button', { name: /^Move images\.pdf up/ })
      .click();
    download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Merge 2 PDFs/ }).click();
    expect(await pageSizes(await (await download).path())).toEqual([...images, ...text]);
  });

  test('sorting A→Z puts a folder drop back in name order', async ({ page }) => {
    await open(page, '/merge-pdf');
    await addFiles(page, ['text.pdf', 'images.pdf']);
    await expect(list(page).getByRole('listitem').first()).toContainText('text.pdf');
    await page.getByRole('button', { name: 'Sort A→Z' }).click();
    await expect(list(page).getByRole('listitem').first()).toContainText('images.pdf');
  });

  test('a locked PDF stops the merge and is named in the error', async ({ page }) => {
    await open(page, '/merge-pdf');
    await addFiles(page, ['text.pdf', 'locked.pdf']);
    await expect(list(page).getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: /^Merge 2 PDFs/ }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('locked.pdf', { timeout: 30_000 });
    await expect(alert).toContainText('password');
  });

  test('non-PDFs are refused rather than silently dropped', async ({ page }) => {
    await open(page, '/merge-pdf');
    await addFiles(page, ['text.pdf', 'photo.jpg']);
    await expect(page.getByRole('status')).toContainText('skipped');
    await expect(list(page).getByRole('listitem')).toHaveCount(1);
  });
});

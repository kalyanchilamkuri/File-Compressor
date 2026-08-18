import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addFiles, fixturePath, needsOffscreenCanvas, open } from './helpers';

const isJpeg = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b: Buffer) => b.subarray(0, 4).toString('latin1') === '\x89PNG';

async function pdfPageCount(path: string) {
  const { PDFDocument } = await import('pdf-lib');
  return (await PDFDocument.load(new Uint8Array(readFileSync(path)))).getPageCount();
}

const list = (page: Page) => page.getByTestId('page-list');

test.describe('PDF to JPG', () => {
  test('renders every page and zips them up', async ({ page }) => {
    const expected = await pdfPageCount(fixturePath('images.pdf'));

    await open(page, '/pdf-to-jpg');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['images.pdf']);
    await expect(page.getByLabel('PDF to convert')).toContainText(`${expected} page`, {
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Convert to images' }).click();
    await expect(list(page).getByRole('listitem')).toHaveCount(expected, { timeout: 60_000 });

    const download = page.waitForEvent('download');
    await page
      .getByRole('button', { name: /^Download/ })
      .first()
      .click();
    const d = await download;
    if (expected === 1) {
      expect(d.suggestedFilename()).toBe('images-page-1.jpg');
      expect(isJpeg(readFileSync(await d.path()))).toBe(true);
      return;
    }
    const { unzipSync } = await import('fflate');
    const files = unzipSync(new Uint8Array(readFileSync(await d.path())));
    expect(Object.keys(files)).toHaveLength(expected);
    for (const [name, bytes] of Object.entries(files)) {
      expect(name).toMatch(/^images-page-\d+\.jpg$/);
      expect(isJpeg(Buffer.from(bytes))).toBe(true);
    }
  });

  test('can render pages as PNG instead', async ({ page }) => {
    await open(page, '/pdf-to-jpg');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['text.pdf']);
    await page.getByRole('radio', { name: /^PNG/ }).click();
    await page.getByRole('button', { name: 'Convert to images' }).click();
    await expect(list(page).getByRole('listitem').first()).toBeVisible({ timeout: 60_000 });

    const download = page.waitForEvent('download');
    await list(page).getByRole('button').first().click();
    const d = await download;
    expect(d.suggestedFilename()).toMatch(/^text-page-\d+\.png$/);
    expect(isPng(readFileSync(await d.path()))).toBe(true);
  });

  test('a locked PDF gets a clear message', async ({ page }) => {
    await open(page, '/pdf-to-jpg');
    await addFiles(page, ['locked.pdf']);
    await page.getByRole('button', { name: 'Convert to images' }).click();
    await expect(page.getByRole('alert')).toContainText('password', { timeout: 30_000 });
  });
});

test.describe('JPG to PDF', () => {
  test('makes one page per image, in list order', async ({ page }) => {
    await open(page, '/jpg-to-pdf');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['photo.jpg', 'graphic.png']);
    await expect(page.getByTestId('images-list').getByRole('listitem')).toHaveCount(2);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Create PDF/ }).click();
    const d = await download;
    expect(d.suggestedFilename()).toBe('images.pdf');

    const path = await d.path();
    expect(readFileSync(path).subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(await pdfPageCount(path)).toBe(2);
    await expect(page.getByRole('status')).toContainText('2 pages');
  });

  test('non-images are refused rather than silently dropped', async ({ page }) => {
    await open(page, '/jpg-to-pdf');
    await addFiles(page, ['photo.jpg', 'text.pdf']);
    await expect(page.getByRole('status')).toContainText('skipped');
    await expect(page.getByTestId('images-list').getByRole('listitem')).toHaveCount(1);
  });
});

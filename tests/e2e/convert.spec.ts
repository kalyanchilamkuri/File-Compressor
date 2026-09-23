import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addFiles, needsOffscreenCanvas, open, row, waitDone } from './helpers';

const SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
} as const;

/** Downloads the one finished result and returns its name and first bytes. */
async function downloadResult(page: Page, fileName: string) {
  const download = page.waitForEvent('download');
  await row(page, fileName)
    .getByRole('button', { name: /^Download/ })
    .click();
  const d = await download;
  return { name: d.suggestedFilename(), bytes: readFileSync(await d.path()) };
}

const startsWith = (bytes: Buffer, sig: readonly number[]) => sig.every((v, i) => bytes[i] === v);

test.describe('Convert', () => {
  test('a converted file keeps its name and gains the new extension', async ({ page }) => {
    await open(page, '/webp-to-png');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['photo.webp']);
    await waitDone(page, 'photo.webp');

    const { name, bytes } = await downloadResult(page, 'photo.webp');
    // The whole point of convert mode: not "photo-compressed.png".
    expect(name).toBe('photo.png');
    expect(startsWith(bytes, SIGNATURES.png)).toBe(true);
  });

  test('a convert page preselects its output format', async ({ page }) => {
    await open(page, '/webp-to-png');
    await expect(page.getByRole('radio', { name: /^PNG/ })).toHaveAttribute('aria-checked', 'true');
    await open(page, '/heic-to-jpg');
    await expect(page.getByRole('radio', { name: /^JPG/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('the format picker and More options stay in sync', async ({ page }) => {
    await open(page, '/webp-to-jpg');
    await page.getByRole('radio', { name: /^WebP/ }).click();
    await page.getByRole('button', { name: 'More options' }).click();
    await expect(page.getByLabel('Format').first()).toHaveValue('webp');
  });

  test('PNG to JPG warns that transparency was filled in', async ({ page }) => {
    await open(page, '/png-to-jpg');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['alpha.png']);
    const r = await waitDone(page, 'alpha.png');
    await expect(r).toContainText('Transparent areas were filled with white');

    const { name, bytes } = await downloadResult(page, 'alpha.png');
    expect(name).toBe('alpha.jpg');
    expect(startsWith(bytes, SIGNATURES.jpeg)).toBe(true);
  });

  test('convert pages show a format picker instead of size goals', async ({ page }) => {
    await open(page, '/convert-image');
    await expect(page.getByText('Convert to', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Under 100 KB/ })).toHaveCount(0);

    await open(page, '/compress-image');
    await expect(page.getByRole('radio', { name: /^Under 100 KB/ })).toBeVisible();
  });
});

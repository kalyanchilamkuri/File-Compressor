import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  addFiles,
  fixtureSize,
  needsOffscreenCanvas,
  open,
  outputBytes,
  row,
  waitDone,
} from './helpers';

test.describe('PDF', () => {
  test('image-heavy PDFs shrink by at least half; text-only PDFs never grow', async ({ page }) => {
    await open(page, '/compress-pdf');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['images.pdf', 'text.pdf']);
    await waitDone(page, 'images.pdf');
    await waitDone(page, 'text.pdf');
    expect(await outputBytes(page, 'images.pdf')).toBeLessThan(fixtureSize('images.pdf') / 2);
    expect(await outputBytes(page, 'text.pdf')).toBeLessThanOrEqual(fixtureSize('text.pdf'));

    const download = page.waitForEvent('download');
    await row(page, 'images.pdf')
      .getByRole('button', { name: /^Download/ })
      .click();
    const out = readFileSync(await (await download).path());
    expect(out.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('Scanned mode rasterises pages in the worker', async ({ page }) => {
    await open(page, '/compress-pdf');
    await needsOffscreenCanvas(page);
    await page.getByRole('button', { name: 'More options' }).click();
    await page.getByLabel('Method').selectOption('scanned');
    await addFiles(page, ['scanned.pdf']);
    const r = await waitDone(page, 'scanned.pdf');
    await expect(r).toContainText('no longer be selected');
    expect(await outputBytes(page, 'scanned.pdf')).toBeLessThan(fixtureSize('scanned.pdf'));
  });

  test('a locked PDF gets a clear message', async ({ page }) => {
    await open(page, '/compress-pdf');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['locked.pdf']);
    await expect(row(page, 'locked.pdf')).toContainText('locked with a password', {
      timeout: 30_000,
    });
  });

  test('a 120-page PDF is handled', async ({ page }) => {
    await open(page, '/compress-pdf');
    await needsOffscreenCanvas(page);
    await addFiles(page, ['long.pdf']);
    await waitDone(page, 'long.pdf');
  });
});

test.describe('Audio and video', () => {
  test('WAV becomes a much smaller AAC file', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'Playwright WebKit on Windows/Linux lacks the needed media codecs',
    );
    await open(page, '/compress-audio');
    await addFiles(page, ['tone.wav']);
    await waitDone(page, 'tone.wav', 90_000);
    expect(await outputBytes(page, 'tone.wav')).toBeLessThan(fixtureSize('tone.wav') / 4);
    await expect(
      row(page, 'tone.wav').getByRole('button', { name: /Download tone-compressed\.m4a/ }),
    ).toBeVisible();
  });

  test('a WebM video is compressed with WebCodecs', async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Video encoding is verified in Chromium; other engines vary by OS build',
    );
    await open(page, '/compress-video');
    await addFiles(page, ['clip.webm']);
    await waitDone(page, 'clip.webm', 90_000);
    expect(await outputBytes(page, 'clip.webm')).toBeLessThan(fixtureSize('clip.webm'));
  });
});

test.describe('Archives', () => {
  test('a folder round-trips to ZIP on the ZIP page', async ({ page }) => {
    await open(page, '/zip');
    await page.getByTestId('file-input').setInputFiles([
      { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
      { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('world') },
    ]);
    await expect(page.getByTestId('zip-list').getByRole('listitem')).toHaveCount(2);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Create ZIP' }).click();
    const d = await download;
    expect(d.suggestedFilename()).toBe('files.zip');
    const { unzipSync } = await import('fflate');
    const files = unzipSync(new Uint8Array(readFileSync(await d.path())));
    expect(new TextDecoder().decode(files['a.txt'])).toBe('hello');
    expect(new TextDecoder().decode(files['b.txt'])).toBe('world');
  });

  for (const name of ['archive.7z', 'archive.tar.gz', 'archive.zip']) {
    test(`extracts ${name}`, async ({ page }) => {
      await open(page);
      await addFiles(page, [name]);
      await row(page, name).getByRole('button', { name: 'Open archive' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Extract all' }).click();
      await expect(dialog.getByTestId('extracted-list')).toContainText('readme.txt', {
        timeout: 30_000,
      });
      await dialog.getByRole('button', { name: 'Compress these files' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'skipped' })).toBeVisible();
    });
  }

  test('asks for the password of an encrypted ZIP and rejects a wrong one', async ({ page }) => {
    await open(page);
    await addFiles(page, ['locked.zip']);
    await row(page, 'locked.zip').getByRole('button', { name: 'Open archive' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Password required');
    await dialog.getByLabel('Password').fill('wrong');
    await dialog.getByRole('button', { name: 'Unlock' }).click();
    await dialog.getByRole('button', { name: 'Extract all' }).click();
    await expect(dialog).toContainText('didn’t work');
    await dialog.getByLabel('Password').fill('secret');
    await dialog.getByRole('button', { name: 'Unlock' }).click();
    await dialog.getByRole('button', { name: 'Extract all' }).click();
    await expect(dialog.getByTestId('extracted-list')).toContainText('secret.txt');
  });
});

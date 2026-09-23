import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import {
  addFiles,
  chooseGoal,
  fixtureSize,
  needsOffscreenCanvas,
  open,
  outputBytes,
  row,
  waitDone,
} from './helpers';

test('drop 3 images → compress → download all as ZIP, without sending file data anywhere', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const leaks: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (req.postDataBuffer()?.length) leaks.push(`${req.method()} ${req.url()} with a body`);
    if (url.protocol.startsWith('http') && url.origin !== origin)
      leaks.push(`third-party ${req.url()}`);
  });

  await open(page);
  await needsOffscreenCanvas(page);
  const names = ['photo.jpg', 'graphic.png', 'photo.webp'];
  await addFiles(page, names);
  for (const n of names) await waitDone(page, n);

  for (const n of names) {
    expect(await outputBytes(page, n)).toBeLessThan(fixtureSize(n));
  }
  await expect(page.getByTestId('saved-summary')).toContainText('You saved');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download all \(3\) as ZIP/ }).click();
  const file = await (await download).path();
  const zip = unzipSync(new Uint8Array(readFileSync(file)));
  expect(Object.keys(zip).sort()).toEqual([
    'graphic-compressed.png',
    'photo-compressed.jpg',
    'photo-compressed.webp',
  ]);
  const jpeg = zip['photo-compressed.jpg']!;
  expect([jpeg[0], jpeg[1], jpeg[2]]).toEqual([0xff, 0xd8, 0xff]);
  expect(jpeg.length).toBeLessThan(fixtureSize('photo.jpg'));

  expect(leaks).toEqual([]);
});

test('"Under 100 KB" gets a large photo under 100 KB', async ({ page }) => {
  await open(page);
  await needsOffscreenCanvas(page);
  await chooseGoal(page, 'Under 100 KB');
  await addFiles(page, ['photo-large.jpg']);
  await waitDone(page, 'photo-large.jpg', 90_000);
  expect(await outputBytes(page, 'photo-large.jpg')).toBeLessThanOrEqual(100 * 1024);
});

test('location data is removed and the photo is rotated upright', async ({ page }) => {
  await open(page);
  await needsOffscreenCanvas(page);
  await addFiles(page, ['photo-exif.jpg']);
  await waitDone(page, 'photo-exif.jpg');
  const download = page.waitForEvent('download');
  await row(page, 'photo-exif.jpg')
    .getByRole('button', { name: /^Download/ })
    .click();
  const bytes = readFileSync(await (await download).path());
  // No EXIF block (which held the GPS position) remains.
  expect(bytes.includes(Buffer.from('Exif\0\0', 'latin1'))).toBe(false);
  // The fixture is 1600×1067 with orientation 6, so the upright result is portrait.
  const dims = await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    return [bmp.width, bmp.height];
  }, bytes.toString('base64'));
  expect(dims).toEqual([1067, 1600]);
});

test('compare slider opens, moves with the keyboard and closes', async ({ page }) => {
  await open(page);
  await needsOffscreenCanvas(page);
  await addFiles(page, ['photo.jpg']);
  await waitDone(page, 'photo.jpg');
  await row(page, 'photo.jpg')
    .getByRole('button', { name: /Compare/ })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img', { name: 'Compressed' })).toBeVisible();
  const slider = dialog.getByRole('slider', { name: /divider/ });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '52');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('unsupported files get a friendly message and do not stop the batch', async ({ page }) => {
  await open(page);
  await needsOffscreenCanvas(page);
  await page.getByTestId('file-input').setInputFiles([
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('just text') },
    { name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not really a jpeg') },
  ]);
  await addFiles(page, ['graphic.png']);
  await expect(row(page, 'notes.txt')).toHaveAttribute('data-status', 'unsupported');
  await expect(row(page, 'fake.jpg')).toContainText('isn’t supported');
  await waitDone(page, 'graphic.png');
});

test('browsers without the needed features get a clear message instead of a crash', async ({
  page,
}) => {
  await open(page);
  const has = await page.evaluate(() => typeof OffscreenCanvas !== 'undefined');
  test.skip(has, 'Only meaningful where OffscreenCanvas is missing');
  await addFiles(page, ['graphic.png']);
  await expect(row(page, 'graphic.png')).toContainText('Please update it');
});

import { expect, test } from '@playwright/test';
import { addFiles, open, row, waitDone } from './helpers';

test('works offline after the first visit; engines work offline once used', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Service worker offline emulation is reliable in Chromium');
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // A reload lets the (now active) service worker control the page, so the engine it loads next is cached.
  await page.reload();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await addFiles(page, ['graphic.png']);
  await waitDone(page, 'graphic.png');

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  // PNG was used online, so it works offline.
  await addFiles(page, ['alpha.png']);
  await waitDone(page, 'alpha.png');
  // JPEG's encoder was never downloaded: the user gets a clear explanation instead of a crash.
  await addFiles(page, ['photo.jpg']);
  await expect(row(page, 'photo.jpg')).toContainText('You’re offline', { timeout: 30_000 });

  await page.goto('/compress-pdf');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compress PDF files');
  await context.setOffline(false);
});

import { expect, test } from '@playwright/test';

test('homepage renders header, footer, and theme toggle', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Files never leave your device')).toBeVisible();

  const toggle = page.getByRole('button', { name: /switch to (dark|light) theme/i });
  await expect(toggle).toBeVisible();

  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await toggle.click();
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(after).not.toBe(before);
});

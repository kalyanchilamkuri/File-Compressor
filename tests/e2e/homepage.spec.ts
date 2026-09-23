import { expect, test } from '@playwright/test';

test('homepage renders header, footer, and theme toggle', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('contentinfo').getByText('Files never leave your device'),
  ).toBeVisible();
  await expect(page.getByTestId('dropzone')).toBeVisible();

  const toggle = page.getByRole('button', { name: /switch to (dark|light) theme/i });
  await expect(toggle).toBeVisible();

  await expect(page.locator('astro-island[ssr]')).toHaveCount(0); // hydrated

  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(before ? /^(?!.*\bdark\b)/ : /\bdark\b/);
});

test.describe('dark system preference', () => {
  test.use({ colorScheme: 'dark' });

  test('applies the system theme without hydration errors, and a manual choice persists', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    // After hydration the label must reflect the real (dark) theme, not the server default.
    const toggle = page.getByRole('button', { name: 'Switch to light theme' });
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');

    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

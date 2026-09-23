import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SEO_PAGES } from '../../src/config/seoPages';
import { open } from './helpers';

test('every tool and landing page has a unique title, H1 and description', async ({ page }) => {
  const seen = { title: new Set<string>(), h1: new Set<string>(), description: new Set<string>() };
  for (const p of SEO_PAGES) {
    await page.goto(`/${p.slug}`);
    const title = await page.title();
    const h1 = await page.getByRole('heading', { level: 1 }).innerText();
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    for (const [k, v] of Object.entries({ title, h1, description }) as [
      keyof typeof seen,
      string,
    ][]) {
      expect(seen[k].has(v), `${k} "${v}" repeats on /${p.slug}`).toBe(false);
      seen[k].add(v);
    }
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(3);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new RegExp(`/og/${p.slug}\\.jpg$`),
    );
  }
});

test('landing pages preselect their goal', async ({ page }) => {
  await open(page, '/compress-image-to-50kb');
  await expect(page.getByRole('radio', { name: /^Under 50 KB/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await open(page, '/png-to-webp');
  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByLabel('Format').first()).toHaveValue('webp');
});

test('sitemap lists every page; robots points to it', async ({ page }) => {
  const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
  for (const p of SEO_PAGES) expect(sitemap).toContain(`/${p.slug}/`);
  expect(sitemap).toContain('/privacy/');
  expect(sitemap).not.toContain('/404');
  await page.goto('/robots.txt');
  await expect(page.locator('body')).toContainText('sitemap-index.xml');
});

test('mobile layout has no horizontal scroll @mobile', async ({ page }) => {
  await open(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeVisible();
});

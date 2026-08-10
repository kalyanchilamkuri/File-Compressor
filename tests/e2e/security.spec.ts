import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// `astro preview` does not serve Cloudflare's `_headers`, so apply the built
// CSP ourselves. This catches inline scripts that the policy would block.
function builtCsp(): string {
  const headers = readFileSync(new URL('../../dist/_headers', import.meta.url), 'utf8');
  const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1]?.trim();
  if (!csp) throw new Error('No CSP in dist/_headers — run `npm run build` first');
  return csp;
}

test('page hydrates under the production CSP with no violations', async ({ page, baseURL }) => {
  const csp = builtCsp();
  expect(csp).not.toContain('{{');

  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    if (headers['content-type']?.includes('text/html')) headers['content-security-policy'] = csp;
    await route.fulfill({ response, headers });
  });

  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/content security policy/i.test(msg.text())) violations.push(msg.text());
  });

  await page.goto(baseURL ?? '/');
  // Under a CSP that blocks the island runtime, the `ssr` attribute is never removed.
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const toggle = page.getByRole('button', { name: /switch to (dark|light) theme/i });
  const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(wasDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
  expect(violations).toEqual([]);
});

test('makes no requests to third-party origins', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost:4321').origin;
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.push(req.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

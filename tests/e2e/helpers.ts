import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Image and PDF engines need OffscreenCanvas in workers (Safari 16.4+). Playwright's WebKit build
 * for Windows/Linux lacks it, so those tests only run where the real feature exists.
 */
export async function needsOffscreenCanvas(page: Page) {
  const has = await page.evaluate(() => typeof OffscreenCanvas !== 'undefined');
  test.skip(!has, 'This browser build has no OffscreenCanvas (real Safari 16.4+ does)');
}

export const fixturePath = (name: string) => resolve(process.cwd(), 'tests/fixtures', name);
export const fixtureSize = (name: string) => readFileSync(fixturePath(name)).length;

/** Opens a page and waits until the React islands have hydrated. */
export async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

export async function addFiles(page: Page, names: string[]) {
  await page.getByTestId('file-input').setInputFiles(names.map(fixturePath));
}

export function row(page: Page, fileName: string) {
  return page.getByTestId('file-row').filter({ hasText: fileName });
}

/** Waits for a row to finish, failing fast with the row's text if it errors. */
export async function waitDone(page: Page, fileName: string, timeout = 60_000) {
  const r = row(page, fileName);
  await expect(r).toHaveAttribute('data-status', /done|error|unsupported/, { timeout });
  const status = await r.getAttribute('data-status');
  if (status !== 'done') throw new Error(`${fileName} ended as ${status}: ${await r.innerText()}`);
  return r;
}

/** Parses "1.2 MB → 300 KB" out of a row into the output size in bytes. */
export async function outputBytes(page: Page, fileName: string) {
  const text = await row(page, fileName).innerText();
  const m = /→\s*([\d.]+)\s*(B|KB|MB|GB)/.exec(text);
  if (!m) throw new Error(`No size in row: ${text}`);
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[m[2] as 'B'];
  return Number(m[1]) * mult;
}

/** Fresh settings for each test: the app remembers the last goal in localStorage. */
export async function chooseGoal(page: Page, label: string) {
  await page.getByRole('radio', { name: new RegExp(`^${label}`) }).click();
}

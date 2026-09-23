// Renders public/favicon.svg to the PNG icons the PWA manifest and iOS need.
// Usage: node scripts/make-icons.mjs (needs Playwright's Chromium: npx playwright install chromium)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', root), 'utf8');

const icons = [
  { file: 'icons/icon-192.png', size: 192, pad: 0 },
  { file: 'icons/icon-512.png', size: 512, pad: 0 },
  // Maskable icons need the artwork inside the central 80% safe zone.
  { file: 'icons/maskable-512.png', size: 512, pad: 0.12, bg: '#0284c7' },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.08, bg: '#0284c7' },
  { file: 'favicon-32.png', size: 32, pad: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await mkdir(new URL('icons/', root), { recursive: true });
for (const { file, size, pad, bg } of icons) {
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${bg ?? 'transparent'}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await writeFile(new URL(file, root), await page.screenshot({ omitBackground: !bg }));
  console.log(`wrote public/${file}`);
}
await browser.close();

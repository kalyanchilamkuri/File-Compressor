// Renders a 1200×630 Open Graph JPEG for the homepage and every page in src/config/seoPages.ts.
// Usage: node --experimental-strip-types scripts/make-og.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { SEO_PAGES } from '../src/config/seoPages.ts';
import { APP_NAME } from '../src/config/site.ts';

const out = new URL('../public/og/', import.meta.url);
await mkdir(out, { recursive: true });
const icon = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');

const escape = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pages = [
  {
    slug: 'home',
    h1: 'Compress any file, privately',
    lead: 'Images, PDFs, videos and audio. In your browser, never uploaded.',
  },
  ...SEO_PAGES,
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const p of pages) {
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;
      background:radial-gradient(circle at 85% 15%,#0ea5e9 0,transparent 45%),linear-gradient(135deg,#020617,#0c4a6e);color:#fff;font-family:Segoe UI,Helvetica,Arial,sans-serif">
      <div style="display:flex;align-items:center;gap:20px;font-size:40px;font-weight:700">
        <div style="width:72px;height:72px">${icon.replace('<svg ', '<svg width="72" height="72" ')}</div>${APP_NAME}
      </div>
      <div>
        <div style="font-size:72px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;max-width:1000px">${escape(p.h1)}</div>
        <div style="margin-top:24px;font-size:32px;color:#bae6fd;max-width:1000px">${escape(p.lead)}</div>
      </div>
      <div style="font-size:26px;color:#e0f2fe">🔒 Files never leave your device · Free · No signup</div>
    </div></body></html>`);
  await writeFile(
    new URL(`${p.slug}.jpg`, out),
    await page.screenshot({ type: 'jpeg', quality: 85 }),
  );
}
await browser.close();
console.log(`make-og: wrote ${pages.length} images to public/og`);

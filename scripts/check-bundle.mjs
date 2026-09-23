// Fails if the JavaScript a page loads up front is over budget (PLAN.md §6 Phase 8: 150 KB gzipped).
// Engines are dynamic imports and workers, so they're excluded automatically: only scripts in the
// HTML, island components/renderers and their *static* imports are counted.
// Usage: node scripts/check-bundle.mjs [budgetKB]
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const budget = Number(process.argv[2] ?? 150) * 1024;

const STATIC_IMPORT = /(?:^|[;\n}])\s*import\s*(?:[\w*{}\s,$]+from\s*)?["']([^"']+\.m?js)["']/g;

async function closure(entry, seen) {
  if (seen.has(entry)) return;
  seen.add(entry);
  const code = await readFile(entry, 'utf8');
  for (const [, spec] of code.matchAll(STATIC_IMPORT)) {
    if (spec.startsWith('.') || spec.startsWith('/')) {
      await closure(spec.startsWith('/') ? join(dist, spec) : resolve(dirname(entry), spec), seen);
    }
  }
}

const pages = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.html'));
let worst = { page: '', bytes: 0 };
for (const page of pages) {
  const html = await readFile(join(dist, page), 'utf8');
  const urls = new Set([
    ...[...html.matchAll(/<script[^>]+src="([^"]+\.m?js)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/(?:component|renderer)-url="([^"]+)"/g)].map((m) => m[1]),
  ]);
  const files = new Set();
  for (const u of urls) if (u.startsWith('/')) await closure(join(dist, u), files);
  let bytes = 0;
  for (const f of files) bytes += gzipSync(await readFile(f)).length;
  // Inline scripts (island runtime, theme bootstrap) count too.
  for (const [, body] of html.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    bytes += gzipSync(body).length;
  }
  if (bytes > worst.bytes) worst = { page, bytes };
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(
  `Largest initial JS: ${kb(worst.bytes)} gzipped on /${worst.page} (budget ${kb(budget)})`,
);
if (worst.bytes > budget) {
  console.error('Initial JavaScript is over budget. Keep heavy code behind dynamic import().');
  process.exit(1);
}

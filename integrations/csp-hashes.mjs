// @ts-check
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Placeholder in `public/_headers` that is replaced at build time with the
 * sha256 hashes of every inline <script> Astro emitted (theme bootstrap,
 * island hydration runtime, ...). Without these, `script-src 'self'` blocks
 * them and no React island hydrates in production.
 */
export const PLACEHOLDER = '{{INLINE_SCRIPT_HASHES}}';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const JS_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

/**
 * Returns CSP hash sources for the executable inline scripts in an HTML document.
 * @param {string} html
 * @returns {string[]}
 */
export function inlineScriptHashes(html) {
  const hashes = [];
  for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase() ?? '';
    // Data blocks (JSON-LD, import maps are not used) are never executed, so CSP ignores them.
    if (!JS_TYPES.has(type)) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

/**
 * @param {string} headers contents of `_headers`
 * @param {Iterable<string>} hashes
 */
export function injectHashes(headers, hashes) {
  if (!headers.includes(PLACEHOLDER)) {
    throw new Error(`csp-hashes: ${PLACEHOLDER} not found in _headers`);
  }
  return headers.replaceAll(PLACEHOLDER, [...new Set(hashes)].sort().join(' '));
}

/** @param {string} dir */
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => join(e.parentPath, e.name));
}

/**
 * Extra CSP sources for features behind flags (ads, Pro license checks). Each list replaces a
 * `{{CSP_<NAME>}}` placeholder in `_headers`; an empty list removes the placeholder.
 * @typedef {{ script?: string[]; connect?: string[]; frame?: string[]; img?: string[] }} ExtraSources
 */

/**
 * @param {string} headers
 * @param {ExtraSources} extra
 */
export function injectExtraSources(headers, extra) {
  return headers.replace(/ ?\{\{CSP_(SCRIPT|CONNECT|FRAME|IMG)\}\}/g, (_, name) => {
    const list = extra[/** @type {keyof ExtraSources} */ (name.toLowerCase())] ?? [];
    return list.length ? ` ${[...new Set(list)].join(' ')}` : '';
  });
}

/**
 * @param {{ extra?: ExtraSources }} [options]
 * @returns {import('astro').AstroIntegration}
 */
export default function cspHashes({ extra = {} } = {}) {
  return {
    name: 'csp-hashes',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const hashes = new Set();
        for (const file of await htmlFiles(outDir)) {
          for (const h of inlineScriptHashes(await readFile(file, 'utf8'))) hashes.add(h);
        }
        const headersPath = join(outDir, '_headers');
        const headers = injectHashes(await readFile(headersPath, 'utf8'), hashes);
        await writeFile(headersPath, injectExtraSources(headers, extra));
        logger.info(`Added ${hashes.size} inline script hash(es) to _headers CSP`);
      },
    },
  };
}

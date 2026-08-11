// Serves dist/ like Cloudflare Pages would, including the rules in dist/_headers (CSP, caching),
// which `astro preview` ignores. Usage: node scripts/serve-dist.mjs [port]
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.argv[2] ?? process.env.PORT ?? 4333);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
};

/** Parses Cloudflare's _headers format into [pattern, headers] rules. */
async function loadRules() {
  const text = await readFile(join(root, '_headers'), 'utf8').catch(() => '');
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const re = new RegExp(
        `^${line
          .trim()
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')}$`,
      );
      current = { re, headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

const rules = await loadRules();

async function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  if (rel.startsWith('..')) return null;
  for (const candidate of [
    join(root, rel),
    join(root, rel, 'index.html'),
    join(root, `${rel}.html`),
  ]) {
    const s = await stat(candidate).catch(() => null);
    if (s?.isFile()) return candidate;
  }
  return null;
}

createServer(async (req, res) => {
  try {
    const pathname = new URL(`http://x/${(req.url ?? '/').replace(/^\/+/, '')}`).pathname;
    let file = await resolveFile(pathname);
    let status = 200;
    if (!file) {
      // Like Cloudflare Pages: serve the site's 404 page with a 404 status.
      file = await resolveFile('/404.html');
      status = 404;
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const headers = { 'Content-Type': type };
    for (const rule of rules) if (rule.re.test(pathname)) Object.assign(headers, rule.headers);
    // Cloudflare compresses text responses; do the same so local performance numbers are realistic.
    const compress =
      /text|javascript|json|xml|svg|wasm|manifest/.test(type) &&
      /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    if (compress) {
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    res.writeHead(status, headers);
    const stream = createReadStream(file);
    if (compress) stream.pipe(createGzip()).pipe(res);
    else stream.pipe(res);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
  }
}).listen(port, () => console.log(`Serving dist/ with _headers at http://localhost:${port}`));

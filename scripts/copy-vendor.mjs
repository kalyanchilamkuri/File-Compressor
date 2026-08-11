// Copies runtime assets that libraries fetch by URL (not import) into public/vendor.
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}public/vendor`;

const copies = [
  ['node_modules/libarchive.js/dist/worker-bundle.js', 'libarchive/worker-bundle.js'],
  ['node_modules/libarchive.js/dist/libarchive.wasm', 'libarchive/libarchive.wasm'],
  ['node_modules/pdfjs-dist/standard_fonts', 'pdfjs/standard_fonts'],
  ['node_modules/pdfjs-dist/cmaps', 'pdfjs/cmaps'],
  ['node_modules/pdfjs-dist/wasm/openjpeg.wasm', 'pdfjs/wasm/openjpeg.wasm'],
  ['node_modules/pdfjs-dist/wasm/jbig2.wasm', 'pdfjs/wasm/jbig2.wasm'],
  ['node_modules/pdfjs-dist/wasm/qcms_bg.wasm', 'pdfjs/wasm/qcms_bg.wasm'],
];

await rm(out, { recursive: true, force: true });
for (const [from, to] of copies) {
  const dest = `${out}/${to}`;
  await mkdir(dest.slice(0, dest.lastIndexOf('/')), { recursive: true });
  await cp(`${root}${from}`, dest, { recursive: true });
}
console.log(`copy-vendor: copied ${copies.length} assets to public/vendor`);

# Squish

A free web app that compresses images, PDFs, videos, audio, and archives entirely in your browser.

- **No uploads.** Files never leave your device.
- **No signup, no login, no accounts.**
- **No watermarks, no daily limits, no file-count limits.**
- **Works offline** after the first visit (PWA).

See [PLAN.md](./PLAN.md) for the product plan, the status of each phase and deviations.

## Quick start

Requires Node.js 22 (LTS) or 24+ (see `.nvmrc`).

```sh
npm install
npm run dev          # http://localhost:4321
```

Open the page, drop some files on the drop zone (or click **Choose files**), and they compress
straight away with the **Balanced** goal. Pick a goal such as **Under 100 KB** or open
**More options** to change quality, format, size, PDF mode, video resolution and so on.

To try the production build the way Cloudflare serves it (including the CSP from `_headers` and
gzip), run:

```sh
npm run build
npm run serve:dist   # http://localhost:4333
```

## What it does

| File type                        | How                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JPEG, PNG, WebP, AVIF, HEIC, GIF | Decoded in a Web Worker, optionally resized, re-encoded with MozJPEG / OxiPNG (+ libimagequant palette) / libwebp / AVIF. EXIF orientation applied, GPS/EXIF removed. |
| PDF                              | **Smart**: recompresses embedded images with pdf-lib, text stays selectable. **Scanned**: renders pages with pdf.js and rebuilds the PDF.                             |
| MP4, MOV, WebM, MKV              | WebCodecs via Mediabunny (hardware accelerated) to MP4 (H.264/AAC) or WebM. Target size, resolution, fps cap, remove audio. Large outputs go to OPFS, not memory.     |
| MP3, WAV, M4A, AAC, OGG, FLAC    | Mediabunny to AAC, MP3 (LAME WASM) or Opus, by bitrate or target size.                                                                                                |
| ZIP, RAR, 7z, TAR, GZ            | Extract (libarchive.js, incl. password-protected ZIP), list, download, or send contents to the compressor. Create ZIPs from files/folders with fflate (streamed).     |

Every engine is lazy-loaded the first time a file of that type is added; the initial page ships
about 95 KB of gzipped JavaScript. Output that would be larger than the input is discarded and the
original is kept (with metadata stripped losslessly when possible).

## Project structure

```text
/
├─ src/
│  ├─ config/       site.ts (name, URL, feature flags, monetization), presets.ts, seoPages.ts
│  ├─ layouts/      BaseLayout.astro (meta, OG, JSON-LD, theme, header/footer, PWA registration)
│  ├─ pages/        index, [slug] (all tool + landing pages), privacy, terms, pro, 404
│  ├─ components/   React islands (Compressor, DropZone, GoalPicker, FileRow, CompareSlider, …)
│  ├─ engine/       router (magic bytes), queue, pool (workers), targetSize, image/pdf/media/archive
│  ├─ lib/          format, files, opfs, capabilities, license, consent, download, rename
│  └─ styles/
├─ scripts/         asset generators, vendor copy, dist server, bundle budget
├─ integrations/    csp-hashes (injects inline-script hashes + flag-gated origins into _headers)
├─ tests/           unit (Vitest), e2e (Playwright), fixtures
└─ public/          _headers, icons, og images (vendor/ is generated)
```

## Commands

| Command                | Action                                                        |
| :--------------------- | :------------------------------------------------------------ |
| `npm run dev`          | Dev server at `localhost:4321` (copies vendor assets first)   |
| `npm run build`        | Type-check (`astro check`) and build to `./dist/`             |
| `npm run serve:dist`   | Serve `dist/` with `_headers` + gzip, like Cloudflare Pages   |
| `npm run lint`         | ESLint (incl. jsx-a11y and React Hooks rules)                 |
| `npm run typecheck`    | `astro check`                                                 |
| `npm run format`       | Prettier (write); `format:check` to verify only               |
| `npm test`             | Unit tests (Vitest)                                           |
| `npm run test:e2e`     | Playwright against the built site (run `npm run build` first) |
| `npm run check:bundle` | Fails if a page's initial JS exceeds 150 KB gzipped           |
| `npm run gen:fixtures` | Regenerate `tests/fixtures` (Playwright Chromium + Node)      |
| `npm run gen:icons`    | Regenerate PWA/favicon PNGs from `public/favicon.svg`         |
| `npm run gen:og`       | Regenerate Open Graph images for every page                   |

Before running e2e the first time, install browsers: `npx playwright install`.

## Configuration

- **Name, domain, contact:** `src/config/site.ts` (`APP_NAME`, `SITE.url`). Set the real domain
  before launch; canonical URLs, sitemap, robots and OG tags use it.
- **Goals / presets and platform limits:** `src/config/presets.ts` (`LIMITS` for Gmail/Discord).
- **Landing pages:** add an entry to `src/config/seoPages.ts`, then `npm run gen:og`.
- **Feature flags:** `FEATURE_FLAGS` in `src/config/site.ts`, all off by default:
  - `ENABLE_ADS`: reserved ad slots (processing, results, desktop sidebar) + consent banner. Put the
    network's loader URL and CSP origins in `MONETIZATION.adNetwork`; they're added to the CSP at
    build time only when the flag is on.
  - `ENABLE_PRO`: `/pro` page, license key check (`MONETIZATION.license`), saved presets and rename
    patterns; hides ads. The license host is added to `connect-src` automatically.
  - `ENABLE_DONATIONS`: support button in results and footer (`MONETIZATION.donationUrl`).
  - `ENABLE_AFFILIATE`: one sponsored line after results (`MONETIZATION.affiliate`).

## Deploying to Cloudflare Pages

1. Push this repository to GitHub/GitLab.
2. Create a Pages project connected to the repo.
3. Build command `npm run build`, output directory `dist`.
4. `public/_headers` is picked up automatically; the build fills in the CSP hashes.
5. Set `NODE_VERSION=22` if Cloudflare doesn't pick up `.nvmrc`.
6. Optional: turn on Cloudflare Web Analytics (cookieless) in the dashboard; the CSP already allows it.

All files are under Cloudflare's 25 MiB per-file limit (the largest is the ~3.5 MB AVIF encoder).

## Privacy & security rules (non-negotiable)

- No file bytes, file names, or file metadata are ever sent over the network. An e2e test fails
  if any request carries a body or goes to a third-party origin while compressing.
- Analytics is cookieless page views only.
- Strict CSP (`script-src 'self' 'wasm-unsafe-eval'` + hashes); third-party origins only via flags.
- Temporary files in OPFS are cleaned up on later visits and when files are removed.

See [PLAN.md](./PLAN.md) §8–9 for details and known technical pitfalls.

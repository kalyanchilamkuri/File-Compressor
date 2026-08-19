# PLAN.md — Private, No-Signup Online File Compressor

> **Instructions for Claude Code:** This file is the source of truth for this project. Work **one phase at a time**, in order. At the end of each phase, run all tests, run the build, summarize what was done, list any deviations from this plan, and **stop and wait for my approval** before starting the next phase. When a library version or API is uncertain, check the package's current documentation rather than guessing. Keep this file updated: tick off checkboxes as tasks are completed.

---

## 1. Product summary

A free web app that compresses **images, PDFs, videos, audio, and archives** entirely **in the user's browser**.

**Core promises (never break these):**

- **No uploads.** Files never leave the user's device. No file data is ever sent to any server.
- **No signup, no login, no accounts.**
- **No watermarks, no daily limits, no file-count limits.**
- **Works offline** after the first visit (PWA).
- **Fast and clean UI.** One screen, one drop zone, minimal clutter.

**Key differentiators vs competitors (TinyPNG, Squoosh, iLovePDF, Smallpdf, VEED):**

1. One drop zone for every file type (mixed batches allowed).
2. **Target-size compression** ("under 100 KB", "fits Gmail", custom KB/MB).
3. Before/after comparison slider with zoom.
4. Unlimited batch + one-click ZIP download.
5. Archive creation/extraction alongside media compression.

**App name:** `Shrinkly` (configured centrally in `src/config/site.ts`).

---

## 2. Tech stack

| Area        | Choice                                                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Astro (static output) + React islands + TypeScript (strict mode)                                                                                                           |
| Styling     | Tailwind CSS (via the official Vite plugin), dark mode via `class` strategy + system preference                                                                            |
| Workers     | Web Workers + `comlink`                                                                                                                                                    |
| Images      | `@jsquash/jpeg` (MozJPEG), `@jsquash/png`, `@jsquash/oxipng`, `@jsquash/webp`, `@jsquash/avif`, `@jsquash/resize`; `heic2any` (or a maintained alternative) for HEIC input |
| PDF         | `pdf-lib` (structure/rewrite), `pdfjs-dist` (rendering/preview)                                                                                                            |
| Video/Audio | WebCodecs via `mediabunny` (primary); `@ffmpeg/ffmpeg` single-threaded core (fallback only, lazy-loaded)                                                                   |
| Archives    | `fflate` (create ZIP + ZIP download), `libarchive.js` (extract ZIP/RAR/7z/TAR)                                                                                             |
| Large files | Origin Private File System (OPFS) for temp storage; chunked processing                                                                                                     |
| PWA         | `@vite-pwa/astro` (or current equivalent)                                                                                                                                  |
| Testing     | Vitest (unit), Playwright (e2e, Chromium + WebKit + Firefox)                                                                                                               |
| Lint/format | ESLint + Prettier                                                                                                                                                          |
| Hosting     | Cloudflare Pages (static), headers via `public/_headers`                                                                                                                   |
| Analytics   | Cloudflare Web Analytics (privacy-friendly, no cookies)                                                                                                                    |

**Rules:**

- Every heavy engine (video, PDF, archive, each codec) must be **lazy-loaded** only when a file of that type is added. The initial page must stay light.
- No backend. No API routes. Pure static site.
- Do **not** enable COOP/COEP cross-origin isolation headers by default (they break ad scripts). Use single-threaded ffmpeg.wasm. See §9.

---

## 3. Folder structure

```
/
├─ PLAN.md
├─ astro.config.mjs
├─ public/
│  ├─ _headers                 # Cloudflare Pages headers (CSP, caching)
│  ├─ robots.txt
│  └─ icons/                   # PWA icons
├─ src/
│  ├─ config/
│  │  ├─ site.ts               # APP_NAME, URLs, feature flags
│  │  └─ presets.ts            # Goal presets (sizes, formats) — single source of truth
│  ├─ layouts/
│  │  └─ BaseLayout.astro      # SEO meta, OG tags, JSON-LD, theme
│  ├─ pages/
│  │  ├─ index.astro           # Main all-in-one compressor
│  │  ├─ compress-image.astro
│  │  ├─ compress-pdf.astro
│  │  ├─ compress-video.astro
│  │  ├─ compress-audio.astro
│  │  ├─ zip.astro
│  │  ├─ [slug].astro          # Programmatic SEO landing pages (Phase 6)
│  │  ├─ privacy.astro
│  │  ├─ terms.astro
│  │  └─ pro.astro             # Pro license page (Phase 7)
│  ├─ components/
│  │  ├─ Compressor.tsx        # Main React island
│  │  ├─ DropZone.tsx          # Drag/drop, file picker, folder drop, paste
│  │  ├─ GoalPicker.tsx        # Preset chips + custom target size
│  │  ├─ AdvancedOptions.tsx   # Collapsible: quality, format, resize, metadata
│  │  ├─ FileList.tsx
│  │  ├─ FileRow.tsx           # Name, before→after size, progress, actions
│  │  ├─ CompareSlider.tsx     # Before/after with zoom
│  │  ├─ ResultSummary.tsx     # "You saved X MB (Y%)" + Download all
│  │  ├─ AdSlot.tsx            # Placeholder ad component (see §8)
│  │  ├─ SupportButton.tsx     # Donation link
│  │  └─ ThemeToggle.tsx
│  ├─ engine/
│  │  ├─ router.ts             # Detect real file type (magic bytes) → engine
│  │  ├─ queue.ts              # Job queue, concurrency limit, cancellation
│  │  ├─ types.ts              # Job, Result, Options, Engine interface
│  │  ├─ targetSize.ts         # Shared target-size search logic
│  │  ├─ image/  (worker + codecs)
│  │  ├─ pdf/
│  │  ├─ video/
│  │  ├─ audio/
│  │  └─ archive/
│  ├─ lib/
│  │  ├─ format.ts             # Byte formatting, percentages
│  │  ├─ opfs.ts               # OPFS temp file helpers + cleanup
│  │  ├─ capabilities.ts       # Feature detection (WebCodecs, OPFS, etc.)
│  │  └─ license.ts            # Pro license key check (Phase 7)
│  └─ styles/global.css
└─ tests/
   ├─ fixtures/                # Sample files of every type (small, committed)
   ├─ unit/
   └─ e2e/
```

---

## 4. Architecture

### Engine interface

Every engine implements the same interface so the UI never cares about file type:

```ts
interface Engine {
  id: 'image' | 'pdf' | 'video' | 'audio' | 'archive';
  accepts(type: DetectedType): boolean;
  compress(
    input: File,
    options: CompressOptions,
    onProgress: (fraction: number) => void,
    signal: AbortSignal,
  ): Promise<CompressResult>;
}

interface CompressOptions {
  mode: 'quality' | 'targetSize';
  quality?: number; // 0–100
  targetBytes?: number;
  outputFormat?: string; // 'keep' | 'jpeg' | 'webp' | 'avif' | 'mp4' ...
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata: boolean; // default true
}

interface CompressResult {
  blob: Blob;
  fileName: string;
  originalBytes: number;
  outputBytes: number;
  warnings: string[]; // e.g. "Could not reach target; smallest achievable size used"
}
```

### Rules

- Engines run **inside Web Workers** (via Comlink). The main thread only handles UI.
- Queue concurrency: `min(navigator.hardwareConcurrency - 1, 4)` for images; **1** for video.
- Every job is **cancellable** (AbortSignal) and has its own progress.
- If output is **larger** than input, keep the original and mark the row "Already optimized".
- Output file naming: `originalname-compressed.ext`.
- Never crash the whole batch because one file fails — mark that row as failed with a readable error.

### Target-size logic (`engine/targetSize.ts`)

- **Images:** binary search on quality (range 5–95), max 8 iterations, pick the highest quality whose output ≤ target. If quality 5 is still too large, progressively downscale dimensions (by 0.85 per step) and retry. If still impossible, return the smallest result with a warning.
- **Video:** `videoBitrate = (targetBytes * 8 * 0.95) / durationSeconds − audioBitrate`. Audio default 96 kbps (64 kbps if target is tight). If the resulting bitrate is too low for the source resolution, step resolution down (1080p → 720p → 480p → 360p). Warn if the target is unrealistic.
- **PDF:** step down embedded-image resolution/quality (see Phase 3) until ≤ target or floor reached.
- **Audio:** bitrate = `(targetBytes * 8 * 0.97) / durationSeconds`, clamped to 32–320 kbps.

---

## 5. Goal presets (`src/config/presets.ts`)

All preset values live here only. Initial list:

| Preset label       | Applies to    | Rule                                                             |
| ------------------ | ------------- | ---------------------------------------------------------------- |
| Under 20 KB        | Images        | targetBytes = 20 KB                                              |
| Under 50 KB        | Images        | targetBytes = 50 KB                                              |
| Under 100 KB       | Images, PDF   | targetBytes = 100 KB                                             |
| Under 200 KB       | Images, PDF   | targetBytes = 200 KB                                             |
| Under 500 KB       | Images, PDF   | targetBytes = 500 KB                                             |
| Under 1 MB         | Images, PDF   | targetBytes = 1 MB                                               |
| Email (Gmail)      | All           | targetBytes = 24 MB (safety margin under the limit)              |
| WhatsApp           | Images, Video | image: max 1600px long side, quality 80; video: 720p             |
| Discord            | Video, Images | targetBytes = 9.5 MB (keep configurable; platform limits change) |
| Website            | Images        | WebP, max 1920px, quality 78                                     |
| Balanced (default) | All           | quality mode, sensible defaults per engine                       |
| Custom             | All           | user-entered KB/MB                                               |

Presets not applicable to a file type are disabled (greyed) with a tooltip.

---

## 6. Phases

### Phase 0 — Project setup

- [x] Initialize Astro + React + TypeScript (strict) + Tailwind.
- [x] ESLint, Prettier, Vitest, Playwright configured; `npm run lint`, `test`, `test:e2e`, `build` scripts.
- [x] `src/config/site.ts` with `APP_NAME` and feature flags (`ENABLE_ADS=false`, `ENABLE_PRO=false`, `ENABLE_DONATIONS=false`).
- [x] BaseLayout with meta tags, Open Graph, favicon, dark/light theme (respect system preference, allow toggle).
- [x] `public/_headers` with a strict Content-Security-Policy (allow only self + analytics for now), long cache for hashed assets.
- [x] README with setup and deploy instructions for Cloudflare Pages.

**Done when:** `npm run build` produces a static site; a blank homepage with header, footer, theme toggle deploys and scores 95+ on Lighthouse.

### Phase 1 — Core UI + Image compressor (MVP)

- [x] `DropZone`: drag & drop, click to select, **folder drop** (recursive), **paste from clipboard** (Ctrl/Cmd+V), multiple files, keyboard accessible.
- [x] `router.ts`: detect type via magic bytes (JPEG, PNG, WebP, AVIF, HEIC, GIF, PDF, MP4/MOV, WebM, MKV, MP3, WAV, OGG, M4A, ZIP, RAR, 7z). Unsupported → friendly message.
- [x] Job queue with concurrency, progress, cancel, retry.
- [x] Image engine in a worker: decode (incl. HEIC), optional resize, encode to JPEG (MozJPEG) / PNG (OxiPNG, and lossy palette option) / WebP / AVIF. Output format "Keep original" by default.
- [x] Strip EXIF/GPS metadata by default (toggle in Advanced Options). Respect EXIF orientation before stripping.
- [x] `GoalPicker` with presets + custom target size; `AdvancedOptions` (collapsible) with quality slider, output format, max width/height, metadata toggle.
- [x] `FileRow`: thumbnail, name, original → new size, % saved, progress bar, Compare, Download, Remove.
- [x] `CompareSlider`: draggable before/after, zoom (wheel/pinch), pan.
- [x] `ResultSummary`: total saved ("You saved 19.1 MB (82%)") + **Download all as ZIP** (fflate, streamed).
- [x] Smart suggestion: if a PNG photo or large JPEG, suggest "Convert to WebP/AVIF to save ~X% more" (compute by actually trying in background only when cheap; otherwise estimate).
- [x] Unit tests for router, target-size search, byte formatting. E2E: drop 3 images → compress → download ZIP.

**Done when:** 50 mixed images (incl. 20 MB photos and HEIC) compress without freezing the UI; target "Under 100 KB" is hit for typical photos; works on Chrome, Firefox, Safari desktop and mobile.

### Phase 2 — PWA, polish, accessibility

- [x] PWA: installable, offline after first visit, engines cached after first use.
- [x] Footer badge: "🔒 Files never leave your device • Works offline".
- [x] Full keyboard navigation, visible focus, ARIA labels, screen-reader announcements for progress/completion, color contrast AA.
- [x] Mobile layout (single column, large tap targets).
- [x] Empty/error/loading states designed properly. Friendly copy, no jargon.
- [x] `capabilities.ts`: detect missing browser features and show a clear message instead of failing silently.

**Done when:** Lighthouse ≥ 95 on Performance, Accessibility, Best Practices, SEO; site works offline in airplane mode.

### Phase 3 — PDF compressor

- [x] **Smart mode (default):** use `pdf-lib` to find embedded images; decode, downscale to a target DPI (Light 200 / Balanced 150 / Strong 100), re-encode with MozJPEG, replace in place. Keeps text selectable. Also remove unused objects/metadata where safe.
- [x] **Scanned mode (auto-suggested when pages are mostly images):** render each page with `pdfjs-dist` to canvas at chosen DPI → JPEG → rebuild PDF with `pdf-lib`. Clearly warn that text will not be selectable.
- [x] Target-size support for PDFs (step DPI/quality down).
- [x] Page thumbnail preview + before/after on first page.
- [x] Handle password-protected PDFs gracefully ("This PDF is locked" — do not attempt to break encryption).
- [x] Test fixtures: text-only PDF, image-heavy PDF, scanned PDF, form PDF, 100+ page PDF. _(All except a form PDF; plus a locked PDF.)_

**Done when:** image-heavy PDFs reduce 50%+ at Balanced without unreadable text; text-only PDFs never grow in size.

### Phase 4 — Video and audio

- [x] Video engine using WebCodecs (via `mediabunny`): input MP4/MOV/WebM/MKV, output MP4 (H.264 + AAC) by default; optional WebM.
- [x] Options: presets, target size, resolution (Original/1080p/720p/480p/360p), frame rate cap, remove audio toggle.
- [x] Optional trim (start/end). _(Engine and Advanced Options UI supported.)_
- [ ] Fallback: lazy-load single-threaded `ffmpeg.wasm` only when WebCodecs can't handle the codec/container. Warn that fallback is slower. _(Dropped, see §11.)_
- [x] Use OPFS for large files; process in chunks; show accurate progress + ETA; cancel frees memory.
- [x] Audio engine: MP3/WAV/AAC/OGG/OPUS/M4A input → output AAC/Opus/MP3 at chosen bitrate or target size.
- [x] Safari handling: detect unsupported audio encoding on older iOS, inform user.

**Done when:** a 1 GB 1080p video compresses on a mid-range laptop without crashing; "Discord" and "Email" presets hit their targets.

### Phase 5 — Archives

- [x] Create ZIP from any dropped files/folders (option: compress files first, then zip).
- [x] Extract ZIP/RAR/7z/TAR via `libarchive.js`; list contents; download individual files or all; option to "compress extracted files" in one click.
- [x] Encrypted archives: show "Password required" prompt for ZIP where supported; otherwise explain clearly.

**Done when:** can extract a RAR and a 7z fixture, and round-trip a folder to ZIP.

### Phase 6 — SEO and content

- [x] Dedicated pages: `/compress-image`, `/compress-pdf`, `/compress-video`, `/compress-audio`, `/zip`. Each preloads the relevant engine/presets.
- [x] Programmatic landing pages from a data file (`src/config/seoPages.ts`), e.g.:
  - compress-image-to-20kb, -50kb, -100kb, -200kb
  - compress-pdf-to-100kb, -200kb, -500kb, -1mb
  - compress-video-for-whatsapp, -discord, -email
  - compress-jpg, compress-png, compress-heic, png-to-webp, jpg-to-avif
  - reduce-photo-size-for-job-application, reduce-signature-size
    Each page: unique H1, unique 150–300 word helpful guide, 4–6 FAQs, tool embedded with preset preselected.
- [x] JSON-LD: `WebApplication` + `FAQPage` + `BreadcrumbList`.
- [x] Auto-generated `sitemap.xml`, `robots.txt`, canonical URLs, OG images per page.
- [x] Privacy policy (emphasize: no uploads, no accounts, analytics is cookieless) and Terms pages.
- [x] Internal linking between related pages.

**Done when:** all pages build statically, pass Lighthouse SEO 100, and each has unique title/description.

### Phase 7 — Monetization hooks (all behind feature flags)

- [x] `AdSlot.tsx`: renders nothing unless `ENABLE_ADS=true`. Reserved fixed-height space to prevent layout shift (CLS). Three slots only:
  1. Beside/below the progress area while processing
  2. Below the result summary
  3. Desktop sidebar (hidden on mobile)
     **Never:** pop-ups, pop-unders, interstitials, or ads styled like download buttons.
- [x] Consent banner integration point (for EU/UK ad requirements) — only loads when ads are enabled.
- [x] Update CSP in `_headers` to allow the ad network domains when enabled.
- [x] `SupportButton.tsx`: link to donation page (URL in config), shown in result summary + footer.
- [x] Pro license (`license.ts`, `ENABLE_PRO`): user enters a license key on `/pro`; validate via the payment provider's license-validation endpoint (e.g. Lemon Squeezy) — this is the **only** network call besides analytics/ads, and it sends only the key, never file data. Store validated status in localStorage with periodic re-validation. Pro unlocks: no ads, saved custom presets, bulk rename patterns. **All core compression stays free.**
- [x] Contextual affiliate/suggestion slot after results (one line, config-driven, off by default).

**Done when:** toggling each flag cleanly shows/hides its feature with no layout shift and no errors.

### Phase 8 — Hardening and launch

- [ ] Test matrix: Chrome, Edge, Firefox, Safari (macOS), Safari (iOS), Chrome (Android). Low-memory device test. _(Automated: Playwright Chromium, Firefox, WebKit and an iPhone viewport. Real Safari/iOS/Android devices still need a manual pass.)_
- [x] Fixture regression tests: compression ratio and output validity for every file type.
- [ ] Error reporting: privacy-safe (no file names or content), optional. _(Not added.)_
- [x] Final performance pass: initial JS bundle budget ≤ 150 KB gzipped (engines excluded). _(95 KB; enforced by `npm run check:bundle` in CI.)_
- [ ] Deploy to Cloudflare Pages with custom domain; verify headers, caching, PWA. _(Needs the account and domain; steps in README and docs/LAUNCH.md.)_
- [x] Launch checklist doc: Product Hunt, Show HN, Reddit, AlternativeTo listings. _([docs/LAUNCH.md](./docs/LAUNCH.md))_

---

## 7. UI/UX rules

- One main screen. Drop zone is the hero. Advanced settings hidden behind "More options".
- Default behavior must give good results with **zero** configuration.
- Show estimated/actual savings clearly; celebrate the result ("You saved…").
- Plain language: "Smaller file" / "Better quality", not "CRF" or "quantization".
- Respect `prefers-reduced-motion`. Dark mode fully supported.
- Clean, modern look: generous whitespace, one accent color, rounded cards, subtle animation.

---

## 8. Privacy & security rules (non-negotiable)

- No file bytes, file names, or file metadata are ever sent over the network.
- Analytics: page views and anonymous events only (e.g. "compressed_image", with file-size bucket), never file names.
- Strip metadata by default for images.
- Strict CSP. No inline third-party scripts except those explicitly enabled by feature flags.
- Clean up OPFS temp files after download or on page load.

---

## 9. Known technical pitfalls

- **COOP/COEP vs ads:** multi-threaded ffmpeg.wasm needs cross-origin isolation, which blocks most ad iframes. Default to WebCodecs + single-threaded ffmpeg.wasm. Do not enable COOP/COEP unless explicitly decided later (possibly testing `Cross-Origin-Embedder-Policy: credentialless`).
- **Memory:** avoid holding multiple large ArrayBuffers; transfer buffers to workers (Transferable); use OPFS for video.
- **HEIC:** decoding is heavy; lazy-load and process one at a time.
- **iOS Safari:** stricter memory limits and gaps in WebCodecs audio on older versions; detect and degrade gracefully.
- **Output larger than input:** always compare and keep the smaller file.

---

## 10. Definition of done (whole project)

- All phases' checkboxes ticked; all tests pass; build is clean with zero TypeScript errors.
- Lighthouse ≥ 95 in all categories on homepage and a sample landing page.
- No network requests contain file data (verify in DevTools during e2e).
- Works offline after first visit.

---

## 11. Implementation status and deviations (September 2026)

All phases are implemented. Checks: `lint`, `format:check`, `astro check` (0 errors), 100 unit tests,
61 Playwright tests across Chromium, Firefox, WebKit and an iPhone viewport (15 skipped where that
Playwright build lacks a browser feature), Lighthouse (mobile) 99 / 100 / 100 / 100 on the homepage,
a landing page and `/zip`, and initial JS of 95 KB gzipped.

**Deviations from the plan**

- **No ffmpeg.wasm fallback.** Its core WASM is 32 MB, over Cloudflare Pages' 25 MiB per-file
  limit, and serving it from a CDN would add a third-party origin. Instead Mediabunny's WASM AAC and
  MP3 encoders fill the browser gaps (e.g. Firefox AAC), and inputs a browser can't decode get a
  clear message suggesting Chrome/Edge.
- **HEIC decoding uses `heic-to`** (maintained, CSP-safe build) instead of `heic2any` (unmaintained).
  Safari decodes HEIC natively and skips it.
- **Tool pages are one template.** `/compress-image`, `/compress-pdf`, `/compress-video`,
  `/compress-audio` and `/zip` come from `src/pages/[slug].astro` + `seoPages.ts`, like the landing
  pages, instead of five separate files.
- **Lossy PNG uses `libimagequant-wasm`**, since jSquash has no quantizer.
- **"Keep original" also strips metadata.** When the original is kept (output would be larger), GPS
  and EXIF are removed losslessly for JPEG/PNG/WebP so the privacy default still holds.
- **Output larger than input** is kept only when the format was unchanged; if the user explicitly
  asked for another format (e.g. WebP), the converted file is returned with a warning.
- **OG images are JPEGs** generated by `scripts/make-og.mjs`.
- **Local e2e/preview use `scripts/serve-dist.mjs`** (applies `_headers` and gzip like Cloudflare)
  instead of `astro preview`, so every test runs under the production CSP.
- **Engines are cached on first use, not precached**, as planned; offline use of a never-used engine
  shows an explanation instead of failing.

**Not done / needs a person**

- Real-device pass (Safari macOS/iOS, Chrome Android, low-memory phone), a real HEIC photo, a 1 GB
  video, and a RAR fixture (no RAR creator available here). See docs/LAUNCH.md.
- Video trim UI, a form-field PDF fixture, optional error reporting.
- Set `SITE.url` to the real domain and deploy.

# Code review — September 2026

Branch: `review/fixes` (based on `master` @ `01dfb6a`).

## Scope, and what this review could not cover

The repository is at **Phase 0 (scaffolding)** of `PLAN.md`: one page, a header, footer and theme
toggle. There is **no compression code yet**. No drop zone, engines, workers, queue, target-size
logic, PDF/video/audio/archive handling or PWA exist. So compression quality, target-size
accuracy, "keep the original if bigger", large-file memory and Safari codec support **could not
be reviewed** because there is nothing to run. Forward-looking notes for those areas are in
[Recommendations](#top-recommendations-for-what-to-build-next).

Everything that does exist was reviewed: config, layout, component, CSP/headers, SEO, tooling and
tests.

### Baseline (before fixes)

| Check                  | Result                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm install`          | OK, 0 vulnerabilities. `EBADENGINE` warnings: local Node 23.3 is rejected by vitest, eslint-visitor-keys, wasm-runtime |
| `npm run lint`         | Pass                                                                                                                   |
| `npm run format:check` | **Fail**: `.claude/launch.json`                                                                                        |
| `astro check`          | 0 errors, 1 hint: `tseslint.config` is deprecated                                                                      |
| `npm test`             | 1/1 pass (only a sanity test)                                                                                          |
| `npm run build`        | Pass. Output contains **3 inline `<script>` blocks**                                                                   |
| `npm run test:e2e`     | Ran against a stray **dev** server on :4321, not the build. Firefox/WebKit binaries not installed                      |

### After fixes

lint ✅ · typecheck ✅ (0 errors / 0 warnings / 0 hints) · format ✅ · unit 6/6 ✅ · build ✅ ·
e2e (Chromium) 4/4 ✅, also stable across 3 repeats. Firefox and WebKit e2e were **not run** because
their browser binaries aren't installed on this machine (`npx playwright install`).

## Findings and fixes

Commits: **A** = `911abe8` (security and theme), **B** = `64d9a78` (tooling and SEO).

### Critical

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                     | Fix                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **The CSP blocks every inline script.** `_headers` sets `script-src 'self'`, but Astro puts the island hydration runtime inline and the theme bootstrap is also inline. On Cloudflare Pages, **no React island would ever hydrate** and the saved or system theme would never apply. The future `Compressor` island would be dead on arrival. Local preview never applies `_headers`, so nothing caught it. | **A**: new `integrations/csp-hashes.mjs` hashes every inline script after build and puts the hashes into `dist/_headers`. The build fails if the placeholder is missing. A new e2e test serves pages **with the built CSP enforced** and checks that hydration works with no violations. I confirmed this test fails when the hashes are removed. |

### High

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                     | Fix                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **Hydration mismatch in `ThemeToggle` for dark-mode users.** The server renders "light", while the client's `useState` initializer reads "dark". React logs a hydration error and throws away the server HTML so it can re-render the island on the client. That means a console error on every dark-mode visit, wasted work, and a pattern that will break badly once islands carry state. | **A**: read the theme through `useSyncExternalStore`, using the `<html>` class as the source of truth plus a server snapshot. An e2e test covers the dark system preference with no console errors. |
| H2  | **E2E tests could test the wrong server.** Playwright reused whatever was on :4321, usually `astro dev`, so the production build went untested. The theme test also clicked before hydration, which made it racy.                                                                                                                                                                           | **A**: Playwright now runs `preview` on its own port (4329), and tests wait for `astro-island[ssr]` to disappear before clicking.                                                                   |

### Medium

| #   | Finding                                                                                                                                                      | Fix                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| M1  | `localStorage` access throws when storage is blocked (Safari privacy settings, some embedded webviews). The inline theme script and the toggle had no guard. | **A**: wrapped in try/catch. The toggle still works for the current page.                                          |
| M2  | `color-scheme: light dark` ignored the manual choice. A user on a dark OS who picks light got dark scrollbars and form controls.                             | **A**: `color-scheme` now follows the `.dark` class.                                                               |
| M3  | The footer promised **"Works offline"**, but there is no service worker or PWA. That's a false claim on a privacy-positioned product.                        | **A**: removed until Phase 2 ships.                                                                                |
| M4  | `robots.txt` pointed at `/sitemap-index.xml`, which didn't exist.                                                                                            | **B**: added `@astrojs/sitemap`. `robots.txt` is now generated from the configured `site`.                         |
| M5  | `twitter:card=summary_large_image` with no `og:image`, which is invalid.                                                                                     | **A**: switched to `summary` (with a comment on when to switch back). Also added `og:site_name`.                   |
| M6  | `engines` allowed Node 23, which the toolchain rejects. There was no pinned Node version for Cloudflare Pages.                                               | **B**: engines is now `^22.12 \|\| >=24`, plus a `.nvmrc` pinning 22 and README notes.                             |
| M7  | Windows checkouts with `core.autocrlf=true` convert files to CRLF, and then `prettier --check` fails on every file.                                          | **B**: added `.gitattributes` with `eol=lf`.                                                                       |
| M8  | ESLint ran **no a11y rules on `.astro` files**, where all the page markup lives.                                                                             | **B**: added astro's jsx-a11y preset for templates. I checked that `.tsx` still gets the full `jsx-a11y` rule set. |

### Low

| Finding                                                                                                   | Fix |
| --------------------------------------------------------------------------------------------------------- | --- |
| Theme didn't follow OS changes when no manual choice was made                                             | A   |
| `theme-color` was hard-coded dark, including for light mode                                               | A   |
| No skip link. Emoji in the footer was read aloud by screen readers                                        | A   |
| No structured data. Added a `WebApplication` JSON-LD block (CSP doesn't apply to it; the hasher skips it) | A   |
| Canonical URL is now built from Astro `site`, which is set once from `SITE.url` in the Astro config       | A   |
| CSP now has `object-src 'none'`. Added HSTS (without `includeSubDomains`, see decisions below)            | A   |
| `min-h-screen` → `min-h-dvh` (iOS Safari toolbar); `.ico` gets `sizes` so SVG favicon wins                | A   |
| `@types/react*` were in `dependencies`                                                                    | B   |
| Deprecated `tseslint.config` (the only `astro check` hint)                                                | B   |
| No `typecheck` script. `.claude/launch.json` failed Prettier                                              | B   |

## Not fixed, and why

| Item                                                                                                  | Why                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`SITE.url` is `https://example.com`**. Canonical URLs, sitemap, robots and JSON-LD all point there. | Needs the real domain. This is a **launch blocker** and a one-line change in `src/config/site.ts`.                                                                                                                                    |
| Favicon is the default Astro logo. There's no `apple-touch-icon`, web manifest or `og:image`.         | Needs brand assets. Planned for Phase 2 (PWA) and Phase 6.                                                                                                                                                                            |
| `.npmrc` has `legacy-peer-deps=true`.                                                                 | Strict peer resolution now succeeds (`npm install --dry-run --no-legacy-peer-deps`), so it hides nothing today. Removing it adds about 116 auto-installed peer packages to the lockfile. I recommend removing it, but it's your call. |
| React (about 66 KB gzipped) ships for a single theme button.                                          | Fine once the `Compressor` island exists. If Phase 6 landing pages should load lighter, make `ThemeToggle` a plain `<button>` with a small script.                                                                                    |
| `style-src 'unsafe-inline'` kept.                                                                     | React `style={{}}` attributes (progress bars, compare slider) need it. Hashes don't cover attributes. The risk is low with a strict `script-src`.                                                                                     |
| Firefox and WebKit e2e not run.                                                                       | Browser binaries are missing locally. Run `npx playwright install` and then `npm run test:e2e`.                                                                                                                                       |
| No CI.                                                                                                | Out of scope for a fix pass. See recommendations.                                                                                                                                                                                     |

## Decisions for the owner

1. **CSP strategy.** I chose a build step that writes hashes into the `_headers` **header**, so a
   single policy keeps `frame-ancestors` working. The alternative is Astro's built-in
   `security.csp`, which emits a `<meta>` CSP. That would give two policies to reason about, and
   `frame-ancestors`/reporting can't live in a meta tag. When ads land (Phase 7), their loaders
   usually inject scripts dynamically. You will then need `'strict-dynamic'` or host allow-lists.
   Revisit the policy then.
2. **HSTS scope.** `includeSubDomains`/`preload` were left off because they affect every subdomain
   of the production domain. Add them once you know the domain is HTTPS-only.
3. **`legacy-peer-deps`.** See the table above.

## Top recommendations for what to build next

1. **Set the real domain, then add CI.** Use a GitHub Actions workflow that runs `lint`,
   `typecheck`, `test`, `build`, and `test:e2e` on all three engines. The CSP e2e test only
   protects you if it runs.
2. **Add `'wasm-unsafe-eval'` to `script-src` when the first codec lands.** jSquash, pdf.js and
   ffmpeg.wasm all compile WebAssembly, and the current CSP will block them. Use `worker-src 'self'`
   and serve worker/wasm files from `/_astro` instead of relying on `blob:`.
3. **Make the privacy promise testable.** `tests/e2e/security.spec.ts` already asserts that there
   are zero third-party requests. Extend it in Phase 1 so it drops real fixtures, compresses, and
   downloads while asserting that no request body is sent at all. Add an allow-list only for the
   Cloudflare beacon (page views only) once analytics is on.
4. **Build `targetSize.ts` as a pure, unit-tested module first.** Cover the binary search,
   downscale fallback, "smallest achievable + warning" and "keep original if larger" with
   table-driven tests before wiring codecs.
5. **Plan for iOS Safari early.** Use OPFS only via `createSyncAccessHandle` in a worker (Safari
   ≥ 15.2). Process HEIC one at a time. Feature-detect `VideoEncoder`/`AudioEncoder`
   (audio encoding is missing on older iOS). Keep one large `ArrayBuffer` alive at a time and
   transfer it to workers. Add a WebKit mobile project (`devices['iPhone 14']`) to Playwright now.
6. **Enforce the bundle budget from PLAN §6 Phase 8 automatically.** Add a size check in CI so
   engines can't slip into the initial chunk.

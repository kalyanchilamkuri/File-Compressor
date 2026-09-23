# Squish

A free web app that compresses images, PDFs, videos, audio, and archives entirely in your browser.

- **No uploads.** Files never leave your device.
- **No signup, no login, no accounts.**
- **No watermarks, no daily limits, no file-count limits.**
- **Works offline** after the first visit (PWA).

See [PLAN.md](./PLAN.md) for the full product plan and build phases.

## Tech stack

Astro (static output) + React islands + TypeScript (strict), Tailwind CSS, Web Workers, Vitest, Playwright. No backend, no API routes — a pure static site. See PLAN.md §2 for the full list.

## Project structure

```text
/
├─ src/
│  ├─ config/       # site config, feature flags, presets
│  ├─ layouts/      # BaseLayout.astro (meta, theme, header/footer)
│  ├─ pages/        # Astro routes
│  ├─ components/   # React islands
│  ├─ engine/       # compression engines (image/pdf/video/audio/archive), run in Web Workers
│  ├─ lib/          # shared helpers
│  └─ styles/
├─ tests/
│  ├─ unit/         # Vitest
│  ├─ e2e/          # Playwright
│  └─ fixtures/     # sample files for tests
└─ public/
   └─ _headers      # Cloudflare Pages headers (CSP, caching)
```

## Commands

All commands run from the project root:

| Command                | Action                                            |
| :--------------------- | :------------------------------------------------ |
| `npm install`          | Install dependencies                              |
| `npm run dev`          | Start the dev server at `localhost:4321`          |
| `npm run build`        | Type-check (`astro check`) and build to `./dist/` |
| `npm run preview`      | Preview the production build locally              |
| `npm run lint`         | Lint with ESLint                                  |
| `npm run format`       | Format with Prettier                              |
| `npm run format:check` | Check formatting without writing                  |
| `npm run test`         | Run unit tests (Vitest)                           |
| `npm run test:watch`   | Run unit tests in watch mode                      |
| `npm run test:e2e`     | Run end-to-end tests (Playwright)                 |

Before running `test:e2e` for the first time, install browser binaries:

```sh
npx playwright install
```

## Deploying to Cloudflare Pages

1. Push this repository to GitHub/GitLab.
2. In the Cloudflare dashboard, create a new Pages project connected to the repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Cloudflare Pages automatically picks up `public/_headers` for response headers (CSP, caching) — no extra configuration needed.
5. No environment variables or backend services are required; this is a fully static site.

## Privacy & security rules (non-negotiable)

- No file bytes, file names, or file metadata are ever sent over the network.
- Analytics (when enabled) is anonymous and cookieless — page views and event names only, never file names.
- Strict CSP; no third-party scripts beyond what's explicitly enabled via feature flags in `src/config/site.ts`.

See [PLAN.md](./PLAN.md) §8–9 for full details and known technical pitfalls.

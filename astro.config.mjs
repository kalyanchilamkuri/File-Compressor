// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';
import cspHashes from './integrations/csp-hashes.mjs';
import { FEATURE_FLAGS, MONETIZATION, SITE } from './src/config/site.ts';

// Packages that locate their .wasm with `new URL(..., import.meta.url)`. Pre-bundling them in dev
// moves the JS away from the .wasm and breaks that lookup.
const WASM_PACKAGES = [
  '@jsquash/avif',
  '@jsquash/jpeg',
  '@jsquash/oxipng',
  '@jsquash/png',
  '@jsquash/resize',
  '@jsquash/webp',
  'libimagequant-wasm',
  'heic-to',
  '@mediabunny/aac-encoder',
  '@mediabunny/mp3-encoder',
];

const pwa = AstroPWA({
  registerType: 'autoUpdate',
  injectRegister: false,
  // Engines over the precache size limit are skipped on purpose (cached on first use instead).
  showMaximumFileSizeToCacheInBytesWarning: true,
  manifest: {
    name: `${SITE.name} — private file compressor`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0284c7',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The app shell (pages, CSS, UI code) is precached on the first visit. Heavy engines (codecs,
    // pdf.js, video) are not; they're cached the first time a file of that type is compressed.
    globPatterns: ['**/*.{html,css,js,mjs,svg,png,ico,webmanifest}'],
    // 404.html is served with a 404 status, which would make the service worker's install fail.
    globIgnores: ['vendor/**', 'icons/maskable-*', 'og/**', '404.html'],
    maximumFileSizeToCacheInBytes: 256 * 1024,
    navigateFallback: '/',
    runtimeCaching: [
      {
        urlPattern: ({ url }) =>
          url.origin === self.location.origin &&
          (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/vendor/')),
        handler: 'CacheFirst',
        options: {
          cacheName: 'engines',
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
  experimental: { directoryAndTrailingSlashHandler: true },
});

/** CSP origins that only exist when their feature flag is on. */
function extraCspSources() {
  const ads = FEATURE_FLAGS.ENABLE_ADS ? MONETIZATION.adNetwork.csp : null;
  return {
    script: ads?.script ?? [],
    frame: ads?.frame ?? [],
    img: ads?.img ?? [],
    connect: [
      ...(ads?.connect ?? []),
      ...(FEATURE_FLAGS.ENABLE_PRO ? [new URL(MONETIZATION.license.validateUrl).origin] : []),
    ],
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  // cspHashes must stay last: it hashes the final inline scripts in the built HTML.
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !/^\/404\/?$/.test(path) && (FEATURE_FLAGS.ENABLE_PRO || !/^\/pro\/?$/.test(path));
      },
    }),
    pwa,
    cspHashes({ extra: extraCspSources() }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { exclude: WASM_PACKAGES },
    worker: { format: 'es' },
    build: {
      // WASM codecs are large but only load on demand.
      chunkSizeWarningLimit: 4096,
    },
  },
});

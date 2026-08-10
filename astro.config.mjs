// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cspHashes from './integrations/csp-hashes.mjs';
import { SITE } from './src/config/site.ts';

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  // Must stay last: it hashes the final inline scripts in the built HTML.
  integrations: [react(), cspHashes()],
  vite: {
    plugins: [tailwindcss()],
  },
});

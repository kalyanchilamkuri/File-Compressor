import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/vendor/**',
    ],
  },
  {
    // Node scripts; make-fixtures/make-og also contain code that runs in a Playwright page.
    files: ['scripts/**/*.mjs', 'integrations/**/*.mjs', '*.config.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  // a11y rules for .astro templates; it also registers the `jsx-a11y` plugin used below.
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
);

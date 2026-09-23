import { describe, expect, it } from 'vitest';
import { presetById } from '../../src/config/presets';
import { SEO_PAGES, pageBySlug } from '../../src/config/seoPages';

/**
 * The e2e suite also checks page uniqueness, but it pays a full browser navigation per page to do
 * it. These are data-level guards: cheap, and they fail the moment a page is added that the engine
 * could not actually deliver.
 */

/** Formats ./engine/image/encode can write. "keep" is not a conversion target. */
const ENCODABLE = new Set(['jpeg', 'png', 'webp', 'avif']);

describe('SEO pages', () => {
  it('have unique slugs, titles, H1s and descriptions', () => {
    for (const key of ['slug', 'title', 'h1', 'description'] as const) {
      const values = SEO_PAGES.map((p) => p[key]);
      expect(new Set(values).size, `duplicate ${key}`).toBe(values.length);
    }
  });

  it('only link to pages that exist', () => {
    for (const page of SEO_PAGES) {
      for (const slug of page.related) {
        expect(pageBySlug(slug), `/${page.slug} links to missing /${slug}`).toBeDefined();
      }
      if (page.parent) {
        expect(
          pageBySlug(page.parent),
          `/${page.slug} has missing parent /${page.parent}`,
        ).toBeDefined();
      }
      expect(page.related, `/${page.slug} links to itself`).not.toContain(page.slug);
    }
  });

  it('reference presets that exist', () => {
    for (const page of SEO_PAGES) {
      if (page.preset) expect(presetById(page.preset), `/${page.slug}`).toBeDefined();
    }
  });

  it('only ask for image formats the encoder can actually write', () => {
    for (const page of SEO_PAGES) {
      const format = page.overrides?.imageFormat;
      if (format === undefined) continue;
      expect(['keep', ...ENCODABLE], `/${page.slug} wants ${format}`).toContain(format);
    }
  });

  it('give every convert page a real output format', () => {
    const converts = SEO_PAGES.filter((p) => p.mode === 'convert');
    expect(converts.length).toBeGreaterThan(0);
    for (const page of converts) {
      // Without this a convert page would show a format picker with nothing selected, and its H1
      // would promise a conversion the page does not perform.
      expect(page.tool, `/${page.slug}`).toBe('compressor');
      expect(ENCODABLE, `/${page.slug} converts to ${page.overrides?.imageFormat}`).toContain(
        page.overrides?.imageFormat,
      );
    }
  });

  it('give every page a guide, FAQs and related links', () => {
    for (const page of SEO_PAGES) {
      expect(page.guide.length, `/${page.slug}`).toBeGreaterThan(0);
      expect(page.faqs.length, `/${page.slug}`).toBeGreaterThanOrEqual(3);
      expect(page.related.length, `/${page.slug}`).toBeGreaterThan(0);
    }
  });
});

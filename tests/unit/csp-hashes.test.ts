import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER,
  inlineScriptHashes,
  injectExtraSources,
  injectHashes,
} from '../../integrations/csp-hashes.mjs';

const sha = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

describe('inlineScriptHashes', () => {
  it('hashes the exact contents of inline scripts, including whitespace', () => {
    const body = '\n  (function () { a(); })();\n';
    expect(inlineScriptHashes(`<head><script>${body}</script></head>`)).toEqual([sha(body)]);
  });

  it('handles module scripts and multiple scripts', () => {
    const html = '<script type="module">a()</script><p></p><script>b()</script>';
    expect(inlineScriptHashes(html)).toEqual([sha('a()'), sha('b()')]);
  });

  it('skips external scripts and non-executable data blocks', () => {
    const html =
      '<script src="/x.js"></script>' +
      '<script type="application/ld+json">{"@type":"WebApplication"}</script>' +
      '<script type="text/javascript">c()</script>';
    expect(inlineScriptHashes(html)).toEqual([sha('c()')]);
  });
});

describe('injectHashes', () => {
  it('replaces the placeholder with sorted, de-duplicated hashes', () => {
    const headers = `/*\n  Content-Security-Policy: script-src 'self' ${PLACEHOLDER}; object-src 'none'\n`;
    expect(injectHashes(headers, ["'b'", "'a'", "'b'"])).toBe(
      "/*\n  Content-Security-Policy: script-src 'self' 'a' 'b'; object-src 'none'\n",
    );
  });

  it('fails loudly if the placeholder is missing, rather than shipping a CSP that blocks hydration', () => {
    expect(() => injectHashes("script-src 'self'", ["'a'"])).toThrow(/not found/);
  });
});

describe('injectExtraSources', () => {
  const csp =
    "script-src 'self' {{CSP_SCRIPT}}; connect-src 'self' {{CSP_CONNECT}}; frame-src 'self' {{CSP_FRAME}}";

  it('adds flag-gated origins to the right directives', () => {
    expect(
      injectExtraSources(csp, { script: ['ads.example'], connect: ['api.example', 'api.example'] }),
    ).toBe("script-src 'self' ads.example; connect-src 'self' api.example; frame-src 'self'");
  });

  it('removes the placeholders when every flag is off', () => {
    expect(injectExtraSources(csp, {})).toBe(
      "script-src 'self'; connect-src 'self'; frame-src 'self'",
    );
  });
});

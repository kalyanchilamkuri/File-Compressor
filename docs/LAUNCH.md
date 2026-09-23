# Launch checklist

## Before going live

- [ ] Set the real domain in `src/config/site.ts` (`SITE.url`) and a contact email (`SITE.contactEmail`).
- [ ] Confirm the name (`APP_NAME`). If it changes, run `npm run gen:og`.
- [ ] Deploy to Cloudflare Pages (build `npm run build`, output `dist`, `NODE_VERSION=22`).
- [ ] Attach the custom domain; enable "Always use HTTPS".
- [ ] Once HTTPS-only is confirmed for all subdomains, consider adding `includeSubDomains; preload` to HSTS in `public/_headers`.
- [ ] Turn on Cloudflare Web Analytics (cookieless).
- [ ] Check the live headers: `curl -sI https://<domain>/ | grep -i content-security-policy` (no `{{` placeholders).
- [ ] Check offline: load the site, compress one image, turn on airplane mode, reload, compress another.
- [ ] Manual device pass (automated tests can't cover these): Safari macOS, Safari iOS, Chrome Android,
      Edge. Include one HEIC photo from an iPhone, one 1 GB video, and a low-memory phone.
- [ ] Submit the sitemap (`/sitemap-index.xml`) in Google Search Console and Bing Webmaster Tools.
- [ ] Run Lighthouse on the live homepage and one landing page (expect 95+ everywhere).

## Listings

- [ ] **Product Hunt**: title "Squish: compress any file, privately in your browser". First comment:
      why it exists (privacy, no uploads, target sizes), what's unique (one drop zone for every
      type, before/after slider, offline). Prepare 4–5 screenshots and a 30-second screen recording.
- [ ] **Show HN**: "Show HN: A private file compressor that runs entirely in the browser". Mention
      the stack (WebCodecs, WASM codecs, OPFS, CSP with no third parties) and invite scrutiny of the
      network tab. Be around for the first two hours.
- [ ] **Reddit**: r/privacy, r/webdev, r/InternetIsBeautiful, r/selfhosted (as a static site),
      and relevant country-specific subreddits for exam/job form sizes. Follow each sub's rules on
      self-promotion.
- [ ] **AlternativeTo**: list as an alternative to TinyPNG, Squoosh, iLovePDF, Smallpdf,
      HandBrake-online tools, VEED.
- [ ] Directories: SaaSHub, Toolify-style tool lists, Privacy Guides forum (tools section).

## After launch

- [ ] Watch Cloudflare analytics for which landing pages bring visitors; add more `seoPages` entries
      for popular size limits.
- [ ] Collect bug reports (GitHub issues). Ask reporters for browser/OS and file type, never the file.
- [ ] Revisit platform limits in `src/config/presets.ts` (`LIMITS`) every few months.

export const APP_NAME = 'Squish';

export const SITE = {
  name: APP_NAME,
  description: `${APP_NAME} compresses images, PDFs, videos, audio, and archives entirely in your browser. No uploads, no signup, no limits.`,
  url: 'https://example.com',
  twitterHandle: '',
  contactEmail: '',
} as const;

export const FEATURE_FLAGS = {
  ENABLE_ADS: false,
  ENABLE_PRO: false,
  ENABLE_DONATIONS: false,
  ENABLE_AFFILIATE: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const MONETIZATION = {
  donationUrl: 'https://ko-fi.com/',
  /** Heights are reserved even before an ad loads, so the page never shifts. */
  adSlots: {
    processing: { minHeight: 100 },
    results: { minHeight: 100 },
    sidebar: { minHeight: 600 },
  },
  /**
   * The ad network's loader and the origins it needs. Added to the CSP at build time only when
   * ENABLE_ADS is true. Pre-filled with Google AdSense's documented origins as a starting point —
   * still needs `scriptUrl` set to your publisher tag
   * (`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX`)
   * once you have an AdSense account. Switching networks means replacing every origin below with
   * that network's own CSP documentation, not just adding to this list.
   */
  adNetwork: {
    scriptUrl: '',
    csp: {
      script: [
        'https://pagead2.googlesyndication.com',
        'https://googlesyndication.com',
      ] as string[],
      connect: [
        'https://pagead2.googlesyndication.com',
        'https://googlesyndication.com',
      ] as string[],
      frame: [
        'https://googleads.g.doubleclick.net',
        'https://tpc.googlesyndication.com',
      ] as string[],
      img: ['https://googlesyndication.com', 'https://googleusercontent.com'] as string[],
    },
  },
  /** One contextual line after results. Off unless ENABLE_AFFILIATE is true. */
  affiliate: { text: '', href: '' },
  /** Payment provider license check. Only the key is ever sent — never file data. */
  license: {
    validateUrl: 'https://api.lemonsqueezy.com/v1/licenses/validate',
    purchaseUrl: '',
    revalidateDays: 7,
  },
} as const;

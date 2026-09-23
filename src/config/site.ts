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
   * ENABLE_ADS is true. Fill in from your network's CSP documentation.
   */
  adNetwork: {
    scriptUrl: '',
    csp: {
      script: [] as string[],
      connect: [] as string[],
      frame: [] as string[],
      img: [] as string[],
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

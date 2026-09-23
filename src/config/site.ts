export const APP_NAME = 'Squish';

export const SITE = {
  name: APP_NAME,
  description: `${APP_NAME} compresses images, PDFs, videos, audio, and archives entirely in your browser. No uploads, no signup, no limits.`,
  url: 'https://example.com',
  twitterHandle: '',
} as const;

export const FEATURE_FLAGS = {
  ENABLE_ADS: false,
  ENABLE_PRO: false,
  ENABLE_DONATIONS: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

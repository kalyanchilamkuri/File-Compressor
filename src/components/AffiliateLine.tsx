import { FEATURE_FLAGS, MONETIZATION } from '../config/site';

/** One optional, clearly marked suggestion line after results. Off unless configured. */
export default function AffiliateLine() {
  const { text, href } = MONETIZATION.affiliate;
  if (!FEATURE_FLAGS.ENABLE_AFFILIATE || !text || !href) return null;
  return (
    <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">
      {text}{' '}
      <a href={href} rel="sponsored noopener" target="_blank" className="font-medium underline">
        Learn more
      </a>
      <span className="ml-1 text-xs text-slate-400">(sponsored)</span>
    </p>
  );
}

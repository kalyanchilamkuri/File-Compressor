import { FEATURE_FLAGS, MONETIZATION } from '../config/site';
import { HeartIcon } from './icons';

export default function SupportButton() {
  if (!FEATURE_FLAGS.ENABLE_DONATIONS) return null;
  return (
    <a
      href={MONETIZATION.donationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
    >
      <HeartIcon className="h-4 w-4" />
      Support this free tool
    </a>
  );
}

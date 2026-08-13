import { useEffect } from 'react';
import { FEATURE_FLAGS, MONETIZATION } from '../config/site';
import { useConsent } from '../lib/consent';
import { usePro } from '../lib/license';

interface Props {
  slot: keyof typeof MONETIZATION.adSlots;
  className?: string;
}

let loaderAdded = false;

/** Adds the ad network's script once, after the visitor has made a consent choice. */
function ensureLoader(personalised: boolean) {
  const src = MONETIZATION.adNetwork.scriptUrl;
  if (loaderAdded || !src) return;
  loaderAdded = true;
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.dataset.npa = personalised ? '0' : '1';
  document.head.appendChild(s);
}

/**
 * Reserved, clearly labelled ad space. Renders nothing unless ads are enabled, never for Pro users,
 * and keeps its height reserved so the page never shifts. Never styled like a download button.
 */
export default function AdSlot({ slot, className = '' }: Props) {
  const pro = usePro();
  const consent = useConsent();
  const enabled = FEATURE_FLAGS.ENABLE_ADS && !pro;

  useEffect(() => {
    if (enabled && consent) ensureLoader(consent === 'granted');
  }, [enabled, consent]);

  if (!enabled) return null;
  const { minHeight } = MONETIZATION.adSlots[slot];
  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={slot}
      style={{ minHeight }}
      className={`mt-4 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-800 ${
        slot === 'sidebar' ? 'hidden lg:flex' : ''
      } ${className}`}
    >
      Advertisement
    </aside>
  );
}

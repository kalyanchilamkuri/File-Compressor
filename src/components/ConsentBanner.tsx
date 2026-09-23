import { FEATURE_FLAGS } from '../config/site';
import { setConsent, useConsent } from '../lib/consent';
import { usePro } from '../lib/license';

/**
 * Ad consent prompt (EU/UK). Only mounted when ads are enabled. For a certified CMP (e.g. Google's
 * Funding Choices), replace this component and call setConsent() from its callback instead.
 */
export default function ConsentBanner() {
  const consent = useConsent();
  const pro = usePro();
  if (!FEATURE_FLAGS.ENABLE_ADS || pro || consent !== null) return null;
  return (
    <div
      role="dialog"
      aria-label="Ad preferences"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="flex-1 text-slate-700 dark:text-slate-300">
        Ads keep this tool free. May our ad partner use cookies to personalise ads? Your files are
        never shared either way.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConsent('denied')}
          className="rounded-full border border-slate-300 px-4 py-2 font-medium dark:border-slate-600"
        >
          Only essential
        </button>
        <button
          type="button"
          onClick={() => setConsent('granted')}
          className="rounded-full bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
        >
          Allow
        </button>
      </div>
    </div>
  );
}

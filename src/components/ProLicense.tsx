import { useId, useState } from 'react';
import { MONETIZATION } from '../config/site';
import { clearLicense, usePro, validateLicense } from '../lib/license';

export default function ProLicense() {
  const pro = usePro();
  const [key, setKey] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'invalid' | 'offline'>('idle');
  const id = useId();

  if (pro) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="font-semibold">Pro is active on this browser. Thank you!</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ads are hidden, and saved presets and rename patterns are unlocked.
        </p>
        <button type="button" onClick={clearLicense} className="mt-3 text-sm font-medium underline">
          Remove license from this browser
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!key.trim()) return;
        setState('checking');
        try {
          setState((await validateLicense(key)) ? 'idle' : 'invalid');
        } catch {
          setState('offline');
        }
      }}
    >
      <label htmlFor={id} className="font-medium">
        License key
      </label>
      <input
        id={id}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Only this key is sent to our payment provider to check it. Your files are never involved.
      </p>
      {state === 'invalid' && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          That key isn’t valid. Check for typos, or contact support.
        </p>
      )}
      {state === 'offline' && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Couldn’t reach the license server. Check your connection and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state === 'checking'}
          className="rounded-full bg-sky-700 px-5 py-2.5 font-medium text-white hover:bg-sky-800 disabled:opacity-70"
        >
          {state === 'checking' ? 'Checking…' : 'Activate Pro'}
        </button>
        {MONETIZATION.license.purchaseUrl && (
          <a
            href={MONETIZATION.license.purchaseUrl}
            className="text-sm font-medium underline"
            rel="noopener"
          >
            Buy a license
          </a>
        )}
      </div>
    </form>
  );
}

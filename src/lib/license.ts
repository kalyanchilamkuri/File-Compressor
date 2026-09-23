import { useSyncExternalStore } from 'react';
import { FEATURE_FLAGS, MONETIZATION } from '../config/site';

const KEY = 'squish:license:v1';

export interface LicenseState {
  key: string;
  valid: boolean;
  checkedAt: number;
}

const listeners = new Set<() => void>();

function read(): LicenseState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LicenseState) : null;
  } catch {
    return null;
  }
}

function write(state: LicenseState | null) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: Pro lasts for this page only.
  }
  cached = state;
  listeners.forEach((l) => l());
}

let cached: LicenseState | null | undefined;

export function isPro(): boolean {
  if (!FEATURE_FLAGS.ENABLE_PRO || typeof window === 'undefined') return false;
  if (cached === undefined) cached = read();
  return !!cached?.valid;
}

/** React hook; always false during server rendering so hydration matches. */
export function usePro(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isPro,
    () => false,
  );
}

/**
 * Checks a key with the payment provider. This is the only request that carries user input, and it
 * sends nothing but the license key.
 */
export async function validateLicense(
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ license_key: key.trim() });
  const res = await fetchImpl(MONETIZATION.license.validateUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  const data = (await res.json().catch(() => ({}))) as { valid?: boolean };
  const valid = res.ok && data.valid === true;
  write({ key: key.trim(), valid, checkedAt: Date.now() });
  return valid;
}

export function clearLicense() {
  write(null);
}

/** Re-checks a stored key every few days. Network failures keep the current status. */
export async function revalidateIfDue(): Promise<void> {
  if (!FEATURE_FLAGS.ENABLE_PRO) return;
  const state = read();
  if (!state?.valid) return;
  const age = Date.now() - state.checkedAt;
  if (age < MONETIZATION.license.revalidateDays * 86_400_000) return;
  try {
    await validateLicense(state.key);
  } catch {
    // Offline: keep Pro until the next successful check.
  }
}

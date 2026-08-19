import { useSyncExternalStore } from 'react';

export type Consent = 'granted' | 'denied';
const KEY = 'shrinkly:consent:v1';
const listeners = new Set<() => void>();

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Not persisted: the banner will ask again next visit.
  }
  memory = value;
  listeners.forEach((l) => l());
}

let memory: Consent | null = null;

/** Consent choice; `undefined` during server rendering and hydration. */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => memory ?? getConsent(),
    () => undefined,
  );
}

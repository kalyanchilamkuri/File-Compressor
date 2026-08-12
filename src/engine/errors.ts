/** Engines (and the codecs they import) download on first use; offline that can fail. */
export function isLoadFailure(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch|NetworkError|WebAssembly\.(instantiate|compile)|both async and sync fetching of the wasm failed/i.test(
    msg,
  );
}

export const OFFLINE_ENGINE_MESSAGE =
  'You’re offline, and this kind of file hasn’t been compressed on this device before. Connect to the internet once and it will work offline from then on.';

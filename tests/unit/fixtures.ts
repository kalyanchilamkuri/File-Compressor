import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Reads a file from tests/fixtures (paths are resolved from the project root). */
export const fixture = (name: string) =>
  new Uint8Array(readFileSync(resolve(process.cwd(), 'tests/fixtures', name)));

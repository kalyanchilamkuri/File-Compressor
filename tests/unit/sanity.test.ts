import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config/site';

describe('project setup sanity check', () => {
  it('exposes an app name', () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});

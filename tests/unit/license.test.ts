import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MONETIZATION } from '../../src/config/site';
import { validateLicense } from '../../src/lib/license';

describe('validateLicense', () => {
  beforeEach(() => localStorage.clear());

  it('sends only the license key, without credentials, and stores the result', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ valid: true }), { status: 200 }),
    );
    expect(await validateLicense('  KEY-123  ', fetchMock as unknown as typeof fetch)).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(MONETIZATION.license.validateUrl);
    expect(init.credentials).toBe('omit');
    expect(String(init.body)).toBe('license_key=KEY-123');
    expect(JSON.parse(localStorage.getItem('shrinkly:license:v1')!)).toMatchObject({
      key: 'KEY-123',
      valid: true,
    });
  });

  it('treats error responses as invalid', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 400 }));
    expect(await validateLicense('bad', fetchMock as unknown as typeof fetch)).toBe(false);
  });
});

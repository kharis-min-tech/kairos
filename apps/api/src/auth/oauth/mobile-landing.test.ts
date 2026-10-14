import { describe, expect, it, vi } from 'vitest';

vi.mock('@kairos/database', () => ({ db: {}, members: {} }));

import { landingUrl } from './handler';
import { generateStateCookie, parseStateCookie } from './state';

const ctx = { env: { FRONTEND_URL: 'https://staging.kairos.kharis.org' } } as never;

describe('OAuth landing for app-started flows', () => {
  it('keeps the state cookie client flag through sign and verify', async () => {
    const cookie = await generateStateCookie(
      { provider: 'google', verifier: 'v', nonce: 'n', client: 'mobile' },
      'secret',
    );
    expect((await parseStateCookie(cookie, 'secret')).client).toBe('mobile');
  });

  it('leaves the flag off for browser-started flows', async () => {
    const cookie = await generateStateCookie(
      { provider: 'google', verifier: 'v', nonce: 'n' },
      'secret',
    );
    expect((await parseStateCookie(cookie, 'secret')).client).toBeUndefined();
  });

  it('lands app flows on the kairos scheme and browser flows on the site', () => {
    expect(landingUrl(ctx, true, '/oauth-callback')).toBe('kairos://oauth-callback');
    expect(landingUrl(ctx, true, '/login', { oauth_error: 'state_mismatch' })).toBe(
      'kairos://login?oauth_error=state_mismatch',
    );
    expect(landingUrl(ctx, false, '/oauth-callback')).toMatch(/^https:\/\/.+\/oauth-callback$/);
  });
});

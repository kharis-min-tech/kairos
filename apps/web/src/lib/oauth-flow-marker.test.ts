import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { consumeOAuthFlowMarker, markOAuthFlowStarted } from './oauth-flow-marker';

const KEY = 'kairos.oauth_flow';

beforeEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('oauth flow marker', () => {
  it('accepts a callback for a flow this browser started', () => {
    markOAuthFlowStarted();
    expect(consumeOAuthFlowMarker()).toBe(true);
  });

  /**
   * The whole point. A cold visit to /oauth-callback, however good the
   * fragment looks, is a link that arrived from somewhere else.
   */
  it('refuses a callback when no flow was started', () => {
    expect(consumeOAuthFlowMarker()).toBe(false);
  });

  it('spends the marker, so one start buys exactly one callback', () => {
    markOAuthFlowStarted();
    expect(consumeOAuthFlowMarker()).toBe(true);
    expect(consumeOAuthFlowMarker()).toBe(false);
  });

  it('clears the marker even when it refuses', () => {
    window.sessionStorage.setItem(KEY, String(Date.now() - 60 * 60 * 1000));
    expect(consumeOAuthFlowMarker()).toBe(false);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('accepts a flow still inside the window', () => {
    window.sessionStorage.setItem(KEY, String(Date.now() - 14 * 60 * 1000));
    expect(consumeOAuthFlowMarker()).toBe(true);
  });

  it('refuses one that has outlived any plausible provider sign-in', () => {
    window.sessionStorage.setItem(KEY, String(Date.now() - 16 * 60 * 1000));
    expect(consumeOAuthFlowMarker()).toBe(false);
  });

  it.each([
    ['not a number', 'yesterday'],
    ['empty', ''],
  ])('refuses a %s marker rather than reading it as time zero', (_label, value) => {
    window.sessionStorage.setItem(KEY, value);
    expect(consumeOAuthFlowMarker()).toBe(false);
  });

  /**
   * A private window with storage blocked would otherwise be unable to use
   * SSO at all. This is the one case that fails open, and it is not
   * attacker-reachable: nobody can make a victim's storage throw from a link.
   */
  it('fails open when sessionStorage itself is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(consumeOAuthFlowMarker()).toBe(true);
  });

  it('does not throw when the marker cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(() => markOAuthFlowStarted()).not.toThrow();
  });

  /**
   * Readable but absent is the attacker-reachable case: a victim with working
   * storage who clicks a crafted link. That one must fail closed.
   */
  it('fails closed when storage works and the marker is simply absent', () => {
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    expect(consumeOAuthFlowMarker()).toBe(false);
  });

  it('survives a removeItem that throws, still refusing a stale marker', () => {
    window.sessionStorage.setItem(KEY, String(Date.now() - 16 * 60 * 1000));
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(consumeOAuthFlowMarker()).toBe(false);
  });
});

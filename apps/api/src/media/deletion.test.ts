import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractCfImageId, deleteImage, deleteStoredImage } from './service';

/**
 * These cover DPIA risk R5. The defect was not that deletion was wrong — there
 * was no deletion at all, anywhere in the codebase, so an erasure request
 * nulled `photo_url` and left a child's photograph permanently retrievable by
 * anyone who had ever seen the URL, and unfindable from our side.
 */
const CFG = { accountId: 'acct-1', accountHash: 'hash-1', apiToken: 'tok-1' };

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}

/** The mock's call tuples are untyped; name the shape once. */
function fetchCalls(): Array<[string, RequestInit]> {
  return fetchMock().mock.calls as unknown as Array<[string, RequestInit]>;
}

describe('extractCfImageId', () => {
  it('pulls the id out of a Cloudflare delivery URL', () => {
    expect(extractCfImageId('https://imagedelivery.net/hash-1/img-abc/public')).toBe('img-abc');
  });

  it('works for any variant, not just public', () => {
    expect(extractCfImageId('https://imagedelivery.net/hash-1/img-abc/avatar')).toBe('img-abc');
  });

  it('returns null for a base64 data URI, because the bytes are in the column', () => {
    // Legacy pre-Cloudflare storage. Nulling the column IS the deletion, and
    // there is no remote object to destroy.
    expect(extractCfImageId('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBeNull();
  });

  it('returns null for a foreign URL, which is not ours to delete', () => {
    expect(extractCfImageId('https://example.test/avatars/a.png')).toBeNull();
  });

  it('is not fooled by a hostname that merely contains the delivery domain', () => {
    expect(extractCfImageId('https://imagedelivery.net.evil.test/hash/img-abc/public')).toBeNull();
  });

  // The two shapes CodeQL named when it flagged the old substring pre-filter.
  // Neither was ever exploitable — the hostname comparison is exact — but they
  // are the cases a substring test gets wrong, so they are pinned.
  it('is not fooled by the delivery domain appearing in the path or the userinfo', () => {
    expect(extractCfImageId('https://evil.test/imagedelivery.net/hash/img-abc/public')).toBeNull();
    expect(extractCfImageId('https://evil.test/?x=imagedelivery.net')).toBeNull();
    expect(extractCfImageId('https://imagedelivery.net@evil.test/hash/img-abc/public')).toBeNull();
  });

  it('rejects anything that is not an http(s) URL without parsing it', () => {
    // A data URI is up to 270KB; the scheme filter is what keeps it from
    // reaching `new URL()`.
    expect(extractCfImageId('data:text/plain,imagedelivery.net')).toBeNull();
    expect(extractCfImageId('ftp://imagedelivery.net/hash/img-abc/public')).toBeNull();
    expect(extractCfImageId('//imagedelivery.net/hash/img-abc/public')).toBeNull();
    expect(extractCfImageId('imagedelivery.net/hash/img-abc/public')).toBeNull();
  });

  it('returns null for empty, null and undefined', () => {
    expect(extractCfImageId('')).toBeNull();
    expect(extractCfImageId(null)).toBeNull();
    expect(extractCfImageId(undefined)).toBeNull();
  });

  it('returns null for a malformed URL rather than throwing', () => {
    expect(extractCfImageId('imagedelivery.net/no-scheme/img/public')).toBeNull();
  });
});

describe('deleteImage', () => {
  it('calls the Cloudflare delete endpoint with the API token', async () => {
    fetchMock().mockResolvedValue({ ok: true, status: 200 });
    await expect(deleteImage(CFG, 'img-abc')).resolves.toBe(true);

    const call = fetchCalls()[0]!;
    expect(call[0]).toBe('https://api.cloudflare.com/client/v4/accounts/acct-1/images/v1/img-abc');
    expect(call[1].method).toBe('DELETE');
    expect((call[1].headers as Record<string, string>)['Authorization']).toBe('Bearer tok-1');
  });

  it('treats 404 as success, because an absent image satisfies the goal', async () => {
    // The caller's requirement is "this must not be retrievable". An image that
    // does not exist already meets it, and failing here would make a repeated
    // erasure look broken.
    fetchMock().mockResolvedValue({ ok: false, status: 404 });
    await expect(deleteImage(CFG, 'img-gone')).resolves.toBe(true);
  });

  it('returns false on a real failure rather than throwing', async () => {
    // Must not throw: this runs during an erasure, and a storage problem may
    // not roll back a member's right to be forgotten.
    fetchMock().mockResolvedValue({ ok: false, status: 500 });
    await expect(deleteImage(CFG, 'img-abc')).resolves.toBe(false);
  });

  it('returns false when the network throws', async () => {
    fetchMock().mockRejectedValue(new Error('network down'));
    await expect(deleteImage(CFG, 'img-abc')).resolves.toBe(false);
  });
});

describe('deleteStoredImage', () => {
  it('reports deleted for a Cloudflare URL that was destroyed', async () => {
    fetchMock().mockResolvedValue({ ok: true, status: 200 });
    await expect(
      deleteStoredImage(CFG, 'https://imagedelivery.net/hash-1/img-abc/public'),
    ).resolves.toBe('deleted');
  });

  it('reports nothing-to-delete for a data URI, and makes no network call', async () => {
    await expect(
      deleteStoredImage(CFG, 'data:image/png;base64,iVBORw0KGgo='),
    ).resolves.toBe('nothing-to-delete');
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('reports nothing-to-delete for an empty column', async () => {
    await expect(deleteStoredImage(CFG, null)).resolves.toBe('nothing-to-delete');
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('reports failed — NOT nothing-to-delete — when credentials are absent', async () => {
    // The distinction is the whole point. "There was nothing to destroy" is a
    // complete erasure; "we could not reach the store" is an incomplete one,
    // and conflating them would let an incomplete erasure be recorded as
    // successful.
    await expect(
      deleteStoredImage(null, 'https://imagedelivery.net/hash-1/img-abc/public'),
    ).resolves.toBe('failed');
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('reports failed when Cloudflare refuses', async () => {
    fetchMock().mockResolvedValue({ ok: false, status: 403 });
    await expect(
      deleteStoredImage(CFG, 'https://imagedelivery.net/hash-1/img-abc/public'),
    ).resolves.toBe('failed');
  });
});

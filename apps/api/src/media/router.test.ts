import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return {
    ...actual,
    resolveGrants: vi.fn(async () => []),
  };
});

vi.mock('../db', () => ({ db: {} }));

const { createApp } = await import('../app');
const app = createApp();

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env['CF_IMAGES_ACCOUNT_ID'] = 'test-account-id';
  process.env['CF_IMAGES_ACCOUNT_HASH'] = 'test-hash';
  process.env['CF_IMAGES_TOKEN'] = 'test-token';
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/media/upload-url', () => {
  it('mints a CF Images upload URL for profile-photo', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: { id: 'img-123', uploadURL: 'https://upload.example/one-time' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'member' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'profile-photo' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { imageId: string; uploadUrl: string; deliveryUrl: string } };
    expect(body.data.imageId).toBe('img-123');
    expect(body.data.uploadUrl).toBe('https://upload.example/one-time');
    expect(body.data.deliveryUrl).toBe('https://imagedelivery.net/test-hash/img-123/public');
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('rejects unauthenticated callers', async () => {
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'profile-photo' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects members trying to upload uniform outfits (no dept:write)', async () => {
    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'member' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'uniform-outfit' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows system admin to mint uniform-outfit URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: { id: 'img-456', uploadURL: 'https://upload.example/two' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'admin' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'uniform-outfit' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 503 when CF Images env is not configured', async () => {
    delete process.env['CF_IMAGES_ACCOUNT_ID'];
    delete process.env['CF_IMAGES_ACCOUNT_HASH'];
    delete process.env['CF_IMAGES_TOKEN'];

    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'admin' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'profile-photo' }),
    });
    expect(res.status).toBe(503);
  });

  it('surfaces CF errors as 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Auth error' }] }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );

    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'admin' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'profile-photo' }),
    });
    expect(res.status).toBe(502);
  });

  it('rejects unknown purposes at the schema layer', async () => {
    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'admin' });
    const res = await app.request('/api/media/upload-url', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'bogus' }),
    });
    expect(res.status).toBe(400);
  });
});

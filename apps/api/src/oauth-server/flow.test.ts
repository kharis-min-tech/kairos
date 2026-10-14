/* eslint-disable @typescript-eslint/no-explicit-any -- response bodies are untyped JSON in a test client */
/**
 * End-to-end proof of the OAuth authorization server against a REAL Postgres
 * (PGlite, in-process) running the REAL 0057 migration SQL, driven over HTTP
 * through the router. Mocked Drizzle chains cannot prove the guarantees that
 * matter here — single-use codes, atomic refresh rotation, family revocation —
 * because those live in how the SQL actually behaves.
 *
 * A throwaway "analytics" client plays the relying party: it builds a PKCE
 * pair, sends the member through consent, redeems the code, verifies the ID
 * token against our published JWKS, and calls /userinfo.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SignJWT, createLocalJWKSet, jwtVerify } from 'jose';
import type { Hono } from 'hono';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const BRANCH_ID = '33333333-3333-3333-3333-333333333333';
const REDIRECT = 'https://analytics.example.org/oauth/callback';
const ISSUER = 'http://localhost:3002/api/oauth';

vi.mock('../db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const pg = new PGlite();
  // The one table the real migration references; only the columns this module reads.
  await pg.exec(`
    CREATE TABLE members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(100) NOT NULL UNIQUE,
      email_verified boolean NOT NULL DEFAULT false,
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      home_branch_id uuid NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      approval_status varchar(20) NOT NULL DEFAULT 'approved'
    );
    CREATE TABLE audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
      action varchar(50) NOT NULL, outcome varchar(20) NOT NULL,
      target_type varchar(50), target_id uuid, ip varchar(45), user_agent varchar(500),
      country varchar(2), attempted_email varchar(200), metadata jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT NOW(), updated_at timestamp NOT NULL DEFAULT NOW()
    );
    INSERT INTO members (id, email, email_verified, first_name, last_name, home_branch_id) VALUES
      ('11111111-1111-1111-1111-111111111111', 'admin@kharis.org', true, 'Ada', 'Admin', '33333333-3333-3333-3333-333333333333'),
      ('22222222-2222-2222-2222-222222222222', 'grace@kharis.org', true, 'Grace', 'Okafor', '33333333-3333-3333-3333-333333333333');
    INSERT INTO members (id, email, email_verified, first_name, last_name, home_branch_id, approval_status) VALUES
      ('44444444-4444-4444-4444-444444444444', 'pending@kharis.org', true, 'Pat', 'Pending', '33333333-3333-3333-3333-333333333333', 'pending');
  `);
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  await pg.exec(
    readFileSync(resolve(__dirname, '../../../../packages/database/drizzle/0057_oauth_authorization_server.sql'), 'utf8'),
  );
  return { db: drizzle(pg) };
});

vi.mock('../lib/grants', () => ({
  resolveGrants: vi.fn(async () => [
    { role: 'FellowshipLeader', scope: { kind: 'fellowship', id: 'fel-1' }, branchId: '33333333-3333-3333-3333-333333333333' },
  ]),
  authHasCapability: vi.fn(() => false),
}));

let app: Hono;

async function firstPartyToken(memberId: string, systemRole: 'admin' | 'member'): Promise<string> {
  return new SignJWT({
    memberId, email: 'x@kharis.org', systemRole, branchId: BRANCH_ID, activeRole: systemRole, grants: [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode('dev-secret-change-me'));
}

const b64url = (b: ArrayBuffer | Uint8Array) =>
  Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString('base64url');

async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

async function call(method: string, path: string, opts: { token?: string; json?: unknown; form?: Record<string, string>; basic?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.basic) headers['Authorization'] = `Basic ${Buffer.from(opts.basic).toString('base64')}`;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  if (opts.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(opts.form).toString();
  }
  const res = await app.request(`/api/oauth${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

interface Registered { id: string; clientId: string; secret: string | null }

async function registerClient(overrides: Record<string, unknown> = {}): Promise<Registered> {
  const admin = await firstPartyToken(ADMIN_ID, 'admin');
  const res = await call('POST', '/clients', {
    token: admin,
    json: {
      name: 'Kharis Analytics',
      clientType: 'confidential',
      redirectUris: [REDIRECT],
      allowedScopes: ['openid', 'profile', 'email', 'kairos:grants'],
      isTrusted: false,
      ...overrides,
    },
  });
  expect(res.status).toBe(201);
  return { id: res.body.data.client.id, clientId: res.body.data.client.clientId, secret: res.body.data.clientSecret };
}

function authorizeQuery(client: Registered, challenge: string, extra: Record<string, string> = {}) {
  return {
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: REDIRECT,
    scope: 'openid profile email kairos:grants',
    state: 'xyz-state',
    nonce: 'n-0S6_WzA2Mj',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...extra,
  };
}

/** Runs consent and returns the code the client would receive. */
async function authorizeAs(memberId: string, client: Registered, challenge: string, extra: Record<string, string> = {}) {
  const token = await firstPartyToken(memberId, 'member');
  const res = await call('POST', '/authorize/decision', { token, json: { ...authorizeQuery(client, challenge, extra), approve: true } });
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('ok');
  const url = new URL(res.body.data.redirectTo);
  return { url, code: url.searchParams.get('code')! };
}

const basicOf = (c: Registered) => `${c.clientId}:${c.secret}`;

beforeAll(async () => {
  const { createApp } = await import('../app');
  app = createApp() as unknown as Hono;
});

describe('discovery and keys', () => {
  it('publishes an OIDC discovery document that points at the web consent screen', async () => {
    const res = await call('GET', '/.well-known/openid-configuration');
    expect(res.status).toBe(200);
    expect(res.body.issuer).toBe(ISSUER);
    expect(res.body.authorization_endpoint).toBe('http://localhost:3002/oauth/authorize');
    expect(res.body.token_endpoint).toBe(`${ISSUER}/token`);
    expect(res.body.code_challenge_methods_supported).toEqual(['S256']);
    expect(res.body.id_token_signing_alg_values_supported).toEqual(['ES256']);
  });

  it('serves a JWKS that carries no private material', async () => {
    const res = await call('GET', '/jwks');
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0]).toMatchObject({ kty: 'EC', crv: 'P-256', alg: 'ES256', use: 'sig' });
    expect(res.body.keys[0].d).toBeUndefined();
  });
});

describe('client registry (admin only)', () => {
  it('refuses a non-admin with 403 and an unauthenticated caller with 401', async () => {
    const member = await firstPartyToken(MEMBER_ID, 'member');
    expect((await call('GET', '/clients', { token: member })).status).toBe(403);
    expect((await call('GET', '/clients')).status).toBe(401);
  });

  it('shows the secret exactly once and never lists it again', async () => {
    const client = await registerClient({ name: 'Once-only' });
    expect(client.secret).toMatch(/^ks_/);
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const fetched = await call('GET', `/clients/${client.id}`, { token: admin });
    expect(JSON.stringify(fetched.body)).not.toContain(client.secret!);
    expect(JSON.stringify(fetched.body)).not.toContain('secretHash');
  });

  it.each([
    ['http://analytics.example.org/cb', /https/],
    ['https://analytics.example.org/*', /wildcard/],
    ['https://analytics.example.org/cb#frag', /fragment/],
    ['javascript:alert(1)', /https/],
  ])('rejects the unsafe redirect URI %s', async (uri, why) => {
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const res = await call('POST', '/clients', {
      token: admin,
      json: { name: 'Bad', clientType: 'confidential', redirectUris: [uri], allowedScopes: ['openid'] },
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(why);
  });

  it('allows loopback http and, for public clients only, a custom scheme', async () => {
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const ok = await call('POST', '/clients', {
      token: admin,
      json: { name: 'Mobile', clientType: 'public', redirectUris: ['http://localhost:5173/cb', 'org.kharis.app://cb'], allowedScopes: ['openid'] },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data.clientSecret).toBeNull();
    const bad = await call('POST', '/clients', {
      token: admin,
      json: { name: 'Server', clientType: 'confidential', redirectUris: ['org.kharis.app://cb'], allowedScopes: ['openid'] },
    });
    expect(bad.status).toBe(400);
  });
});

describe('authorization code flow', () => {
  it('runs the whole flow: consent, code, tokens, ID token verified against our JWKS, userinfo', async () => {
    const client = await registerClient();
    const { verifier, challenge } = await pkcePair();
    const member = await firstPartyToken(MEMBER_ID, 'member');

    // First time: the member must be asked.
    const ctx = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge))}`, { token: member });
    expect(ctx.body.data.status).toBe('ok');
    expect(ctx.body.data.skipConsent).toBe(false);
    expect(ctx.body.data.client.name).toBe('Kharis Analytics');
    expect(ctx.body.data.scopes.map((s: any) => s.scope)).toEqual(['openid', 'profile', 'email', 'kairos:grants']);

    const { url, code } = await authorizeAs(MEMBER_ID, client, challenge);
    expect(url.origin + url.pathname).toBe(REDIRECT);
    expect(url.searchParams.get('state')).toBe('xyz-state');
    expect(url.searchParams.get('iss')).toBe(ISSUER);

    const tok = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    expect(tok.status).toBe(200);
    expect(tok.body).toMatchObject({ token_type: 'Bearer', expires_in: 900 });
    expect(tok.body.refresh_token).toBeTruthy();

    // The relying party verifies the ID token with nothing but the public JWKS.
    const jwks = createLocalJWKSet((await call('GET', '/jwks')).body);
    const { payload } = await jwtVerify(tok.body.id_token, jwks, { issuer: ISSUER, audience: client.clientId });
    expect(payload).toMatchObject({
      sub: MEMBER_ID,
      nonce: 'n-0S6_WzA2Mj',
      email: 'grace@kharis.org',
      email_verified: true,
      name: 'Grace Okafor',
      home_branch_id: BRANCH_ID,
    });
    // Grants never ride in the ID token.
    expect(payload).not.toHaveProperty('grants');

    const info = await call('GET', '/userinfo', { token: tok.body.access_token });
    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({ sub: MEMBER_ID, email: 'grace@kharis.org', name: 'Grace Okafor' });
    expect(info.body.grants).toEqual([
      { role: 'FellowshipLeader', scope: { kind: 'fellowship', id: 'fel-1' }, branchId: BRANCH_ID },
    ]);

    // Second authorisation for the same scopes skips the consent screen.
    const again = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge))}`, { token: member });
    expect(again.body.data.skipConsent).toBe(true);
  });

  it('only releases the claims the granted scopes cover', async () => {
    const client = await registerClient({ allowedScopes: ['openid', 'email'] });
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge, { scope: 'openid email' });
    const tok = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    const info = await call('GET', '/userinfo', { token: tok.body.access_token });
    expect(info.body).toMatchObject({ sub: MEMBER_ID, email: 'grace@kharis.org' });
    expect(info.body).not.toHaveProperty('name');
    expect(info.body).not.toHaveProperty('grants');
  });

  it('skips consent for a trusted first-party client', async () => {
    const client = await registerClient({ isTrusted: true });
    const { challenge } = await pkcePair();
    const member = await firstPartyToken(MEMBER_ID, 'member');
    const ctx = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge))}`, { token: member });
    expect(ctx.body.data.skipConsent).toBe(true);
  });

  it('never redirects to an unregistered redirect_uri — the user is shown the error instead', async () => {
    const client = await registerClient();
    const { challenge } = await pkcePair();
    const member = await firstPartyToken(MEMBER_ID, 'member');
    const res = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge, { redirect_uri: 'https://evil.example.com/cb' }))}`, { token: member });
    expect(res.body.data.status).toBe('error');
    expect(res.body.data.redirectTo).toBeNull();
    const decision = await call('POST', '/authorize/decision', {
      token: member,
      json: { ...authorizeQuery(client, challenge, { redirect_uri: 'https://evil.example.com/cb' }), approve: true },
    });
    expect(decision.body.data.status).toBe('error');
    expect(decision.body.data.redirectTo).toBeNull();
  });

  it('reports a bad scope or missing PKCE back to the (verified) client, not to the user', async () => {
    const client = await registerClient({ allowedScopes: ['openid'] });
    const { challenge } = await pkcePair();
    const member = await firstPartyToken(MEMBER_ID, 'member');

    const scope = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge))}`, { token: member });
    expect(scope.body.data).toMatchObject({ status: 'error', error: 'invalid_scope' });
    expect(new URL(scope.body.data.redirectTo).searchParams.get('error')).toBe('invalid_scope');
    expect(new URL(scope.body.data.redirectTo).searchParams.get('state')).toBe('xyz-state');

    const noPkce = authorizeQuery(client, challenge, { scope: 'openid' });
    delete (noPkce as Record<string, string>)['code_challenge'];
    const missing = await call('GET', `/authorize/context?${new URLSearchParams(noPkce)}`, { token: member });
    expect(missing.body.data).toMatchObject({ status: 'error', error: 'invalid_request' });

    const plain = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge, { scope: 'openid', code_challenge_method: 'plain' }))}`, { token: member });
    expect(plain.body.data).toMatchObject({ status: 'error', error: 'invalid_request' });
  });

  it('sends access_denied back to the client when the member declines', async () => {
    const client = await registerClient();
    const { challenge } = await pkcePair();
    const member = await firstPartyToken(MEMBER_ID, 'member');
    const res = await call('POST', '/authorize/decision', { token: member, json: { ...authorizeQuery(client, challenge), approve: false } });
    const url = new URL(res.body.data.redirectTo);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('xyz-state');
    expect(url.searchParams.get('code')).toBeNull();
  });

  it('refuses authorisation for a disabled client', async () => {
    const client = await registerClient();
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    await call('PATCH', `/clients/${client.id}`, { token: admin, json: { isActive: false } });
    const { challenge } = await pkcePair();
    const res = await call('GET', `/authorize/context?${new URLSearchParams(authorizeQuery(client, challenge))}`, { token: await firstPartyToken(MEMBER_ID, 'member') });
    expect(res.body.data).toMatchObject({ status: 'error', error: 'invalid_client', redirectTo: null });
  });
});

describe('who may authorise', () => {
  it('refuses a signed-in member who is still awaiting approval', async () => {
    const client = await registerClient();
    const { challenge } = await pkcePair();
    const res = await call('POST', '/authorize/decision', {
      token: await firstPartyToken('44444444-4444-4444-4444-444444444444', 'member'),
      json: { ...authorizeQuery(client, challenge), approve: true },
    });
    expect(res.body.data.status).toBe('error');
    expect(res.body.data.error).toBe('access_denied');
  });

  it('stops serving a member who is deactivated after authorising', async () => {
    const client = await registerClient();
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge);
    const tok = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    const { db } = await import('../db');
    const { members } = await import('@kairos/database');
    const { eq } = await import('drizzle-orm');
    await db.update(members).set({ isActive: false }).where(eq(members.id, MEMBER_ID));
    expect((await call('GET', '/userinfo', { token: tok.body.access_token })).status).toBe(401);
    expect((await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'refresh_token', refresh_token: tok.body.refresh_token },
    })).body.error).toBe('invalid_grant');
    // Restore for the tests that follow.
    await db.update(members).set({ isActive: true }).where(eq(members.id, MEMBER_ID));
  });
});

describe('token endpoint hardening', () => {
  async function codeFor(client: Registered) {
    const pair = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, pair.challenge);
    return { ...pair, code };
  }

  it('rejects the wrong PKCE verifier', async () => {
    const client = await registerClient();
    const { code } = await codeFor(client);
    const res = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: 'a'.repeat(50) },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('rejects a mismatched redirect_uri at redemption', async () => {
    const client = await registerClient({ redirectUris: [REDIRECT, 'https://analytics.example.org/other'] });
    const { code, verifier } = await codeFor(client);
    const res = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: 'https://analytics.example.org/other', code_verifier: verifier },
    });
    expect(res.body.error).toBe('invalid_grant');
  });

  it('rejects a wrong client secret with 401 invalid_client', async () => {
    const client = await registerClient();
    const { code, verifier } = await codeFor(client);
    const res = await call('POST', '/token', {
      basic: `${client.clientId}:ks_wrong`,
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_client');
  });

  it("rejects another client's code", async () => {
    const owner = await registerClient({ name: 'Owner' });
    const thief = await registerClient({ name: 'Thief' });
    const { code, verifier } = await codeFor(owner);
    const res = await call('POST', '/token', {
      basic: basicOf(thief),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    expect(res.body.error).toBe('invalid_grant');
  });

  it('redeems a code once; replaying it revokes the grant and every token from it', async () => {
    const client = await registerClient();
    const { code, verifier } = await codeFor(client);
    const form = { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier };
    const first = await call('POST', '/token', { basic: basicOf(client), form });
    expect(first.status).toBe(200);

    const replay = await call('POST', '/token', { basic: basicOf(client), form });
    expect(replay.body.error).toBe('invalid_grant');

    // The first redemption's tokens are now dead too.
    expect((await call('GET', '/userinfo', { token: first.body.access_token })).status).toBe(401);
    const refresh = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'refresh_token', refresh_token: first.body.refresh_token },
    });
    expect(refresh.body.error).toBe('invalid_grant');
  });

  it('refuses an expired code', async () => {
    const client = await registerClient();
    const { code, verifier } = await codeFor(client);
    const { db } = await import('../db');
    const { oauthAuthorizationCodes } = await import('@kairos/database');
    await db.update(oauthAuthorizationCodes).set({ expiresAt: new Date(Date.now() - 1000) });
    const res = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    expect(res.body.error).toBe('invalid_grant');
  });

  it('lets a public client redeem with PKCE alone, and refuses it without', async () => {
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const created = await call('POST', '/clients', {
      token: admin,
      json: { name: 'SPA', clientType: 'public', redirectUris: [REDIRECT], allowedScopes: ['openid', 'email'] },
    });
    const spa: Registered = { id: created.body.data.client.id, clientId: created.body.data.client.clientId, secret: null };
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, spa, challenge, { scope: 'openid email' });
    const ok = await call('POST', '/token', {
      form: { client_id: spa.clientId, grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    expect(ok.status).toBe(200);

    const pair2 = await pkcePair();
    const { code: code2 } = await authorizeAs(MEMBER_ID, spa, pair2.challenge, { scope: 'openid email' });
    const bad = await call('POST', '/token', {
      form: { client_id: spa.clientId, grant_type: 'authorization_code', code: code2, redirect_uri: REDIRECT, code_verifier: 'b'.repeat(50) },
    });
    expect(bad.body.error).toBe('invalid_grant');
  });

  it('rejects an unsupported grant type', async () => {
    const client = await registerClient();
    const res = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'password', username: 'a', password: 'b' } });
    expect(res.body.error).toBe('unsupported_grant_type');
  });
});

describe('refresh tokens', () => {
  async function tokensFor(client: Registered) {
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge);
    const res = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    return res.body as { access_token: string; refresh_token: string };
  }

  it('rotates on every use', async () => {
    const client = await registerClient();
    const t1 = await tokensFor(client);
    const r1 = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: t1.refresh_token } });
    expect(r1.status).toBe(200);
    expect(r1.body.refresh_token).not.toBe(t1.refresh_token);
    const r2 = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: r1.body.refresh_token } });
    expect(r2.status).toBe(200);
    expect((await call('GET', '/userinfo', { token: r2.body.access_token })).status).toBe(200);
  });

  it('treats reuse of a rotated token as theft and kills the whole family', async () => {
    const client = await registerClient();
    const t1 = await tokensFor(client);
    const r1 = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: t1.refresh_token } });

    const replay = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: t1.refresh_token } });
    expect(replay.body.error).toBe('invalid_grant');

    // The legitimate holder's newest token was in the same family, so it is dead as well.
    const after = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: r1.body.refresh_token } });
    expect(after.body.error).toBe('invalid_grant');

    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const activity = await call('GET', `/clients/${client.id}/activity`, { token: admin });
    expect(activity.body.data.map((a: any) => a.action)).toContain('oauth_token_reuse');
  });

  it('can narrow scope on refresh but never widen it', async () => {
    const client = await registerClient();
    const t = await tokensFor(client);
    const narrowed = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'refresh_token', refresh_token: t.refresh_token, scope: 'openid email' },
    });
    expect(narrowed.status).toBe(200);
    expect(narrowed.body.scope).toBe('openid email');

    const widened = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'refresh_token', refresh_token: narrowed.body.refresh_token, scope: 'openid email some:other' },
    });
    expect(widened.body.error).toBe('invalid_scope');
  });

  it('will not refresh for a client that did not get the token', async () => {
    const owner = await registerClient({ name: 'A' });
    const other = await registerClient({ name: 'B' });
    const t = await tokensFor(owner);
    const res = await call('POST', '/token', { basic: basicOf(other), form: { grant_type: 'refresh_token', refresh_token: t.refresh_token } });
    expect(res.body.error).toBe('invalid_grant');
  });

  it('the client can revoke a refresh token (RFC 7009)', async () => {
    const client = await registerClient();
    const t = await tokensFor(client);
    const rev = await call('POST', '/revoke', { basic: basicOf(client), form: { token: t.refresh_token } });
    expect(rev.status).toBe(200);
    const res = await call('POST', '/token', { basic: basicOf(client), form: { grant_type: 'refresh_token', refresh_token: t.refresh_token } });
    expect(res.body.error).toBe('invalid_grant');
    // Unknown tokens still answer 200.
    expect((await call('POST', '/revoke', { basic: basicOf(client), form: { token: 'nope' } })).status).toBe(200);
  });
});

describe('access tokens', () => {
  async function accessFor(client: Registered) {
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge);
    const res = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    return res.body as { access_token: string; id_token: string };
  }

  it('rejects an ID token presented as an access token', async () => {
    const client = await registerClient();
    const t = await accessFor(client);
    expect((await call('GET', '/userinfo', { token: t.id_token })).status).toBe(401);
  });

  it('is not accepted by the first-party API, and a first-party token is not accepted by /userinfo', async () => {
    const client = await registerClient();
    const t = await accessFor(client);
    // A third-party token is ES256 and our API only trusts its own HS256 tokens.
    expect((await call('GET', '/connections', { token: t.access_token })).status).toBe(401);
    expect((await call('GET', '/userinfo', { token: await firstPartyToken(MEMBER_ID, 'member') })).status).toBe(401);
  });

  it('rejects a missing or garbled bearer', async () => {
    expect((await call('GET', '/userinfo')).status).toBe(401);
    expect((await call('GET', '/userinfo', { token: 'not.a.jwt' })).status).toBe(401);
  });

  it('stops working the moment the member revokes the app', async () => {
    const client = await registerClient();
    const t = await accessFor(client);
    expect((await call('GET', '/userinfo', { token: t.access_token })).status).toBe(200);

    const member = await firstPartyToken(MEMBER_ID, 'member');
    const list = await call('GET', '/connections', { token: member });
    const mine = list.body.data.find((c: any) => c.clientName === 'Kharis Analytics');
    expect(mine.scopes.map((s: any) => s.scope)).toContain('kairos:grants');

    expect((await call('DELETE', `/connections/${mine.grantId}`, { token: member })).status).toBe(200);
    expect((await call('GET', '/userinfo', { token: t.access_token })).status).toBe(401);
  });

  it("a member cannot revoke someone else's grant", async () => {
    const client = await registerClient();
    await accessFor(client);
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const grants = await call('GET', `/clients/${client.id}/grants`, { token: admin });
    const graces = grants.body.data[0].grantId;
    const res = await call('DELETE', `/connections/${graces}`, { token: await firstPartyToken(ADMIN_ID, 'member') });
    expect(res.status).toBe(404);
  });
});

describe('secret rotation and admin controls', () => {
  it('keeps the old secret alive during the overlap, then drops it on request', async () => {
    const client = await registerClient();
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const rotated = await call('POST', `/clients/${client.id}/rotate-secret`, { token: admin });
    const fresh = rotated.body.data.clientSecret as string;
    expect(fresh).not.toBe(client.secret);

    const attempt = async (secret: string) => {
      const { verifier, challenge } = await pkcePair();
      const { code } = await authorizeAs(MEMBER_ID, client, challenge);
      return call('POST', '/token', {
        basic: `${client.clientId}:${secret}`,
        form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
      });
    };
    expect((await attempt(fresh)).status).toBe(200);
    expect((await attempt(client.secret!)).status).toBe(200);

    await call('POST', `/clients/${client.id}/expire-previous-secret`, { token: admin });
    expect((await attempt(client.secret!)).status).toBe(401);
    expect((await attempt(fresh)).status).toBe(200);
  });

  it('refuses to rotate a public client', async () => {
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const created = await call('POST', '/clients', {
      token: admin,
      json: { name: 'Pub', clientType: 'public', redirectUris: [REDIRECT], allowedScopes: ['openid'] },
    });
    const res = await call('POST', `/clients/${created.body.data.client.id}/rotate-secret`, { token: admin });
    expect(res.status).toBe(409);
  });

  it('revoke-all ends every grant for the client, and delete removes it entirely', async () => {
    const client = await registerClient();
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge);
    const tok = await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });

    const listed = await call('GET', '/clients', { token: admin });
    expect(listed.body.data.find((c: any) => c.id === client.id).grantCount).toBe(1);

    const revoked = await call('POST', `/clients/${client.id}/revoke-all`, { token: admin });
    expect(revoked.body.data.revoked).toBe(1);
    expect((await call('GET', '/userinfo', { token: tok.body.access_token })).status).toBe(401);

    expect((await call('DELETE', `/clients/${client.id}`, { token: admin })).status).toBe(200);
    expect((await call('GET', `/clients/${client.id}`, { token: admin })).status).toBe(404);
  });

  it('records an activity trail an admin can read', async () => {
    const client = await registerClient();
    const { verifier, challenge } = await pkcePair();
    const { code } = await authorizeAs(MEMBER_ID, client, challenge);
    await call('POST', '/token', {
      basic: basicOf(client),
      form: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier },
    });
    const admin = await firstPartyToken(ADMIN_ID, 'admin');
    // recordAuditEvent for token events is fire-and-forget; give it a tick.
    await new Promise((r) => setTimeout(r, 50));
    const activity = await call('GET', `/clients/${client.id}/activity`, { token: admin });
    const actions = activity.body.data.map((a: any) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['oauth_client_created', 'oauth_authorized', 'oauth_token_issued']));
  });
});

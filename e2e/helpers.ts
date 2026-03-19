/**
 * Shared helpers for Kairos E2E / integration tests.
 *
 * Provides typed wrappers around the API so every spec reads
 * like a stakeholder narrative instead of raw fetch calls.
 */
import type { APIRequestContext } from '@playwright/test';

// ── Constants ──────────────────────────────────────────────

export const PASSWORD = 'Password1!';

/** Pre-seeded accounts — see packages/database/src/seed.ts */
export const ACCOUNTS = {
  admin:   { email: 'admin@kairos.local',              role: 'admin'  as const },
  pastorLondon:  { email: 'james.okonkwo@kairos.local', role: 'pastor' as const },
  pastorManchester: { email: 'grace.mensah@kairos.local', role: 'pastor' as const },
  pastorAccra:   { email: 'kwame.asante@kairos.local',  role: 'pastor' as const },
  leaderLondon:  { email: 'sarah.williams@kairos.local', role: 'leader' as const },
  leaderAccra:   { email: 'david.appiah@kairos.local',  role: 'leader' as const },
  memberLondon:  { email: 'emma.thompson@kairos.local',  role: 'member' as const },
  memberAccra:   { email: 'michael.adjei@kairos.local',  role: 'member' as const },
  pending:       { email: 'new.applicant@kairos.local',  role: 'member' as const },
  unverified:    { email: 'unverified@kairos.local',     role: 'member' as const },
} as const;

// ── Auth helpers ───────────────────────────────────────────

/** Login with seed credentials and return the access token + member profile. */
export async function login(
  request: APIRequestContext,
  email: string,
  password = PASSWORD,
) {
  const res = await request.post('/api/auth/login', {
    data: { email, password },
  });
  return { status: res.status(), body: await res.json() };
}

/** Convenience: login and return only the access token string. */
export async function getToken(
  request: APIRequestContext,
  email: string,
  password = PASSWORD,
): Promise<string> {
  const { body } = await login(request, email, password);
  return body.data.tokens.accessToken as string;
}

// ── Generic request wrappers ───────────────────────────────

export async function authGet(
  request: APIRequestContext,
  url: string,
  token: string,
) {
  const res = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: await res.json() };
}

export async function authPost(
  request: APIRequestContext,
  url: string,
  token: string,
  data: unknown,
) {
  const res = await request.post(url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  return { status: res.status(), body: await res.json() };
}

export async function authPatch(
  request: APIRequestContext,
  url: string,
  token: string,
  data: unknown,
) {
  const res = await request.patch(url, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  return { status: res.status(), body: await res.json() };
}

export async function authDelete(
  request: APIRequestContext,
  url: string,
  token: string,
) {
  const res = await request.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status(), body: await res.json() };
}

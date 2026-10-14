import type { Context } from 'hono';
import { SignJWT, importJWK, jwtVerify } from 'jose';
import type { OAuthClient } from '@kairos/database';
import { getIssuer, ACCESS_TOKEN_TTL_SECONDS } from './config';
import { getSigningKey } from './keys';
import { randomToken } from './crypto';

export const ID_TOKEN_TTL_SECONDS = 60 * 60;
const ACCESS_TOKEN_TYP = 'at+jwt';

export interface MemberClaimsSource {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  homeBranchId: string;
}

/** RFC 9068 JWT access token. `gid` lets /userinfo honour revocation at once. */
export async function signAccessToken(
  c: Context | undefined,
  input: { memberId: string; client: OAuthClient; scopes: string[]; grantId: string },
): Promise<string> {
  const key = await getSigningKey(c);
  return new SignJWT({
    scope: input.scopes.join(' '),
    client_id: input.client.clientId,
    gid: input.grantId,
  })
    .setProtectedHeader({ alg: 'ES256', typ: ACCESS_TOKEN_TYP, kid: key.kid })
    .setIssuer(getIssuer(c))
    .setSubject(input.memberId)
    .setAudience(input.client.clientId)
    .setJti(randomToken(16))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key.privateKey);
}

/**
 * Identity claims by scope. Deliberately minimal and shared with /userinfo:
 * grants are NOT here, clients fetch them from /userinfo so the ID token stays
 * small and never goes stale.
 */
export function identityClaims(member: MemberClaimsSource, scopes: string[]): Record<string, unknown> {
  const claims: Record<string, unknown> = {};
  if (scopes.includes('profile')) {
    claims['name'] = `${member.firstName} ${member.lastName}`.trim();
    claims['given_name'] = member.firstName;
    claims['family_name'] = member.lastName;
    claims['home_branch_id'] = member.homeBranchId;
  }
  if (scopes.includes('email')) {
    claims['email'] = member.email;
    claims['email_verified'] = member.emailVerified;
  }
  return claims;
}

export async function signIdToken(
  c: Context | undefined,
  input: { member: MemberClaimsSource; client: OAuthClient; scopes: string[]; nonce?: string | null },
): Promise<string> {
  const key = await getSigningKey(c);
  return new SignJWT({
    ...identityClaims(input.member, input.scopes),
    ...(input.nonce ? { nonce: input.nonce } : {}),
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: key.kid })
    .setIssuer(getIssuer(c))
    .setSubject(input.member.id)
    .setAudience(input.client.clientId)
    .setIssuedAt()
    .setExpirationTime(`${ID_TOKEN_TTL_SECONDS}s`)
    .sign(key.privateKey);
}

export interface VerifiedAccessToken {
  memberId: string;
  clientId: string;
  scopes: string[];
  grantId: string;
}

/**
 * Verifies one of OUR access tokens. Pinning `typ` matters: without it an ID
 * token (same key, same issuer) would pass as an access token.
 */
export async function verifyAccessToken(c: Context | undefined, token: string): Promise<VerifiedAccessToken | null> {
  try {
    const key = await getSigningKey(c);
    const publicKey = await importJWK(key.publicJwk, 'ES256');
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: getIssuer(c),
      algorithms: ['ES256'],
      typ: ACCESS_TOKEN_TYP,
    });
    const scope = typeof payload['scope'] === 'string' ? payload['scope'] : '';
    if (!payload.sub || typeof payload['gid'] !== 'string' || typeof payload['client_id'] !== 'string') return null;
    return {
      memberId: payload.sub,
      clientId: payload['client_id'],
      scopes: scope.split(' ').filter(Boolean),
      grantId: payload['gid'],
    };
  } catch {
    return null;
  }
}

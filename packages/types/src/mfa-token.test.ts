import { describe, it, expect } from 'vitest';
import { MFA_TOKEN_KIND, looksLikeMfaToken } from './api';

/**
 * `looksLikeMfaToken` guards a branch fed by a URL fragment, so its whole job
 * is to be unimpressed by whatever is in there. It authenticates nothing; the
 * API holds the signing secret and is the only thing that decides.
 */

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function token(payload: object): string {
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.c2lnbmF0dXJl`;
}

describe('looksLikeMfaToken', () => {
  it('accepts a well-formed token that declares the pre-MFA kind', () => {
    expect(looksLikeMfaToken(token({ kind: MFA_TOKEN_KIND, memberId: 'm-1' }))).toBe(true);
  });

  it('accepts one that has expired, leaving that verdict to the server', () => {
    const expired = token({ kind: MFA_TOKEN_KIND, exp: 1 });
    expect(looksLikeMfaToken(expired)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['an arbitrary word', 'pre-mfa'],
    ['two segments', 'aaa.bbb'],
    ['four segments', 'aaa.bbb.ccc.ddd'],
    ['a segment with characters base64url does not use', 'aaa.bb+b.ccc'],
    ['a segment that is not base64 at all', 'aaa.!!!!.ccc'],
  ])('rejects %s', (_label, value) => {
    expect(looksLikeMfaToken(value as string | null)).toBe(false);
  });

  it('rejects a well-formed token of some other kind', () => {
    expect(looksLikeMfaToken(token({ kind: 'access', memberId: 'm-1' }))).toBe(false);
  });

  /**
   * An access token is signed with the same secret, so the `kind` claim is
   * the only thing separating the two. A token with no kind at all must not
   * be mistaken for one.
   */
  it('rejects a token with no kind claim', () => {
    expect(looksLikeMfaToken(token({ memberId: 'm-1' }))).toBe(false);
  });

  it('rejects a payload that is valid base64 but not an object', () => {
    const notAnObject = `${base64url({ alg: 'HS256' })}.${btoa('"just a string"')}.c2ln`;
    expect(looksLikeMfaToken(notAnObject)).toBe(false);
  });

  /**
   * The fragment is attacker-controlled and unbounded, so this must not be a
   * place where a long input costs real time. A previous regex in this
   * codebase backtracked quadratically and CodeQL caught it.
   */
  it('handles a very long input without blowing up', () => {
    const long = `${'a'.repeat(200_000)}.${'b'.repeat(200_000)}.${'c'.repeat(200_000)}`;
    const started = Date.now();
    expect(looksLikeMfaToken(long)).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

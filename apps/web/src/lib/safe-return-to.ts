/**
 * A `returnTo` that came from a URL is attacker-controllable, so it may only
 * ever be an in-app path. Anything else — an absolute URL, a protocol-relative
 * `//host`, a backslash trick browsers normalise into one, control characters
 * — falls back to `null` and the caller uses its default destination.
 */
export function safeReturnTo(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith('/')) return null;
  if (candidate.startsWith('//') || candidate.includes('\\')) return null;
  if (/[\r\n\t]/.test(candidate)) return null;
  return candidate;
}

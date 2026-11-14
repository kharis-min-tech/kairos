/**
 * A marker proving this browser is the one that started an OAuth sign-in.
 *
 * ## What it is for
 *
 * `/oauth-callback` reads a session out of the URL fragment and persists it.
 * The fragment is whatever the address bar says, so without this anyone could
 * send a link of the form
 *
 *     https://kairos.kharis.org/oauth-callback#accessToken=…&refreshToken=…
 *
 * carrying *their own* session, and a victim who clicked it would be silently
 * signed in as the sender. Nothing is stolen that way - no access to the
 * victim's account, no credentials - but everything the victim then typed
 * would land in the sender's account for them to read later. A Gift Aid
 * declaration is the sharp version: full name, address, postcode and bank
 * account name, entered in good faith into someone else's account.
 *
 * This is login CSRF, also called forced login or session fixation.
 *
 * ## What it does and does not stop
 *
 * It stops the drive-by link, which is the whole practical attack: a cold
 * visit to /oauth-callback now does nothing at all, however good the fragment
 * looks.
 *
 * It does NOT bind *which* session comes back, so an attacker who could get a
 * victim to start a genuine flow and then substitute the fragment mid-flight
 * would still get through. Closing that needs a nonce generated here, carried
 * through the API's OAuth `state`, echoed in the callback and compared - a
 * change to the round trip on both sides. This is the cheap nine tenths.
 *
 * ## Single use, and short lived
 *
 * Consumed on read, so a callback URL cannot be replayed. Fifteen minutes is
 * long enough for a provider sign-in with a password, a second factor and a
 * consent screen, and short enough that an abandoned attempt does not leave a
 * usable marker sitting around all afternoon.
 */

const KEY = 'kairos.oauth_flow';
const MAX_AGE_MS = 15 * 60 * 1000;

/** Call immediately before navigating to the provider. */
export function markOAuthFlowStarted(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage unavailable. See `consumeOAuthFlowMarker` for why this is not
    // fatal: it fails open rather than locking the member out of SSO.
  }
}

/**
 * True when this browser started an OAuth flow recently. Clears the marker
 * either way, so one start buys exactly one callback.
 *
 * **Fails open when sessionStorage itself is unavailable**, and only then. A
 * private window with storage blocked would otherwise be unable to use SSO at
 * all, and an attacker has no way to make a victim's storage throw: they
 * cannot reach into the victim's browser settings, and a sandboxed frame
 * where access does throw has an opaque origin, so anything written there is
 * invisible to the real app. Absent-but-readable is the attacker-reachable
 * case, and that one fails closed.
 */
export function consumeOAuthFlowMarker(): boolean {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return true;
  }

  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing useful to do. The age check below still bounds the window.
  }

  if (!raw) return false;
  const startedAt = Number(raw);
  if (!Number.isFinite(startedAt)) return false;
  return Date.now() - startedAt < MAX_AGE_MS;
}

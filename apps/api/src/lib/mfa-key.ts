import type { Context } from 'hono';
import { importSecretBoxKey } from '@kairos/utils';
import { requireSecret } from './secret-env';

/**
 * The key TOTP secrets are sealed with.
 *
 * Fails closed in a deployed environment like the JWT secrets do, and for a
 * sharper reason: a TOTP secret sealed with a key committed to this
 * repository is not sealed at all, and unlike a signing secret the damage is
 * silent. Nothing would look wrong.
 *
 * `MFA_ENCRYPTION_KEY` is 32 bytes of base64. Mint one with
 * `generateSecretBoxKey()` and set it with
 * `wrangler secret put MFA_ENCRYPTION_KEY`.
 *
 * ROTATION IS NOT TRANSPARENT. Secrets are sealed with one key and nothing
 * stores which; changing this value invalidates every enrolled factor at
 * once, and every privileged member has to re-enrol from a backup code or an
 * admin reset. `docs/security/key-management.md` records that.
 */
const DEV_ONLY_KEY = 'ZGV2LW9ubHkta2V5LWRvLW5vdC11c2UtaW4tcHJvZCE=';

export async function getMfaKey(c?: Context): Promise<CryptoKey> {
  return importSecretBoxKey(requireSecret(c, 'MFA_ENCRYPTION_KEY', DEV_ONLY_KEY));
}

// Prints a fresh ES256 private JWK for the OAUTH_SIGNING_KEY Worker secret.
//   node scripts/generate-oauth-key.mjs | npx wrangler secret put OAUTH_SIGNING_KEY --env staging
// Run it with `node`, not `npm run`: npm prints a banner to stdout, which would
// be piped into the secret and break it.
// The output is a credential: pipe it straight into `wrangler secret put`,
// never into a file or a commit.
import { generateKeyPair, exportJWK, calculateJwkThumbprint } from 'jose';

const { privateKey } = await generateKeyPair('ES256', { extractable: true });
const jwk = await exportJWK(privateKey);
jwk.kid = await calculateJwkThumbprint({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
jwk.alg = 'ES256';
jwk.use = 'sig';
process.stdout.write(JSON.stringify(jwk));

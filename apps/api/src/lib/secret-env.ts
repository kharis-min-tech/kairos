import type { Context } from 'hono';

/**
 * Reading secrets out of the two places they can live, and refusing to invent
 * one when it is absent.
 *
 * A secret that falls back to a value committed in this repository is not a
 * secret. `oauth-server/keys.ts` already refuses to sign with a well-known key
 * — it mints an ephemeral one instead, so "nothing silently signs with a
 * well-known key". The session secrets cannot fail safe that way: an ephemeral
 * per-isolate secret would mint tokens no other isolate could verify, so every
 * request would land on a coin flip. They fail *closed* instead — a deployment
 * without them serves 500s rather than signing tokens with a string anyone can
 * read on GitHub.
 *
 * Every caller is per-request, so a throw is a failed request, not a Worker
 * that will not boot.
 */
function readEnv(c: Context | undefined, key: string): string | undefined {
  // Workers put bindings on the Hono context; local Node dev puts them on
  // process.env via `--env-file`. Check the context first so a Worker secret
  // always wins over a stray process variable.
  if (c) {
    const env = (c as { env?: unknown }).env;
    if (env && typeof env === 'object') {
      const v = (env as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Whether we can *positively prove* this is not a deployed environment.
 *
 * Deliberately an allowlist rather than a `!== 'production'` check: the
 * Workers runtime does not set `NODE_ENV` to anything we control, so a
 * negative check would read "not production" in production and hand back the
 * committed default — exactly the bug this module exists to remove. `VITEST`
 * is set only by the test runner, and `src/server.ts` (the Node dev entry,
 * never deployed) declares `development` for itself.
 */
function isLocalOrTest(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  if (process.env['VITEST']) return true;
  const nodeEnv = process.env['NODE_ENV'];
  return nodeEnv === 'test' || nodeEnv === 'development';
}

/**
 * A secret with no usable default. Present in the environment, or the request
 * fails.
 *
 * `devDefault` is returned only where `isLocalOrTest()` can prove we are on a
 * developer's machine or in the test runner. It is never reachable from a
 * deployed Worker.
 */
export function requireSecret(
  c: Context | undefined,
  key: string,
  devDefault: string,
): string {
  const fromEnv = readEnv(c, key);
  if (fromEnv) return fromEnv;
  if (isLocalOrTest()) return devDefault;
  throw new Error(
    `${key} is not set. This environment refuses to fall back to the ` +
      `development default, because that value is committed to the ` +
      `repository and is therefore public. Set it with ` +
      `\`wrangler secret put ${key}\` (add \`--env staging\` for staging), ` +
      `or add it to .env for local development.`,
  );
}

/** A non-secret setting that is safe to default. */
export function readSetting(
  c: Context | undefined,
  key: string,
  fallback: string,
): string {
  return readEnv(c, key) ?? fallback;
}

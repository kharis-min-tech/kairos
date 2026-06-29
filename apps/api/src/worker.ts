import { createApp } from './app';
import { db, withDb } from './db';
import { bindMailerEnv, logger } from '@kairos/utils';
import { runLifecycleCron } from './cron/lifecycle';

/**
 * Cloudflare Workers entry. Server.ts remains the Node entry for `npm run dev`
 * and seed scripts; this file is what wrangler deploys.
 *
 * Hyperdrive binding ID is configured in wrangler.jsonc. JWT secrets are read
 * per-request via `getAuthSecrets(c)` from the Hono context — no binding here.
 *
 * Each fetch runs inside `withDb(...)` so a fresh postgres-js client is created
 * per request (Workers I/O isolation: clients cached across requests trip
 * "Cannot perform I/O on behalf of a different request"). Mailer config is
 * pure data, so it's safely cached on cold start.
 */
export interface Env {
  HYPERDRIVE: { connectionString: string };
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  EMAIL_FROM: string;
  FRONTEND_URL: string;
}

let app: ReturnType<typeof createApp> | null = null;
let mailerBound = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!mailerBound) {
      bindMailerEnv({
        awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        awsRegion: env.AWS_REGION,
        emailFrom: env.EMAIL_FROM,
        frontendUrl: env.FRONTEND_URL,
      });
      mailerBound = true;
    }
    if (!app) app = createApp();
    return withDb(env.HYPERDRIVE.connectionString, async () => app!.fetch(request, env, ctx));
  },

  /**
   * Daily cron handler (#4 Phase C/D). Runs at 03:00 UTC per wrangler.jsonc
   * triggers. The Worker spins up cold for crons too, so we re-use the same
   * withDb wrapper to mint a fresh postgres-js client for the run.
   *
   * `waitUntil` is intentionally not used — we want the cron to surface its
   * outcome (or any error) directly to Workers Logs.
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await withDb(env.HYPERDRIVE.connectionString, async () => {
      try {
        const summary = await runLifecycleCron(db);
        logger.info('cron.lifecycle.complete', {
          module: 'cron',
          ...summary,
        });
      } catch (err) {
        logger.error('cron.lifecycle.failed', {
          module: 'cron',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    });
  },
};

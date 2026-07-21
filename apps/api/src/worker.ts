import { createApp } from './app';
import { db, withDb } from './db';
import { bindMailerEnv, logger } from '@kairos/utils';
import { runLifecycleCron } from './cron/lifecycle';
import { runDailyDigest } from './notifications/digest';

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
  // Set per environment in wrangler.jsonc (prod: `kairos-transactional`,
  // staging: `kairos-staging`). Optional — mailer falls back to SES identity
  // default when absent.
  SES_CONFIGURATION_SET?: string;
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
        configurationSetName: env.SES_CONFIGURATION_SET,
      });
      mailerBound = true;
    }
    if (!app) app = createApp();
    return withDb(env.HYPERDRIVE.connectionString, async () => app!.fetch(request, env, ctx));
  },

  /**
   * Cron handler — branches on the cron expression that fired:
   *   - "0 3 * * *"  → daily lifecycle (#4 Phase C/D) at 03:00 UTC
   *   - "0 8 * * *"  → daily digest at 08:00 UTC (Phase 6)
   *
   * Both runs reuse withDb to mint a fresh postgres-js client. Mailer must
   * be bound before the first email (digest can fire on cold-start so we
   * always bind here too).
   *
   * `waitUntil` is intentionally not used — we want the cron to surface its
   * outcome (or any error) directly to Workers Logs.
   */
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (!mailerBound) {
      bindMailerEnv({
        awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        awsRegion: env.AWS_REGION,
        emailFrom: env.EMAIL_FROM,
        frontendUrl: env.FRONTEND_URL,
        configurationSetName: env.SES_CONFIGURATION_SET,
      });
      mailerBound = true;
    }

    await withDb(env.HYPERDRIVE.connectionString, async () => {
      try {
        if (event.cron === '0 8 * * *') {
          const summary = await runDailyDigest(db);
          logger.info('cron.digest.complete', { module: 'cron', ...summary });
          return;
        }
        // Default: lifecycle cron (covers 0 3 * * * + any unrecognised cron
        // so we don't silently skip work on a schedule typo).
        const summary = await runLifecycleCron(db);
        logger.info('cron.lifecycle.complete', { module: 'cron', ...summary });
      } catch (err) {
        logger.error('cron.failed', {
          module: 'cron',
          cron: event.cron,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    });
  },
};

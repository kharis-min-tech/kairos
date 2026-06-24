import { createApp } from './app';
import { bindDbEnv } from './db';
import { bindMailerEnv } from '@kairos/utils';

/**
 * Cloudflare Workers entry. Server.ts remains the Node entry for `npm run dev`
 * and seed scripts; this file is what wrangler deploys.
 *
 * Hyperdrive binding ID is configured in wrangler.toml. JWT secrets are read
 * per-request via `getAuthSecrets(c)` from the Hono context — no binding here.
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!app) {
      bindDbEnv(env.HYPERDRIVE.connectionString);
      bindMailerEnv({
        awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        awsRegion: env.AWS_REGION,
        emailFrom: env.EMAIL_FROM,
        frontendUrl: env.FRONTEND_URL,
      });
      app = createApp();
    }
    return app.fetch(request, env, ctx);
  },
};

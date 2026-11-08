import { serve } from '@hono/node-server';
import { createApp } from './app';
import { logger } from '@kairos/utils';

// The Node entry is local development only — wrangler deploys `worker.ts`, not
// this file. Declaring the environment here is what lets `lib/secret-env.ts`
// tell a developer's machine apart from a deployed Worker, so the committed
// dev defaults stay reachable here and nowhere else. Set after the imports
// deliberately: ES module imports are hoisted, so a statement above them does
// not actually run first.
process.env['NODE_ENV'] ??= 'development';

const port = parseInt(process.env['PORT'] ?? '3001', 10);
const app = createApp();

serve({ fetch: app.fetch, port }, () => {
  logger.info(`Kairos API running on http://localhost:${port}`);
});

import { serve } from '@hono/node-server';
import { createApp } from './app';
import { logger } from '@kairos/utils';

const port = parseInt(process.env['PORT'] ?? '3001', 10);
const app = createApp();

serve({ fetch: app.fetch, port }, () => {
  logger.info(`Kairos API running on http://localhost:${port}`);
});

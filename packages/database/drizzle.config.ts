import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: '127.0.0.1',
    port: 5433,
    user: 'kairos',
    password: 'kairos',
    database: 'kairos',
    ssl: false,
  },
});

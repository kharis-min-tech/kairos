#!/bin/sh
set -e

echo "⏳ Waiting for Postgres..."
until node --input-type=module <<'EOF' 2>/dev/null
import postgres from '/app/node_modules/postgres/src/index.js';
const sql = postgres(process.env.DATABASE_URL);
try { await sql`SELECT 1`; await sql.end(); process.exit(0); } catch { await sql.end(); process.exit(1); }
EOF
do
  echo "  Postgres not ready — retrying in 2s..."
  sleep 2
done

echo "✅ Postgres is ready"

echo "🔄 Running database migrations..."
cd /app/packages/database
npx drizzle-kit migrate

echo "🌱 Seeding database..."
npx tsx src/seed.ts || echo "⚠️  Seed skipped (already seeded or error — continuing)"

echo "🌱 Seeding souls data..."
npx tsx src/seed-souls.ts || echo "⚠️  Souls seed skipped (already seeded or error — continuing)"

echo "🚀 Starting API server..."
cd /app
npx tsx apps/api/src/server.ts

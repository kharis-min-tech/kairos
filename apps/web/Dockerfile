# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci --ignore-scripts

COPY apps/web ./apps/web
COPY packages/api-client ./packages/api-client
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/ui ./packages/ui

RUN npx turbo build --filter=@kairos/types
RUN npx turbo build --filter=@kairos/utils
RUN npx turbo build --filter=@kairos/api-client
RUN npx turbo build --filter=@kairos/ui

RUN DOCKER_BUILD=1 npx turbo build --filter=@kairos/web

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Next.js standalone output is self-contained
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3002

CMD ["node", "apps/web/server.js"]

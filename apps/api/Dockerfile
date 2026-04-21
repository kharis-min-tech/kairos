# syntax=docker/dockerfile:1

FROM node:22-alpine AS runner

RUN apk add --no-cache wget python3 make g++

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN npm ci

# Copy full source
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Build workspace packages (tsx resolves @kairos/* via package.json "main" → dist/)
RUN cd /app/packages/types && npx tsc
RUN cd /app/packages/utils && npx tsc
RUN cd /app/packages/database && npx tsc

# Entrypoint script
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]

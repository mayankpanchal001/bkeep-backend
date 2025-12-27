# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Base setup with pnpm and workspace
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Enable corepack (pnpm)
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install dependencies separately for better caching
FROM base AS deps
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Builder: compile TypeScript to dist
# -----------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build server to dist
RUN pnpm run build

# -----------------------------------------------------------------------------
# Development image
# - Contains sources and dev dependencies
# -----------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8000
# Default dev command can be overridden by compose
CMD ["pnpm", "dev"]

# -----------------------------------------------------------------------------
# Production runtime image
# - Copies only built artifacts and production deps
# -----------------------------------------------------------------------------
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY package.json pnpm-lock.yaml* ./
# Skip lifecycle scripts (e.g., husky prepare) during production install
ENV PNPM_SKIP_LIFECYCLE_SCRIPTS=true HUSKY=0
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files and public assets
COPY --from=builder /app/dist ./dist
COPY public ./public

# Set ownership to non-root user 'node'
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start server (env vars should be provided by orchestrator like Docker Compose)
# dotenv is optional fallback for standalone runs
CMD ["node", "dist/server.js"]



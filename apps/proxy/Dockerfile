# Base image
FROM node:18-alpine AS base
RUN npm install -g pnpm@8.6.10 turbo

# Builder stage
FROM base as builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .

# Final stage
FROM node:18-alpine
RUN npm install -g pnpm@8.6.10
WORKDIR /app

# Copy the entire monorepo from the builder stage
COPY --from=builder /app .

# Install only production dependencies for the proxy
RUN pnpm install --prod --filter=proxy

EXPOSE 8000
CMD ["node", "apps/proxy/index.js"]

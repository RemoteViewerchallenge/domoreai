# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root dependency management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy source code of all projects
COPY apps/ apps/
COPY packages/ packages/
COPY patches/ patches/

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies
RUN pnpm install --no-frozen-lockfile

# Build the 'api' app
RUN pnpm --filter=api build

# Create a pruned production deployment of the 'api' app to the /prod directory
RUN pnpm deploy --filter=api --prod /prod

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy the deployed application from the builder stage
COPY --from=builder /prod/ .

EXPOSE 4000

CMD ["node", "dist/index.js"]

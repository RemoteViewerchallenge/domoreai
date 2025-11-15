# Stage 1: Build
FROM node:18-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# First, copy only the files needed for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/

# Install all dependencies
# Using --frozen-lockfile is recommended for CI/CD to ensure reproducible builds
RUN pnpm install --frozen-lockfile

# Now, copy the rest of your source code
COPY apps/ apps/
COPY packages/ packages/

# Create a pruned production deployment of the 'proxy' app to the /prod directory
RUN pnpm deploy --filter=proxy --prod /prod/

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy the deployed application from the builder stage
COPY --from=builder /prod/ .

EXPOSE 8000

CMD ["node", "index.js"]

FROM node:18-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml .
COPY packages ./packages
COPY . .

RUN npm install -g pnpm
RUN cd packages && pnpm pack && cd ..
RUN pnpm install
RUN pnpm --filter api build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json .

EXPOSE 4000
CMD ["node", "dist/index.js"]

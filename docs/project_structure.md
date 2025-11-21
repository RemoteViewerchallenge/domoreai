# Project Structure

This document outlines the structure of the `mono` monorepo.

```tree
/home/guy/mono/
├───.gitignore
├───AGENTS.md
├───docker-compose.db.yml
├───docker-compose.yml
├───GEMINI.md
├───package.json
├───pnpm-workspace.yaml
├───README.md
├───tsconfig.json
├───turbo.json
├───apps/
│   ├───api/
│   │   ├───Dockerfile
│   │   ├───package.json
│   │   ├───requests.http
│   │   ├───tsconfig.json
│   │   ├───prisma/
│   │   │   └───schema.prisma
│   │   └───src/
│   │       ├───db.ts
│   │       ├───index.ts
│   │       ├───llm-adapters.ts
│   │       ├───mcp-adapters.ts
│   │       ├───trpc.ts
│   │       ├───db/
│   │       │   └───index.ts
│   │       ├───routers/
│   │       │   └───index.ts
│   │       └───services/
│   │           ├───git.service.ts
│   │           └───languageServer.service.ts
│   ├───proxy/
│   │   ├───Dockerfile
│   │   └───package.json
│   ├───registry/
│   │   ├───Dockerfile
│   │   └───package.json
│   └───ui/
│       ├───Dockerfile
│       ├───index.html
│       ├───package.json
│       ├───tsconfig.json
│       ├───vite.config.ts
│       └───src/
│           ├───App.tsx
│           ├───main.tsx
│           ├───components/
│           ├───pages/
│           └───stores/
├───packages/
│   ├───package.json
│   ├───tsconfig.json
│   ├───api-contract/
│   │   ├───package.json
│   │   ├───tsconfig.json
│   │   └───src/
│   │       └───index.ts
│   ├───common/
│   │   ├───package.json
│   │   ├───tsconfig.json
│   │   └───src/
│   │       └───index.ts
│   ├───eslint-config/
│   │   └───base.js
│   ├───typescript-config/
│   │   ├───base.json
│   │   └───react-library.json
│   └───volcano-sdk/
│       ├───package.json
│       ├───tsconfig.json
│       └───src/
│           ├───index.ts
│           └───llm-adapter.ts
└───prisma/
    └───schema.prisma
```

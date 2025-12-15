# AGENTS.md: C.O.R.E. Agent Instructions

**IMPORTANT:** For the full strategic alignment, refer to **[STRATEGY_AND_RULES.md](./docs/STRATEGY_AND_RULES.md)**. This is the master document for "Zero-Burn" and "Incomplete Data" protocols.

This document provides technical instructions for AI agents working in the C.O.R.E. (Cognitive Orchestration & Research Engine) repository.

---

## 1. Project Philosophy (See STRATEGY_AND_RULES.md)
*   **Zero-Burn Protocol**: Exhaust Free Tier and Local models before Paid.
*   **Incomplete Data**: Ingest raw, refine later. Never block on schema.
*   **VFS-Driven Context**: Use "Cell Division" to split large tasks based on file directory tokens.

---

## 2. Technical Constraints & "Keep" Rules

**CRITICAL**: These rules are born from painful debugging sessions. Do not ignore them.

### Build & Package Management
-   **pnpm Version**: Must use `pnpm@10.22.0`.
-   **Lockfile Integrity**: `pnpm install` must be run from the root. Do not use `npm` or `yarn`.
-   **Non-Pruned Builds**: Due to a `turbo prune --docker` bug, use non-pruned builds.
-   **Internal Dependencies**: Packages in `packages/` must explicitly declare dependencies in their `package.json`.

### Service Networking
-   `api` talks to `postgres`/`redis` via **service names** (internal Docker network).
-   `ui` (browser) talks to `api` via **localhost:4000** (or mapped port).

### Code & Config
-   **Git Branches**: Must match `^(feature|fix|hotfix|release)/[a-z0-9-]+$`.
-   **ESLint Memory**: Use `NODE_OPTIONS=--max-old-space-size=4096` if linting fails.
-   **TypeScript**: `module: NodeNext` requires relative imports to include `.js` extension.
-   **tRPC**: Client and Server versions must align (`^11.7.1`).
-   **Prisma Usage**:
    -   **NEVER** run `prisma db push --accept-data-loss`.
    -   **ALWAYS** use `prisma migrate dev` for schema changes.
    -   **Dynamic Models**: Do not hardcode model IDs (e.g., `'gemini-1.5'`). Query the `Model` table capabilities instead.

### Security
-   **No Secrets in DB**: API keys must be encrypted before storage.
-   **No Secrets in Logs**: Never log raw API keys or credentials.

### MCP Server Config
The config file for all MCP servers should be in the config file for AI agents.


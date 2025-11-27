# AGENTS.md: C.O.R.E. Agent Instructions

This document provides instructions for AI agents working in the C.O.R.E. (Cognitive Orchestration & Research Engine) repository. Adhere to these guidelines to ensure consistency, quality, and maintainability.

## Project Philosophy: C.O.R.E.

This project is **C.O.R.E.**, a local, agentic Operating System designed to orchestrate "free tier" intelligence. It is NOT just an IDE.

### 1. Resource Arbitrage (The "Free Labor" Engine)
The system treats models as interchangeable, rate-limited compute units.
-   **Prioritize Free**: Always attempt to use free tier models (e.g., via OpenRouter, Gemini Free) before falling back to paid ones.
-   **Exhaustive Fallbacks**: Try *all* viable free providers before failing a task.
    1.  Select best free model.
    2.  On failure, try next best free model from same provider.
    3.  On exhaustion, try next best free model from *different* provider.
    4.  Only fail if ALL free resources are exhausted.

### 2. Agentic Orchestration (Brain / Hands / Eyes)
Understand the distinct roles of the architecture:
-   **The Brain (apps/api)**: Manages state, roles, and routing. It "thinks".
-   **The Hands (Lootbox)**: Executes tools. It "acts".
-   **The Eyes (apps/ui)**: visualizes state and code structure (via LSP). It "sees".

---

## Technical Constraints & "Keep" Rules

**CRITICAL**: These rules are born from painful debugging sessions. Do not ignore them.

### Build & Package Management
-   **pnpm Version**: Must use `pnpm@10.22.0`.
-   **Lockfile Integrity**: `pnpm install` must be run from the root. Do not use `npm` or `yarn`.
-   **Non-Pruned Builds**: Due to a `turbo prune --docker` bug, use non-pruned builds.
-   **Internal Dependencies**: Packages in `packages/` must explicitly declare dependencies in their `package.json`.

### Docker & Networking
-   **Service Networking**:
    -   `api` talks to `postgres`/`redis` via **service names** (internal Docker network).
    -   `ui` (browser) talks to `api` via **localhost:4000** (or mapped port).
-   **Permissions**: The execution environment cannot access the Docker daemon (`docker ps` fails).
-   **Lootbox**: Referenced as an external image (`jx-codes/lootbox`) or mapped service, not built from local source.

### Code & Config
-   **Git Branches**: Must match `^(feature|fix|hotfix|release)/[a-z0-9-]+$`.
-   **ESLint Memory**: Use `NODE_OPTIONS=--max-old-space-size=4096` if linting fails.
-   **TypeScript**: `module: NodeNext` requires relative imports to include `.js` extension.
-   **Prisma**: The `Model` table uses a single `id` for upsert, not composite keys.
-   **tRPC**: Client and Server versions must align (`^11.7.1`).

---

## Coding Standards

### Modularity & Naming
-   **One responsibility per file**.
-   **Max 300 lines per file**.
-   **Descriptive Names**: `getUserById` > `get`.

### Documentation
-   **JSDoc** on all public functions.
-   **No "Magic"**: Explain complex logic with comments.

### Security
-   **No Secrets in DB**: API keys must be encrypted before storage.
-   **No Secrets in Logs**: Never log raw API keys or credentials.
-   **Rate Limiting**: Respect provider limits to avoid bans.

### Database Safety (CRITICAL)
-   **NEVER** run `prisma db push --accept-data-loss`. This deletes user data.
-   **ALWAYS** use `prisma migrate dev` for schema changes.
-   **ALWAYS** check for dynamic tables (e.g., `tgthr`, `orouter`) before resetting the database.
-   **SAFE MODE**: If you are unsure, ASK the user before running any command that might drop tables.

### The Golden Rule
If another agent (or human) can't understand your code in 5 minutes, simplify it.

### MCP Server Config
The config file for all MCP servers should be in the config file for AI agents.

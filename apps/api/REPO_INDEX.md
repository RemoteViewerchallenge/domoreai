# REPO_INDEX.md (API)

## /apps/api/src
**Intent:** Backend runtime, API endpoints, and Agent services.
**Rules:** Services contain business logic. Routers handle transport. Repositories handle DB access.

### /src/routers
**Intent:** TRPC and Express route definitions. Input validation only.
- `agent.router.ts`: Endpoints for manipulating AI agents.
- `codeGraph.router.ts`: Endpoints for the dependency graph visualizer.
- `ingestion.router.ts`: Triggers for codebase ingestion tasks.
- `vfs.router.ts`: Virtual File System operations.

### /src/services
**Intent:** Heavy business logic and state management.
- `AgentRuntime.ts`: Manages the lifecycle of active agents.
- `IngestionService.ts`: Logic for parsing and vectorizing code.
- `McpOrchestrator.ts`: Manages connections to MCP tools/servers.
- `CodeGraphService.ts`: Analyzes code imports/exports to build graphs.
- `RoleFactoryService.ts`: Generates new Agent personas.

### /src/tools
**Intent:** Executable tools exposed to the LLM.
- `filesystem.ts`: Safe file system access methods.
- `search.ts`: Codebase search implementation.
- `terminal.ts`: Shell execution sandbox.
- `typescriptInterpreter.ts`: Dynamic code execution sandbox.

### /src/orchestrator
**Intent:** High-level decision making for Model/Provider selection.
- `ModelSelector.ts`: Logic to pick the cheapest/smartest model for a task.

## /apps/api/scripts
**Intent:** Operational scripts for maintenance, data seeding, and manual triggers.
**Drift Warning:** Some of these scripts (`ingest-*.ts`) contain logic that should likely be in `services`.
- `ingest-codebase.ts`: Manually triggers full codebase ingestion.
- `seed_*.ts`: Scripts to populate initial DB state (Roles, Users).
- `wipe-*.ts`: Destructive scripts to clean DB tables.
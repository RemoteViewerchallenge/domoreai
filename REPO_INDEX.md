# REPO_INDEX.md

## / (Root)
**Intent:** Monorepo orchestration, build configuration, and container definition.
**Rules:** No business logic here. All domain logic must reside in `apps` or `packages`.
- `turbo.json`: Defines the build pipeline and cache rules for the monorepo.
- `package.json`: Root dependencies and workspace definitions.
- `docker-compose.yml`: Orchestrates the stack (API, UI, DB, Redis).
- `cleanup.sh`: Utility to clean node_modules and build artifacts.

## /apps
**Intent:** Deployable applications.
- `api/`: **[See apps/api/REPO_INDEX.md]** The core backend, AI orchestrator, and database interface.
- `ui/`: **[See apps/ui/REPO_INDEX.md]** The React frontend and Nebula visual engine.
- `voice-input/`: Electron-based standalone voice input module.

## /packages
**Intent:** Shared libraries and isolated domain engines. **[See packages/REPO_INDEX.md]**
- `coc/`: "Chain of Command" - The AI Strategy & Evaluation Engine.
- `nebula/`: The Abstract Syntax Tree (AST) engine for the dynamic UI.
- `api-contract/`: Shared Zod schemas and TypeScript interfaces (TRPC).
- `common/`: Low-level utilities shared across backend and frontend.
- `mcp-server-vfs/`: Model Context Protocol implementation for File System access.

## /scripts
**Intent:** Global CI/CD and DevOps utility scripts.
- `sync-branches.sh`: Automates merging between git branches.
- `generate_native_docs.ts`: Generates documentation for tools.

# REPO_INDEX.md (Packages)

## /packages/coc (Chain of Command)
**Intent:** The "Brain" of the AI. Handles strategy execution, context evaluation, and task delegation.
**Rules:** Pure TypeScript. No React/DOM dependencies.
- `src/coc.ts`: Entry point for the Chain of Command runtime.
- `src/StrategyEngine.ts`: Determines the best approach for a given prompt/task.
- `src/evaluator.ts`: Scores agent performance or context relevance.
- `src/bandit.ts`: Implementation of Multi-Armed Bandit algorithms for model selection optimization.

## /packages/nebula
**Intent:** The Dynamic UI Generation Engine. Defines how code is transformed into a visual graph.
**Rules:** Framework agnostic core, though currently heavily tied to JSX ASTs.
- `src/engine/NebulaOps.ts`: Core CRUD operations for the UI Node Graph.
- `src/ingest/AstTransformer.ts`: Converts raw code (strings) into Nebula Nodes.
- `src/export/CodeGenerator.ts`: Converts Nebula Nodes back into valid React code.

## /packages/api-contract
**Intent:** The Single Source of Truth for API definitions.
**Rules:** Changes here break both Client and Server. Modify with caution.
- `src/index.ts`: Exports `AppRouter` type and input validation schemas.

## /packages/mcp-server-vfs
**Intent:** Implements the Model Context Protocol for file system interactions.
- `src/search_codebase.ts`: Logic for semantic/grep search over the VFS.
- `src/list_files_tree.ts`: Generates file hierarchy representations.

## /packages/common
**Intent:** Stateless utilities shared by at least 2 packages/apps.
- `src/types/agent.types.ts`: Universal definitions for Agent interfaces.

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

# REPO_INDEX.md (UI)

## /apps/ui/src
**Intent:** React Frontend application.
**Rules:** Components should be small and functional. Complex state moves to `stores` or `hooks`.

### /src/features
**Intent:** Domain-specific modules that bundle logic and UI.
- `creator-studio/`: The visual editor for orchestration and flows.
  - `OrchestrationDesigner.tsx`: Main canvas for the node editor.
  - `nodes/`: Custom ReactFlow nodes (SuperNode, TableNode).
- `nebula-renderer/`: The renderer for the Dynamic UI system.
  - `NebulaRenderer.tsx`: Recursive component that renders the Nebula Tree.
- `ui-builder/`: Tools for manually constructing UI layouts.

### /src/components
**Intent:** Reusable UI atoms and molecules.
**Drift Warning:** We are transitioning to a `ui/` folder (likely Shadcn). Legacy components exist in root `components/`.
- `ui/`: **Preferred**. Modern, standardized components (Button, Card, Input).
- `VisualQueryBuilder.tsx`: Complex component for DB queries (Candidate for `features/`).
- `MonacoEditor.tsx`: Wrapper for the code editor.
- `UnifiedMenuBar.tsx` vs `appearance/NewUIMenuBar.tsx`: **Drift**. `NewUIMenuBar` should likely replace `UnifiedMenuBar` or be merged.

### /src/pages
**Intent:** Route-level components.
- `AgentWorkbench.tsx`: Main dashboard for interacting with Agents.
- `CodeVisualizer.tsx`: Page for the 3D/2D code graph.
- `InterfaceStudio.tsx`: Landing page for the Nebula UI builder.

### /src/stores
**Intent:** Global state management (Zustand/Context).
- `workspace.store.ts`: Manages active project, tabs, and layout state.
- `websocket.store.ts`: Handles real-time events from the API.

### /src/nebula
**Intent:** Client-side bindings for the Nebula Engine.
- `component-map.tsx`: Maps string keys (from the AST) to actual React components.
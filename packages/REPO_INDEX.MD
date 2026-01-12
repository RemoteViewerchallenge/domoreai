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
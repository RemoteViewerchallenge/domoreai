## Project Overview

This is a pnpm monorepo for Domoreai, a flexible, extensible system for managing and interacting with various Large Language Model (LLM) providers. It provides a unified API and a simple web interface to configure providers and query their models.

The monorepo contains two main applications:
- `apps/api`: A Node.js/Express backend that handles all the business logic.
- `apps/ui`: A React-based web interface.

The project uses `turbo` to manage the monorepo and run scripts.

## Key Features

- **Git Integration:** The application now has git integration within the virtual file system, allowing users to commit and view the history of their files.
- **Model Management:** There is a new service for managing models, and models are being "normalized" before being saved.
- **Provider Management:** The provider management system has been improved to use a dynamic adapter map, and it now includes endpoints for fetching, normalizing, and saving models from providers.
- **Role Management:** The application now has a concept of roles that can be assigned to AI agents, and these roles can be used to specify the capabilities of the agent.
- **Virtual File System:** The application now has a full-featured virtual file system that can be used to manage files and directories for each user and workspace.
- **Language Server:** The application now includes a language server for TypeScript, providing features like code completion, diagnostics, and go-to-definition.
- **Lootbox (Tool) Service:** The application can now interact with a separate "Lootbox" service to manage and execute "tools".

## Services

The `apps/api/src/services` directory contains the core business logic of the application. Here's a summary of the services:

- **`git.service.ts`:** Provides methods for interacting with a git repository.
- **`languageServer.service.ts`:** Creates a WebSocket server and spawns a `typescript-language-server` process for each connected client.
- **`lootbox.service.ts`:** Interacts with a separate "Lootbox" service to manage and execute "tools".
- **`model.service.ts`:** Saves "normalized" model data to the database.
- **`modelManager.service.ts`:** Logs model usage and selects the best model for a given task based on the role of the agent and the rate limits of the providers.
- **`vfsSession.service.ts`:** Manages a virtual file system (VFS) using `memfs`.

## Building and Running

To build the project, run the following command from the root of the monorepo:

```bash
pnpm run build
```

To run the project in development mode, run the following command from the root of the monorepo:

```bash
pnpm run dev
```

This will start both the `api` and `ui` applications. The `api` will be available at `http://localhost:4000` and the `ui` will be available at `http://localhost:5173`.

## Development Conventions

### Linting

To lint the project, run the following command from the root of the monorepo:

```bash
pnpm run lint
```

### Adding a New Provider

To extend the system with a new LLM provider, follow these steps:

1.  **Create an Adapter**: In `apps/api/src/llm-adapters.ts`, create a new class that implements the `LLMAdapter` interface. You must define `configSchema`, `getModels`, and `generateCompletion`.
2.  **Register the Adapter**: In `apps/api/src/routers/llm.router.ts`, import your new adapter and add an instance of it to the `adapters` object.
3.  **Define the Model Table**: In `apps/api/src/db/index.ts`, add a `CREATE TABLE IF NOT EXISTS` statement for your new provider's models inside the `initializeDatabase` function. The columns should match the data you want to store from the `getModels` API response.
4.  **Add a Save Handler**: In `saveModelsForProvider` within the same file, add a `case` to the `switch` `statement for your new `providerType`. This logic will handle deleting old models and inserting the new ones into your structured table.
5.  **Update the Fetch Query**: In `getAllProviders`, update the `CASE` statement in the main query to `json_agg` the models from your new table when the provider type matches.

After these changes, rebuild the API (`pnpm run build`) and restart the server. Your new provider type will be available in the UI.

## Monorepo File Index

---

## `.eslintrc.json`

- **Location:** `/`
- **Purpose:** This file contains the ESLint configuration for the monorepo. It is used to enforce a consistent coding style and to catch common errors.
- **Core Functions:**
  - Sets the root of the ESLint configuration to the monorepo root.
  - Ignores the `node_modules`, `dist`, and `.turbo` directories.

---

## `.gitignore`

- **Location:** `/`
- **Purpose:** This file specifies which files and directories should be ignored by Git.
- **Core Functions:**
  - Ignores `node_modules` directories.
  - Ignores build artifacts like `dist` and `.turbo`.
  - Ignores log files.
  - Ignores local environment variables.
  - Ignores IDE and editor directories.
  - Ignores OS-specific files.
  - Ignores generated JavaScript and declaration files.

---

## `.npmrc`

- **Location:** `/`
- **Purpose:** This file contains configuration for the npm client.
- **Core Functions:**
  - Points the `@repo` scope to the GitHub Packages registry.

---

## `AGENTS.md`

- **Location:** `/`
- **Purpose:** This file provides instructions for AI agents working in the repository. It outlines the project philosophy, coding conventions, and best practices.
- **Core Functions:**
  - Defines the "Exhaustive Fallbacks" system philosophy.
  - Sets rules for modularity, naming, and documentation.
  - Enforces strict TypeScript rules.
  - Provides guidelines for error handling, async patterns, logging, testing, and security.
  - Includes the "Golden Rule" for code simplicity.
  - Specifies the location of the MCP server config.

---

## `docker-compose.db.yml`

- **Location:** `/`
- **Purpose:** This file defines the database and Redis services for the application.
- **Core Functions:**
  - Defines a `postgres` service using the `postgres:15-alpine` image.
  - Defines a `redis` service using the `redis:7-alpine` image.
  - Creates volumes for the `postgres` and `redis` data.
  - Creates a network for the services to communicate with each other.

---

## `docker-compose.yml`

- **Location:** `/`
- **Purpose:** This file defines the services for the application, including the API, UI, proxy, registry, and lootbox services.
- **Core Functions:**
  - Defines an `api` service that builds from the `apps/api/Dockerfile`.
  - Defines a `proxy` service that builds from the `apps/proxy/Dockerfile`.
  - Defines a `registry` service that builds from the `apps/registry/Dockerfile`.
  - Defines a `ui` service that builds from the `apps/ui/Dockerfile`.
  - Defines a `lootbox` service that builds from the `apps/lootbox/Dockerfile`.
  - Defines `postgres` and `redis` services.
  - Creates volumes for the `postgres` and `redis` data.
  - Creates a network for the services to communicate with each other.

---

## `GEMINI.md`

- **Location:** `/`
- **Purpose:** This file provides a high-level overview of the project, its key features, and how to get started. It is intended for human developers and AI agents.
- **Core Functions:**
  - Describes the project's architecture and key features.
  - Provides instructions for building and running the project.
  - Outlines development conventions, including how to add a new provider.
  - Summarizes the services in the `apps/api/src/services` directory.

---

## `package.json`

- **Location:** `/`
- **Purpose:** This file defines the project's dependencies and scripts.
- **Core Functions:**
  - Defines scripts for building, developing, linting, and formatting the project.
  - Lists the dev dependencies for the project.
  - Specifies the package manager to be used (pnpm).

---

## `pnpm-workspace.yaml`

- **Location:** `/`
- **Purpose:** This file defines the workspaces in the monorepo.
- **Core Functions:**
  - Specifies that the `apps` and `packages` directories are workspaces.

---

## `README.md`

- **Location:** `/`
- **Purpose:** This file provides a comprehensive overview of the project, its features, architecture, and how to get started.
- **Core Functions:**
  - Describes the project's key features, including multi-provider support, secure credential storage, dynamic model discovery, and more.
  - Explains the project's architecture, including the `apps/api` and `apps/ui` applications.
  - Details the database design.
  - Provides instructions for setting up and running the project.
  - Explains how to add a new provider.

---

## `tsconfig.json`

- **Location:** `/`
- **Purpose:** This file contains the TypeScript configuration for the monorepo.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - Excludes the `node_modules`, `dist`, and `patches` directories from compilation.

---

## `turbo.json`

- **Location:** `/`
- **Purpose:** This file contains the configuration for Turborepo.
- **Core Functions:**
  - Defines the tasks that can be run by Turborepo.
  - Specifies the dependencies between the tasks.
  - Configures the caching and output settings for the tasks.

---

## `apps/api/Dockerfile`

- **Location:** `/apps/api/`
- **Purpose:** This file contains the Docker configuration for the API service.
- **Core Functions:**
  - Defines a multi-stage Docker build.
  - Installs the dependencies for the project.
  - Builds the `api` application.
  - Creates a final image with only the production dependencies.
  - Exposes port 4000.
  - Sets the command to run the `api` application.

---

## `apps/api/eslint.config.cjs`

- **Location:** `/apps/api/`
- **Purpose:** This file contains the ESLint configuration for the `api` application.
- **Core Functions:**
  - Ignores the `dist` directory.
  - Extends the recommended ESLint and TypeScript ESLint configurations.
  - Configures the parser options for TypeScript files.

---

## `apps/api/package.json`

- **Location:** `/apps/api/`
- **Purpose:** This file defines the dependencies and scripts for the `api` application.
- **Core Functions:**
  - Defines scripts for building, developing, starting, and linting the `api` application.
  - Lists the dependencies and dev dependencies for the `api` application.

---

## `apps/api/requests.http`

- **Location:** `/apps/api/`
- **Purpose:** This file contains a collection of HTTP requests that can be used to test the API.
- **Core Functions:**
  - Provides requests for getting all providers, creating a new provider, getting a provider's details, getting the raw models for a provider, and deleting a provider.

---

## `apps/api/tsconfig.json`

- **Location:** `/apps/api/`
- **Purpose:** This file contains the TypeScript configuration for the `api` application.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `src` directory in the compilation.
  - Excludes the `node_modules` and `dist` directories from compilation.

---

## `apps/api/src/db.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file creates a new Prisma client and exports it.
- **Core Functions:**
  - Creates a new `PrismaClient` instance.
  - Exports the `PrismaClient` instance.

---

## `apps/api/src/index.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file is the entry point for the `api` application.
- **Core Functions:**
  - Initializes and starts the Express server.
  - Applies essential middlewares, including CORS and request logging.
  - Sets up the tRPC endpoint.
  - Initializes the WebSocket service.
  - Mounts the RESTful API routers.
  - Implements a graceful shutdown mechanism.

---

## `apps/api/src/llm-adapters.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file defines the interface for LLM adapters and provides implementations for various LLM providers.
- **Core Functions:**
  - Defines the `LLMAdapter` interface, which specifies the methods that all LLM adapters must implement.
  - Provides implementations of the `LLMAdapter` interface for OpenAI, Mistral, Llama, and Vertex AI Studio.
  - Each adapter is responsible for generating completions and fetching models from the corresponding LLM provider.

---

## `apps/api/src/mcp-adapters.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file provides an adapter for MCP-compatible APIs.
- **Core Functions:**
  - Implements the `LLMAdapter` interface for MCP-compatible APIs.
  - The `MCPAdapter` class is responsible for generating completions and fetching models from an MCP-compatible API.

---

## `apps/api/src/rateLimiter.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file provides functions for checking and incrementing rate limits.
- **Core Functions:**
  - `checkRateLimit`: Checks if a request is allowed based on the rate limits for a given model.
  - `incrementRateLimit`: Increments the rate limit counters for a given model.

---

## `apps/api/src/redis.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file provides a function for getting a Redis client.
- **Core Functions:**
  - `getRedisClient`: Returns a Redis client. If a client does not exist, it creates a new one.

---

## `apps/api/src/tokenizer.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file provides a simple placeholder for tokenization.
- **Core Functions:**
  - `countTokens`: Returns the number of tokens in a given text.

---

## `apps/api/src/trpc.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file initializes and configures tRPC.
- **Core Functions:**
  - `createTRPCContext`: Creates the context for tRPC requests.
  - `createTRPCRouter`: Creates a new tRPC router.
  - `publicProcedure`: Creates a new public tRPC procedure.
  - `protectedProcedure`: Creates a new protected tRPC procedure.

---

## `apps/api/src/types.ts`

- **Location:** `/apps/api/src/`
- **Purpose:** This file defines the types used in the `api` application.
- **Core Functions:**
  - Defines the `VfsSessionToken` type.
  - Defines the `Provider` interface.

---

## `apps/api/src/db/index.ts`

- **Location:** `/apps/api/src/db/`
- **Purpose:** This file contains the database initialization and CRUD operations for the application.
- **Core Functions:**
  - `initializeDatabase`: Creates the database tables if they do not exist.
  - `createProvider`: Creates a new provider in the database.
  - `getProviderById`: Retrieves a provider from the database by its ID.
  - `getAllProviders`: Retrieves all providers from the database.
  - `updateProvider`: Updates a provider in the database.
  - `deleteProvider`: Deletes a provider from the database.
  - `saveModelsForProvider`: Saves the models for a given provider to the database.
  - `updateModel`: Updates a model in the database.
  - `encrypt`: Encrypts a string using AES-256-CBC.
  - `decrypt`: Decrypts a string using AES-256-CBC.

---

## `apps/api/src/db/schema.sql`

- **Location:** `/apps/api/src/db/`
- **Purpose:** This file contains the SQL schema for the `providers` table.
- **Core Functions:**
  - Defines the columns for the `providers` table, including `id`, `name`, `base_url`, `api_key`, `is_healthy`, `last_checked_at`, `created_at`, and `updated_at`.
  - Creates an index on the `name` column for faster lookups.

---

## `apps/api/src/mockData/models.json`

- **Location:** `/apps/api/src/mockData/`
- **Purpose:** This file contains mock data for the models.
- **Core Functions:**
  - Provides a list of mock models that can be used for testing.

---

## `apps/api/src/orchestrator/modelSelector.ts`

- **Location:** `/apps/api/src/orchestrator/`
- **Purpose:** This file contains the logic for selecting the best available model based on criteria and current usage.
- **Core Functions:**
  - `loadModelCatalog`: Loads model definitions from multiple JSON files.
  - `selectModel`: Selects the best available model based on criteria and current usage.

---

## `apps/api/src/orchestrator/modelSelector.test.ts`

- **Location:** `/apps/api/src/orchestrator/`
- **Purpose:** This file contains the tests for the `modelSelector.ts` file.
- **Core Functions:**
  - Tests the `loadModelCatalog` function to ensure that it correctly loads the model catalog from the mock file system.
  - Tests the `selectModel` function to ensure that it correctly selects the best available model based on the criteria and current usage.
  - Tests the "Hard Stop" and "Soft Fail" rate limiting mechanisms.
  - Tests the "Maximize Free Labour" logic.
  - Tests the daily reset of the rate limits.

---

## `apps/api/src/routers/external.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for fetching data from external APIs.
- **Core Functions:**
  - `getOpenRouterRaw`: Fetches the raw model data from the OpenRouter API.

---

## `apps/api/src/routers/git.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for interacting with a git repository.
- **Core Functions:**
  - `log`: Retrieves the git log for a given VFS session.
  - `commit`: Creates a new commit in a given VFS session.

---

## `apps/api/src/routers/index.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file combines all the tRPC routers into a single app router.
- **Core Functions:**
  - `appRouter`: The main tRPC router for the application.

---

## `apps/api/src/routers/llm.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines the RESTful API for managing LLM providers and models.
- **Core Functions:**
  - `GET /provider-types`: Returns the types of providers available.
  - `GET /configurations`: Returns all user-defined provider configurations.
  - `POST /configurations`: Adds a new user-defined provider configuration.
  - `POST /configurations/:id/update-models`: Triggers an update for a provider's models.
  - `PUT /models/:modelId`: Updates a model.

---

## `apps/api/src/routers/model.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for managing models.
- **Core Functions:**
  - `saveNormalizedModel`: Saves a normalized model to the database.

---

## `apps/api/src/routers/providers.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for managing providers.
- **Core Functions:**
  - `list`: Lists all providers.
  - `add`: Adds a new provider.
  - `fetchAndNormalizeModels`: Fetches and normalizes models from a provider's API and upserts them into the database.

---

## `apps/api/src/routers/role.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for managing roles.
- **Core Functions:**
  - `list`: Lists all roles.
  - `create`: Creates a new role.
  - `update`: Updates an existing role.
  - `delete`: Deletes a role.

---

## `apps/api/src/routers/types.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines the types used in the tRPC routers.
- **Core Functions:**
  - `AppRouter`: The type of the main tRPC router.
  - `modelInputSchema`: The Zod schema for the model input.

---

## `apps/api/src/routers/vfs.router.ts`

- **Location:** `/apps/api/src/routers/`
- **Purpose:** This file defines a tRPC router for managing a virtual file system (VFS).
- **Core Functions:**
  - `getToken`: Generates a VFS token.
  - `getTree`: Gets the full file tree for a given VFS token.
  - `readFile`: Reads the content of a single file.
  - `writeFile`: Writes content to a single file.
  - `moveFile`: Moves a file or directory.
  - `copyFile`: Copies a file or directory.

---

## `apps/api/src/services/git.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for interacting with a git repository.
- **Core Functions:**
  - `gitLog`: Retrieves the git log for a given VFS session.
  - `gitCommit`: Creates a new commit in a given VFS session.

---

## `apps/api/src/services/languageServer.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for creating a WebSocket server and spawning a `typescript-language-server` process for each connected client.
- **Core Functions:**
  - `initialize`: Initializes the WebSocket server and sets up the event listeners.

---

## `apps/api/src/services/lootbox.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for interacting with a separate "Lootbox" service to manage and execute "tools".
- **Core Functions:**
  - `getTools`: Fetches a list of available tools from a registry.
  - `executeTool`: Sends a request to a proxy to execute a specific tool.

---

## `apps/api/src/services/model.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for saving normalized model data to the database.
- **Core Functions:**
  - `saveNormalizedModel`: Saves a normalized model to the database.

---

## `apps/api/src/services/modelManager.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides functions for logging model usage and selecting the best model for a given task.
- **Core Functions:**
  - `logUsage`: Logs the usage of a model.
  - `getBestModel`: Selects the best, non-rate-limited model for a given role.

---

## `apps/api/src/services/vfsSession.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for managing a virtual file system (VFS) using `memfs`.
- **Core Functions:**
  - `generateToken`: Generates a token for a user and root path.
  - `getScopedVfs`: Gets the scoped VFS for a token.
  - `getFs`: Returns the global `memfs` instance.

---

## `apps/api/src/services/websocket.service.ts`

- **Location:** `/apps/api/src/services/`
- **Purpose:** This file provides a service for managing the WebSocket server for handling Virtual File System (VFS) operations.
- **Core Functions:**
  - `initialize`: Initializes the WebSocket server and sets up connection handling.
  - `close`: Closes the WebSocket server and terminates all client connections.

---

## `apps/ui/.eslintrc.cjs`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the ESLint configuration for the `ui` application.
- **Core Functions:**
  - Extends the `@repo/eslint-config/react-internal.js` configuration.
  - Configures the parser options for TypeScript files.

---

## `apps/ui/.gitignore`

- **Location:** `/apps/ui/`
- **Purpose:** This file specifies which files and directories should be ignored by Git.
- **Core Functions:**
  - Ignores log files, `node_modules`, `dist`, `dist-ssr`, and `.local` files.
  - Ignores editor directories and files.

---

## `apps/ui/components.json`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the configuration for the `shadcn/ui` components.
- **Core Functions:**
  - Configures the style, tsx, and tailwind settings for the `shadcn/ui` components.
  - Defines the aliases for the components, utils, and lib directories.

---

## `apps/ui/Dockerfile`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the Docker configuration for the `ui` application.
- **Core Functions:**
  - Defines a multi-stage Docker build.
  - Installs the dependencies for the project.
  - Builds the `ui` application.
  - Creates a final image with Nginx to serve the static files.
  - Exposes port 80.

---

## `apps/ui/index.html`

- **Location:** `/apps/ui/`
- **Purpose:** This file is the entry point for the `ui` application.
- **Core Functions:**
  - Sets up the HTML document.
  - Includes the `main.tsx` script.

---

## `apps/ui/nginx.conf`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the Nginx configuration for the `ui` application.
- **Core Functions:**
  - Serves the static files for the React app.
  - Proxies API requests to the `api` service.

---

## `apps/ui/package.json`

- **Location:** `/apps/ui/`
- **Purpose:** This file defines the dependencies and scripts for the `ui` application.
- **Core Functions:**
  - Defines scripts for building, developing, linting, and previewing the `ui` application.
  - Lists the dependencies and dev dependencies for the `ui` application.

---

## `apps/ui/README.md`

- **Location:** `/apps/ui/`
- **Purpose:** This file provides information about the `ui` application, which is a React + TypeScript + Vite template.
- **Core Functions:**
  - Explains how to expand the ESLint configuration.
  - Provides information about the React Compiler.

---

## `apps/ui/tsconfig.app.json`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the TypeScript configuration for the `ui` application.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `src` and `../api/src` directories in the compilation.
  - Excludes the `node_modules` directory from compilation.

---

## `apps/ui/tsconfig.json`

- **Location:** `/apps/ui/`
- **Purpose:** This file is the main TypeScript configuration file for the `ui` application.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - References the `tsconfig.app.json` and `tsconfig.node.json` files.

---

## `apps/ui/tsconfig.node.json`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the TypeScript configuration for the Node.js environment of the `ui` application.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `vite.config.ts` file in the compilation.

---

## `apps/ui/vite.config.ts`

- **Location:** `/apps/ui/`
- **Purpose:** This file contains the configuration for Vite.
- **Core Functions:**
  - Configures the plugins, resolve, server, and build settings for Vite.

---

## `packages/package.json`

- **Location:** `/packages/`
- **Purpose:** This file defines the dependencies and scripts for the `@repo/volcano-backend` package.
- **Core Functions:**
  - Defines scripts for building and packing the package.
  - Lists the dependencies and dev dependencies for the package.

---

## `packages/tsconfig.json`

- **Location:** `/packages/`
- **Purpose:** This file contains the TypeScript configuration for the `@repo/volcano-backend` package.
- **Core Functions:**
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `src` directory in the compilation.
  - Excludes the `node_modules` and `dist` directories from compilation.

---

## `packages/api-contract/package.json`

- **Location:** `/packages/api-contract/`
- **Purpose:** This file defines the dependencies and scripts for the `@repo/api-contract` package.
- **Core Functions:**
  - Defines a script for building the package.
  - Lists the dependencies for the package.

---

## `packages/api-contract/tsconfig.json`

- **Location:** `/packages/api-contract/`
- **Purpose:** This file contains the TypeScript configuration for the `@repo/api-contract` package.
- **Core Functions:**
  - Extends the root `tsconfig.json` file.
  - Sets the output directory for the compiled files.
  - Includes the `src` directory in the compilation.
  - Excludes the `node_modules` and `dist` directories from compilation.

---

## `packages/api-contract/src/index.ts`

- **Location:** `/packages/api-contract/src/`
- **Purpose:** This file defines the shared tRPC procedures and types for the API.
- **Core Functions:**
  - Initializes tRPC.
  - Defines and exports the `createTRPCRouter`, `publicProcedure`, and `protectedProcedure` tRPC procedures.
  - Re-exports Zod.
  - Defines the `modelInputSchema` Zod schema.

---

## `packages/common/package.json`

- **Location:** `/packages/common/`
- **Purpose:** This file defines the dependencies and scripts for the `@repo/common` package.
- **Core Functions:**
  - Defines a script for building the package.
  - Lists the dev dependencies for the package.

---

## `packages/common/tsconfig.json`

- **Location:** `/packages/common/`
- **Purpose:** This file contains the TypeScript configuration for the `@repo/common` package.
- **Core Functions:**
  - Extends the `@repo/typescript-config/base.json` configuration.
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `src` directory in the compilation.

---

## `packages/common/src/index.ts`

- **Location:** `/packages/common/src/`
- **Purpose:** This file defines the common types used in the application.
- **Core Functions:**
  - Defines the `LLMProvider` interface.
  - Defines the `LLMCompletionRequest` interface.

---

## `packages/eslint-config/base.js`

- **Location:** `/packages/eslint-config/`
- **Purpose:** This file contains the base ESLint configuration for the monorepo.
- **Core Functions:**
  - Extends the recommended ESLint, TypeScript ESLint, and Turborepo configurations.
  - Configures the parser and plugins for TypeScript files.
  - Defines rules for unused variables.

---

## `packages/eslint-config/package.json`

- **Location:** `/packages/eslint-config/`
- **Purpose:** This file defines the dependencies for the `@repo/eslint-config` package.
- **Core Functions:**
  - Lists the dev dependencies for the package.

---

## `packages/eslint-config/react-internal.js`

- **Location:** `/packages/eslint-config/`
- **Purpose:** This file contains the ESLint configuration for the React applications in the monorepo.
- **Core Functions:**
  - Extends the base ESLint configuration and the recommended React and React Hooks configurations.

---

## `packages/typescript-config/base.json`

- **Location:** `/packages/typescript-config/`
- **Purpose:** This file contains the base TypeScript configuration for the monorepo.
- **Core Functions:**
  - Extends the root `tsconfig.json` file.
  - Sets the compiler options for the TypeScript compiler.
  - Excludes the `node_modules` and `dist` directories from compilation.

---

## `packages/typescript-config/package.json`

- **Location:** `/packages/typescript-config/`
- **Purpose:** This file defines the `@repo/typescript-config` package.
- **Core Functions:**
  - Specifies the files to be included in the package.

---

## `packages/typescript-config/react-library.json`

- **Location:** `/packages/typescript-config/`
- **Purpose:** This file contains the TypeScript configuration for React libraries.
- **Core Functions:**
  - Extends the base TypeScript configuration.
  - Sets the `lib`, `jsx`, and `module` compiler options for React libraries.

---

## `packages/volcano-sdk/package.json`

- **Location:** `/packages/volcano-sdk/`
- **Purpose:** This file defines the dependencies and scripts for the `@repo/volcano-sdk` package.
- **Core Functions:**
  - Defines scripts for building and packing the package.
  - Lists the dependencies and dev dependencies for the package.

---

## `packages/volcano-sdk/tsconfig.json`

- **Location:** `/packages/volcano-sdk/`
- **Purpose:** This file contains the TypeScript configuration for the `@repo/volcano-sdk` package.
- **Core Functions:**
  - Extends the `@repo/typescript-config/base.json` configuration.
  - Sets the compiler options for the TypeScript compiler.
  - Includes the `src` directory in the compilation.

---

## `packages/volcano-sdk/src/index.ts`

- **Location:** `/packages/volcano-sdk/src/`
- **Purpose:** This file acts as a facade for the external `volcano-sdk` and re-exports its named exports.
- **Core Functions:**
  - Re-exports all named exports from `volcano-sdk`.
  - Explicitly exports local LLM adapters to override external ones.

---

## `packages/volcano-sdk/src/llm-adapter.ts`

- **Location:** `/packages/volcano-sdk/src/`
- **Purpose:** This file defines interfaces and placeholder functions for LLM adapters.
- **Core Functions:**
  - Defines the `LLMCompletionRequest` interface.
  - Defines the `LLMProvider` interface.
  - Defines the `LLMAdapter` interface.
  - Provides placeholder functions for `llmOpenAI`, `llmMistral`, `llmLlama`, and `llmVertexStudio`.

---

## `prisma/schema.prisma`

- **Location:** `/prisma/`
- **Purpose:** This file defines the Prisma schema for the application's database.
- **Core Functions:**
  - Defines the `Provider` model, which stores provider-specific credentials and configuration.
  - Defines the `Model` model, which stores individual models from all providers.
  - Defines the `Role` model, which stores roles for AI agents.
  - Defines the `ModelConfig` model, which stores the configuration for a specific model within a role.
  - Defines the `ModelUsage` model, which stores the usage logs for models.

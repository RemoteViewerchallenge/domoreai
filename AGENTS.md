# AI Agent Guidance

This document provides guidance for AI agents working with the Domoreai codebase.

## Getting Started

### Development Environment

The development environment can be started with the following command:

```bash
pnpm run dev
```

This will start the API server on port 4000 and the UI server on port 5173.

### Dependencies

This is a pnpm monorepo. Dependencies are managed in the `package.json` file in the root of the repository, as well as in the `package.json` files for each individual application and package.

To install all dependencies, run the following command from the root of the repository:

```bash
pnpm install
```

To add a dependency to a specific application or package, use the `--filter` flag:

```bash
pnpm install <dependency> --filter <app-or-package-name>
```

## Project Structure

The repository is a monorepo with the following structure:

-   `apps`: Contains the individual applications, such as the API and the UI.
-   `packages`: Contains shared code that is used by multiple applications.

### Applications

-   `apps/api`: The backend API server.
-   `apps/ui`: The main frontend application.
-   `apps/lootbox`: A Deno-based application for managing RPC functions.
-   `apps/lootbox/ui`: The UI for the `lootbox` application.
-   `apps/proxy`: A simple proxy server.
-   `apps/registry`: A service registry.

### Packages

-   `packages/common`: Shared types and interfaces.
-   `packages/src`: Additional shared code.

## Working with the Code

### Type Safety

This is a typesafe monorepo. Please ensure that all new code is properly typed and that there are no type errors.

### Mock and Placeholder Code

There are several places in the codebase that use mock or placeholder implementations. These are noted in the JSDoc comments for the relevant files. Please be aware of these when working with the code.

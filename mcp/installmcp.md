# MCP Server Installation Guide

This guide details the process for installing, configuring, and registering new Model Context Protocol (MCP) servers in the codebase.

## Directory Structure

All MCP servers are located in:
`apps/mcp/extracted/`

Each server should have its own directory (e.g., `git-mcp-server-main`, `serena-main`).

> [!NOTE]
> Some servers are wrappers around CLI tools (like `serena`) while others are full Node.js services. The installation method varies by type.

## Installation Process

### 1. Clone the Repository
Clone the MCP server repository into the `extracted` directory.
```bash
cd /home/guy/mono/mcp/extracted/
git clone <repository_url> <folder_name>
```

### 2. Install Dependencies & Build

#### Node.js Servers
Most Node.js servers require building to generate the `dist` artifacts.

```bash
cd <server_directory>
npm install  # or pnpm install
npm run build # CRITICAL: Ensure 'dist' or 'build' directory is created
```

> [!WARNING]
> **Common Pitfall**: Some servers (like `linear`) may fail silently or seem to install but lack the build artifacts. Always verify that `dist/index.js` (or the relevant entry point) exists after building.

#### Python Servers
We use `uv` for Python dependency management.

```bash
cd <server_directory>
uv sync # or explicitly install dependencies if needed
```

#### Graphiti & Version Requirements
Some servers like **RunGraphiti** require specific Python versions (e.g., 3.12) to build native extensions (PyO3).
```bash
uv python install 3.12
uv sync --python 3.12
```

### 3. Register the Server

Update **`apps/api/src/services/mcp-registry-client.ts`**.

1.  Add the server to the `listServers` method with a description.
2.  Add a configuration entry in `getServerConfig`.

**Configuration Pattern:**

**Node.js:**
```typescript
'server-name': {
  command: 'sh',
  args: ['-c', 'cd /home/guy/mono/mcp/extracted/<dir> && node dist/index.js'],
  env: {}
}
```

**Python (using uv):**
```typescript
'server-name': {
  command: 'sh',
  args: ['-c', 'cd /home/guy/mono/mcp/extracted/<dir> && uv run src/<entry_point>.py'],
  env: {}
}
```

### 4. Synchronize with Database

The UI relies on the database being aware of the available tools. run the sync script to register them.

```bash
npx tsx apps/api/scripts/sync_mcp_tools.ts
```

## Environment Configuration

Certain servers require API tokens to function. Without them, they may connect but expose **0 tools**.
Add these to your local `.env` file or the server's specific environment config.

| Server | Variable | Description |
| :--- | :--- | :--- |
| **Linear** | `LINEAR_API_TOKEN` | API Key from Linear settings |
| **Jira** | `JIRA_API_TOKEN`, `JIRA_URL` | Atlassian API token and instance URL |
| **Sentry** | `SENTRY_ACCESS_TOKEN` | User Auth Token with API access |
| **MindsDB** | *Check docs* | May require database connection details |

## Troubleshooting Common Issues

### Git Server Aliases
**Issue**: Errors like `Cannot find package '@/utils'`.
**Fix**: Ensure a `tsconfig.json` exists in the server directory with proper path mappings:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Missing Modules (Node.js)
**Issue**: `MODULE_NOT_FOUND` on startup.
**Fix**: The project was likely not built. Run `npm run build` or `pnpm build` in the server directory and verify the output folder.

### Missing Dependencies (Python)
**Issue**: `ModuleNotFoundError`.
**Fix**: Install the specific missing package using `uv add <package_name>` within the server directory.

### UI Not Updating
**Issue**: Tools don't appear in the Role Creator.
**Fix**: Re-run `apps/api/scripts/sync_mcp_tools.ts`. Ensure the command output completes successfully ("✅ Sync Complete").

### Entry Point Mismatches (Serena/Jira)
**Issue**: Server connects but fails immediately or hangs.
**Fix**: Check `pyproject.toml` for the defined script entry point.
*   **Serena**: Use `uv run serena-mcp-server` (NOT `mcp.py` directly).
*   **Jira**: Use `uv run mcp-atlassian`.
*   **OpenSpec**: Use `node dist/cli/index.js` (NOT `bin/openspec.js` if unbuilt).

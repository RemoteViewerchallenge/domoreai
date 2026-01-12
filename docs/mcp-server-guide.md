# MCP Server Addition Guide

This document outlines the correct process for adding new MCP (Model Context Protocol) servers to the DoMoreAI platform.

## 1. Registry Entry
The primary source of truth for MCP servers is the `RegistryClient` in `apps/api/src/services/mcp-registry-client.ts`.

### Steps:
1. Open `apps/api/src/services/mcp-registry-client.ts`.
2. Add your server to the `listServers()` method:
   ```typescript
   { name: 'your-server-name', description: 'What this server does' }
   ```
3. Add the server configuration to `getServerConfig(serverName: string)`:
   ```typescript
   'your-server-name': {
     command: 'npx', // or 'node', 'uv run', etc.
     args: ['-y', '@your-org/mcp-server-name'],
     env: { 
       "YOUR_VAR": "value" 
     }
   }
   ```

## 2. Synchronization
Once the server is defined in the registry, it needs to be synced to the database so the UI and Agents can recognize its tools.

### Automatic Sync
The system automatically syncs tools on startup in `apps/api/src/index.ts`. Simply restarting the API server will trigger a sync.

### Manual Sync (via API/UI)
You can trigger a manual sync via the TRPC mutation `tool.syncRegistry`. If the UI has a "Resync Tools" button, clicking it will update the database.

## 3. Tool Naming Convention
Tools are synced with a prefix: `${serverName}_${toolName}`.
- Example: `git_status`, `filesystem_read_file`.
- All hyphens in tool names are replaced with underscores to ensure compatibility with TypeScript Code Mode.

## 4. How Agents Use Tools
When an Agent (via `AgentRuntime`) is initialized with requested tools:
1. It queries the `Tool` table to find the associated `serverId` for each tool.
2. It ensures the required MCP servers are running via the `McpOrchestrator`.
3. It registers the tools into the `CodeModeUtcpClient` with the correct proxy handlers.

## 5. Troubleshooting
- **Connection Timeout**: The sync service has a 5-second connection timeout. Ensure your MCP server starts quickly or uses a persistent transport if needed.
- **Environment Variables**: Ensure all required environment variables for the MCP server are defined in the `getServerConfig` entry.
- **Dependencies**: If using a local path for the MCP server, ensure you have run `npm install` or equivalent in that directory.

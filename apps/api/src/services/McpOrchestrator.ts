import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { RegistryClient } from './mcp-registry-client.js';
import { SandboxTool } from '../types.js';

interface ActiveServer {
  client: Client;
  transport: StdioClientTransport;
  lastUsed: number;
}

export class McpOrchestrator {
  private activeServers = new Map<string, ActiveServer>();
  private SHUTDOWN_TIMEOUT = 1000 * 60 * 5; // 5 minutes

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupIdleServers(), 60000);
  }

  /**
   * Prepares the environment by ensuring specific MCP servers are running.
   * @param serverNames List of server names (e.g., 'git', 'postgres') to start.
   */
  async prepareEnvironment(serverNames: string[]) {
    await Promise.all(serverNames.map(name => this.ensureServerRunning(name)));
  }

  /**
   * Returns a list of tools formatted for the AgentRuntime/CodeMode sandbox.
   * Each tool includes a 'handler' that proxies the call to the actual MCP server.
   */
  async getToolsForSandbox(): Promise<SandboxTool[]> {
    const promises = Array.from(this.activeServers.entries()).map(async ([serverName, server]) => {
      try {
        const { tools } = await server.client.listTools();
        return tools.map((tool) => this.formatToolForSandbox(serverName, server, tool));
      } catch (error) {
        console.warn(`[Orchestrator] Failed to fetch tools from ${serverName}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  private formatToolForSandbox(serverName: string, server: ActiveServer, tool: any): SandboxTool {
    return {
      name: `${serverName}_${tool.name}`, // Namespacing to prevent collisions
      description: tool.description,
      inputSchema: tool.inputSchema,
      // The Magic: Create a closure that calls the MCP tool
      handler: async (args: any) => {
        if (process.env.DEBUG_MCP === 'true') {
          console.log(`[MCP] Calling ${serverName}:${tool.name}`, args);
        }
        server.lastUsed = Date.now(); // Update activity
        
        try {
          const result = await server.client.callTool({
            name: tool.name,
            arguments: args,
          });
          
          // Return the content directly to the agent
          return result.content;
        } catch (error: any) {
          console.error(`[MCP] Tool Execution Failed:`, error);
          throw new Error(`MCP Tool Error: ${error.message}`);
        }
      }
    };
  }

  private async ensureServerRunning(serverName: string) {
    if (this.activeServers.has(serverName)) {
      this.activeServers.get(serverName)!.lastUsed = Date.now();
      return;
    }

    console.log(`[Orchestrator] Starting MCP Server: ${serverName}...`);

    try {
      // 1. Get Config
      const config = await RegistryClient.getServerConfig(serverName);

      // 2. Initialize Transport (Stdio)
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
      });

      // 3. Initialize Client
      const client = new Client(
        { name: "domoreai-orchestrator", version: "1.0.0" },
        { capabilities: {} }
      );

      // 4. Connect
      await client.connect(transport);
      
      this.activeServers.set(serverName, { 
        client, 
        transport, 
        lastUsed: Date.now() 
      });
      
      console.log(`[Orchestrator] Connected to ${serverName}`);
    } catch (error) {
      console.error(`[Orchestrator] Failed to start server ${serverName}:`, error);
      throw error;
    }
  }

  private async cleanupIdleServers() {
    const now = Date.now();
    for (const [name, server] of this.activeServers.entries()) {
      if (now - server.lastUsed > this.SHUTDOWN_TIMEOUT) {
        console.log(`[Orchestrator] Shutting down idle server: ${name}`);
        try {
          await server.client.close();
        } catch (e) {
          console.error(`[Orchestrator] Error closing client ${name}:`, e);
        } finally {
          this.activeServers.delete(name);
        }
      }
    }
  }
}

export const mcpOrchestrator = new McpOrchestrator();

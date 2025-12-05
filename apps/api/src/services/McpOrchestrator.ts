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
    const mcpTools = results.flat();

    // Inject Internal Tools
    const internalTools = this.getInternalTools();
    
    return [...mcpTools, ...internalTools];
  }

  private getInternalTools(): SandboxTool[] {
    return [
      {
        name: 'search_codebase',
        description: 'Semantic search over the codebase using vector embeddings. Use this to find relevant code snippets or documentation.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            limit: { type: 'number', description: 'Max results to return (default 5)' }
          },
          required: ['query']
        },
        handler: async (args: any) => {
          const { vectorStore, createEmbedding } = await import('./vector.service.js');
          const queryEmbedding = await createEmbedding(args.query);
          const results = await vectorStore.search(queryEmbedding, args.limit || 5);
          
          return results.map(r => `File: ${r.metadata.filePath}\nSimilarity: ${(r as any).similarity.toFixed(4)}\nContent:\n${r.metadata.chunk}\n---`).join('\n');
        }
      }
    ];
  }

  private formatToolForSandbox(serverName: string, server: ActiveServer, tool: any): SandboxTool {
    const safeName = `${serverName}_${tool.name}`.replace(/-/g, '_');

    return {
      name: safeName,
      description: `\n      [MCP Server: ${serverName}] ${tool.description}\n      @example\n      // Call the tool from code-mode:\n      await ${safeName}({ /* tool arguments here */ });\n      `,
      inputSchema: tool.inputSchema,
      handler: async (args: any) => {
        server.lastUsed = Date.now();

        try {
          const result = await server.client.callTool({
            name: tool.name,
            arguments: args,
          });

          // If the MCP protocol returned an application-level error, THROW so generated code's try/catch can handle it
          if (result && typeof result === 'object' && (result.isError || result.error)) {
            console.warn(`[MCP] Tool Logic Error from ${serverName}:${tool.name}:`, result);
            throw new Error(`MCP Tool Error: ${JSON.stringify(result.content ?? result)}`);
          }

          // Unwrap single text content for convenience
          if (result && result.content && Array.isArray(result.content) && result.content.length === 1 && result.content[0].type === 'text') {
            return result.content[0].text;
          }

          return result.content ?? result;

        } catch (error: any) {
          console.error(`[MCP] Protocol Error calling ${serverName}:${tool.name}:`, error);
          throw new Error(`Failed to execute ${safeName}: ${error.message || String(error)}`);
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

      // Document the server
      // We run this in background so it doesn't block startup
      import('./ToolDocumenter.js').then(({ ToolDocumenter }) => {
        ToolDocumenter.documentServer(serverName, client).catch(err => {
          console.error(`[Orchestrator] Failed to document ${serverName}:`, err);
        });
      });
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

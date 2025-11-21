import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { TRPCError } from '@trpc/server';
import axios from 'axios';

export interface ToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: any;
  source: 'legacy' | 'mcp';
  clientId?: string; // If source is 'mcp'
}

export class McpOrchestrator {
  private clients: Map<string, Client> = new Map();
  private legacyLootboxUrl: string;

  constructor() {
    this.legacyLootboxUrl = process.env.LOOTBOX_URL || 'http://localhost:3000';
    console.log(`[McpOrchestrator] Initialized. Legacy URL: ${this.legacyLootboxUrl}`);
  }

  /**
   * Spawns a local MCP server using stdio.
   */
  async spawnServer(id: string, command: string, args: string[]) {
    console.log(`[McpOrchestrator] Spawning server ${id}: ${command} ${args.join(' ')}`);
    const transport = new StdioClientTransport({
      command,
      args,
    });
    
    const client = new Client({
      name: "core-orchestrator",
      version: "1.0.0",
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    this.clients.set(id, client);
    console.log(`[McpOrchestrator] Server ${id} connected.`);
    return { id, status: 'connected' };
  }

  /**
   * Connects to a remote MCP server using SSE.
   */
  async connectServer(id: string, url: string) {
    console.log(`[McpOrchestrator] Connecting to server ${id} at ${url}`);
    const transport = new SSEClientTransport(new URL(url));
    
    const client = new Client({
      name: "core-orchestrator",
      version: "1.0.0",
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    this.clients.set(id, client);
    console.log(`[McpOrchestrator] Server ${id} connected.`);
    return { id, status: 'connected' };
  }

  /**
   * Aggregates tools from Legacy Lootbox and all connected MCP servers.
   */
  async getTools(): Promise<ToolDescriptor[]> {
    const tools: ToolDescriptor[] = [];

    // 1. Fetch Legacy Tools
    try {
      // The legacy registry endpoint was /namespaces, but let's assume we want a flat list of tools
      // Or we can try to adapt the legacy response.
      // For now, let's try to hit the legacy endpoint and see what happens.
      // If it fails, we just log it.
      // The previous code used `${registryUrl}/namespaces`.
      const response = await axios.get(`${this.legacyLootboxUrl}/namespaces`);
      // Legacy response format: { namespaces: [...] } or similar?
      // Let's assume it returns a list of tools or we map them.
      // For safety, let's just push a generic "legacy" tool if we can't parse.
      if (Array.isArray(response.data)) {
         // If it is an array, map it
         response.data.forEach((t: any) => {
             tools.push({
                 name: t.name || t,
                 description: t.description || 'Legacy Tool',
                 source: 'legacy',
                 inputSchema: t.args || {}
             });
         });
      } else if (response.data.namespaces) {
          // If it has namespaces
           response.data.namespaces.forEach((ns: any) => {
               // This is a guess at the structure.
               tools.push({
                   name: ns.name || ns,
                   description: 'Legacy Namespace',
                   source: 'legacy'
               });
           });
      }
    } catch (err) {
      console.warn('[McpOrchestrator] Failed to fetch legacy tools:', err instanceof Error ? err.message : err);
    }

    // 2. Fetch MCP Tools
    for (const [id, client] of this.clients.entries()) {
      try {
        const result = await client.listTools();
        result.tools.forEach(t => {
          tools.push({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            source: 'mcp',
            clientId: id
          });
        });
      } catch (err) {
        console.error(`[McpOrchestrator] Failed to list tools for client ${id}:`, err);
      }
    }

    return tools;
  }

  /**
   * Executes a tool. Routes to Legacy or MCP based on source.
   * Note: The caller needs to know the source. If not provided, we might have to guess.
   */
  async executeTool(toolName: string, args: any, clientId?: string) {
    // If clientId is provided, use that MCP server
    if (clientId) {
      const client = this.clients.get(clientId);
      if (!client) throw new TRPCError({ code: 'BAD_REQUEST', message: `Client ${clientId} not found` });
      return client.callTool({ name: toolName, arguments: args });
    }

    // If no clientId, assume Legacy for now (or we could search)
    // The previous LootboxService just POSTed to /execute
    try {
      console.log(`[McpOrchestrator] Executing legacy tool: ${toolName}`);
      const response = await axios.post(`${this.legacyLootboxUrl}/execute`, { toolName, args });
      return response.data;
    } catch (error: any) {
      console.error('[McpOrchestrator] Legacy execution failed:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Tool execution failed: ${error.message}`,
      });
    }
  }
}

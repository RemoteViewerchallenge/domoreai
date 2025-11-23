import { spawn, ChildProcess } from 'child_process';
import { RegistryClient } from './mcp-registry-client.js';

export class McpOrchestrator {
  private activeServers = new Map<string, { process: ChildProcess, lastUsed: number }>();
  private SHUTDOWN_TIMEOUT = 1000 * 60 * 5; // 5 minutes

  constructor() {
    // Start the cleanup interval
    setInterval(() => this.cleanupIdleServers(), 60000);
  }

  /**
   * Called when an Agent Role is initialized
   */
  async prepareEnvironmentForRole(roleId: string, tools: string[]) {
    // 1. Identify which servers own these tools
    const serverMap = await this.resolveToolsToServers(tools);

    // 2. Ensure those servers are running
    for (const serverName of serverMap.keys()) {
      await this.ensureServerRunning(serverName);
    }
    
    // 3. Configure Proxy to point to these active servers
    // (This depends on how your meta-mcp-proxy accepts config updates)
    await this.updateProxyConfig(this.activeServers);
  }

  // Management methods
  async spawnServer(id: string, command: string, args: string[]) {
      console.log(`Spawning server ${id}`);
      // This is exposed for manual spawning if needed, but ensureServerRunning is preferred
      return { success: true };
  }

  async connectServer(id: string, url: string) {
      console.log(`Connecting server ${id} to ${url}`);
      return { success: true };
  }

  // Placeholder for methods called by lootbox.router if it still uses orchestrator
  // The new lootbox.router implementation in the prompt doesn't use orchestrator for getTools
  // but might use it for executeTool if we keep that endpoint.
  async executeTool(toolName: string, args: any, clientId?: string) {
       console.log(`Executing tool ${toolName}`);
       throw new Error(`ToolNotFoundError: Tool ${toolName} not found.`);
  }
  
  async getTools() {
      return [];
  }

  private async resolveToolsToServers(tools: string[]): Promise<Map<string, string[]>> {
    // In a real app, this would query the registry to find which server hosts which tool.
    throw new Error("ToolNotFoundError: Could not resolve tools to servers.");
  }

  private async ensureServerRunning(serverName: string) {
    if (this.activeServers.has(serverName)) {
      this.activeServers.get(serverName)!.lastUsed = Date.now();
      return;
    }

    console.log(`[Orchestrator] Auto-starting MCP Server: ${serverName}...`);
    
    const serverConfig = await RegistryClient.getServerConfig(serverName);
    
    const child = spawn(serverConfig.command, serverConfig.args, {
      env: { ...process.env, ...serverConfig.env }
    });

    this.activeServers.set(serverName, { process: child, lastUsed: Date.now() });
  }

  private cleanupIdleServers() {
    const now = Date.now();
    for (const [serverName, server] of this.activeServers.entries()) {
      if (now - server.lastUsed > this.SHUTDOWN_TIMEOUT) {
        console.log(`[Orchestrator] Shutting down idle server: ${serverName}`);
        server.process.kill();
        this.activeServers.delete(serverName);
      }
    }
  }

  private async updateProxyConfig(activeServers: Map<string, { process: ChildProcess, lastUsed: number }>) {
      // Logic to update the proxy with new server ports/transports
      console.log(`Updating proxy config for ${activeServers.size} servers`);
  }
}

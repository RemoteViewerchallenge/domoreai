import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  private REGISTRY_URL = process.env.MCP_REGISTRY_URL || 'https://registry-mcp.remote-mcp.com';

  async listServers(): Promise<{ name: string; description?: string }[]> {
    try {
      // MOCK for now to unblock UI work, as we don't have the SSE client setup for the registry yet.
      return [
        { name: 'git', description: 'Git repository management' },
        { name: 'postgres', description: 'Database access' },
        { name: 'filesystem', description: 'Local file system access' },
        { name: 'browser', description: 'Web browsing capabilities' }
      ];
    } catch (error) {
      console.error("Failed to list servers:", error);
      return [];
    }
  }

  async getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    // In a real implementation, this would fetch from the registry API
    // For now, we'll mock it or assume a simple endpoint
    try {
      const response = await fetch(`${this.REGISTRY_URL}/v1/servers/${serverName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config for server ${serverName}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching server config for ${serverName}:`, error);
      // Fallback for testing/dev if registry is not available
      // This is just a placeholder to prevent crashes during development
      return {
        command: 'echo',
        args: [`Server ${serverName} not found`],
        env: {}
      };
    }
  }

  // Static Facade for backward compatibility
  private static instance = new RegistryClient();

  static async listServers() {
      return this.instance.listServers();
  }

  static async getServerConfig(serverName: string) {
      return this.instance.getServerConfig(serverName);
  }
}

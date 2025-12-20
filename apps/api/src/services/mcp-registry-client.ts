import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  listServers(): Promise<{ name: string; description?: string }[]> {
    return Promise.resolve([
      { name: 'filesystem', description: 'Surgical file editing with insert/replace operations' },
      { name: 'git', description: 'Git history, diffs, and repository management' },
      { name: 'postgres', description: 'Database inspection and query optimization' },
      { name: 'playwright', description: 'Browser automation and visual testing' },
      { name: 'language-server', description: 'LSP features: go-to-definition, find-references' }
    ]);
  }

  getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/domoreai";

    const configs: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {
      // 1. Perception Layer (Filesystem)
      // Provides 'update_file' (surgical edits) and 'list_files'
      'filesystem': {
        command: 'npx',
        args: ['-y', '@cyanheads/filesystem-mcp-server'],
        env: {}
      },
      
      // 2. Operational History (Git)
      // Provides 'git_diff', 'git_log', 'git_status'
      'git': {
        command: 'npx',
        args: ['-y', 'git-mcp-server'],
        env: {}
      },
      
      // 3. Database Layer (Postgres)
      // Provides 'query', 'get_schema', 'explain_analyze'
      'postgres': {
        command: 'npx',
        args: ['-y', '@henkey/postgres-mcp-server'],
        env: { 
          "POSTGRES_CONNECTION_STRING": dbUrl 
        }
      },

      // 4. UI Verification (Playwright)
      // Provides 'navigate', 'click', 'screenshot'
      'playwright': {
        command: 'npx',
        args: ['-y', '@automatalabs/mcp-server-playwright'],
        env: {}
      },

      // 5. Cognition Layer (LSP)
      // Provides 'go_to_definition', 'find_references'
      // *Requires binary to be in PATH*
      'language-server': {
        command: 'mcp-language-server',
        args: [],
        env: {}
      }
    };

    const config = configs[serverName];
    if (!config) {
      return Promise.reject(new Error(`Unknown MCP server: ${serverName}`));
    }
    
    return Promise.resolve(config);
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


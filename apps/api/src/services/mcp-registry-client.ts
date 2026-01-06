import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  listServers(): Promise<{ name: string; description?: string }[]> {
    return Promise.resolve([
      { name: 'filesystem', description: 'System: Surgical file editing' },
      { name: 'git', description: 'System: Git history and operations' },
      { name: 'postgres', description: 'System: Database inspection' },
      { name: 'playwright', description: 'System: UI verification' },
      { name: 'language-server', description: 'System: LSP Intelligence' },
      { name: 'roundtable', description: 'Orchestration: Model coordination' },
      { name: 'ncp', description: 'Discovery: Semantic tool management' },
      { name: 'context7', description: 'Grounding: Documentation fetching' },
      { name: 'mastra', description: 'Workflow: Process control' },
      { name: 'deepwiki', description: 'Knowledge: Deep research' },
      { name: 'docker', description: 'Execution: Sandboxed environment' },
      { name: 'memory', description: 'Memory: Knowledge Graph' }
    ]);
  }

  getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/domoreai";

    const configs: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {
      // 1. Perception Layer (Filesystem)
      'filesystem': {
        command: 'sh',
        args: ['-c', 'cd /home/guy/mono/mcp/extracted/filesystem-mcp-server-main && npx tsx src/index.ts'],
        env: {}
      },
      
      // 2. Operational History (Git)
      'git': {
        command: 'sh',
        args: ['-c', 'cd /home/guy/mono/mcp/extracted/git-mcp-server-main && npx tsx src/index.ts'],
        env: {}
      },
      
      // 3. Database Layer (Postgres)
      'postgres': {
        command: 'npx',
        args: ['-y', '@henkey/postgres-mcp-server'],
        env: { 
          "POSTGRES_CONNECTION_STRING": dbUrl 
        }
      },

      // 4. UI Verification (Playwright)
      'playwright': {
        command: 'npx',
        args: ['-y', '@automatalabs/mcp-server-playwright'],
        env: {}
      },

      // 5. Cognition (Language Server)
      'language-server': {
        command: 'sh',
        args: ['-c', 'cd /home/guy/mono/mcp/extracted/mcp-language-server-main && ./mcp-language-server'],
        env: {}
      },

      // 6. Orchestration (Roundtable)
      'roundtable': {
         command: 'uv',
         args: ['run', '--directory', '/home/guy/mono/mcp/extracted/roundtable-main', 'roundtable-mcp-server'],
         env: {}
      },

      // 7. Discovery (NCP)
      'ncp': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/ncp-main && npx tsx src/index.ts'],
         env: {}
      },

      // 8. Grounding (Context7)
      'context7': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/context7-master/packages/mcp && node dist/index.js'],
         env: {}
      },

      // 9. Workflow (Mastra)
      'mastra': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/mastra-main/packages/mcp && node dist/index.js'],
         env: {}
      },

      // 10. Knowledge (DeepWiki)
      'deepwiki': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/deepwiki-mcp-main && npx tsx src/index.ts'],
         env: {}
      },

      // 11. Execution (Docker)
      'docker': {
         command: 'uv',
         args: ['run', '--directory', '/home/guy/mono/mcp/extracted/mcp-server-docker-main', 'mcp-server-docker'],
         env: {}
      },
      
      // 12. Memory (KnowledgeGraph)
      'memory': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/knowledgegraph-mcp-main && node dist/index.js'],
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


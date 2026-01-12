import { IRegistryClient } from "../interfaces/IRegistryClient.js";

export class RegistryClient implements IRegistryClient {
  listServers(): Promise<{ name: string; description?: string }[]> {
    return Promise.resolve([
      { name: 'filesystem', description: 'System: Surgical file editing' },
      { name: 'git', description: 'System: Git history and operations' },
      { name: 'postgres', description: 'System: Database inspection' },
      { name: 'playwright', description: 'System: UI verification' },
      { name: 'language-server', description: 'System: LSP Intelligence' },
      { name: 'context7', description: 'Grounding: Documentation fetching' },
      { name: 'docker', description: 'Execution: Sandboxed environment' },
      { name: 'memory', description: 'Memory: Knowledge Graph' },
      { name: 'planning', description: 'Strategy: Software Planning Tool' },
      { name: 'deep-research', description: 'Research: Deep Web & Academic Search' },
      { name: 'commander', description: 'System: Process & Fuzzy Search' },
      { name: 'linear', description: 'Project Management: Linear Issues' }
    ]);
  }

  getServerConfig(serverName: string): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/domoreai";

    const configs: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {
      // 1. Perception Layer (Filesystem)
      'filesystem': {
        command: 'node',
        args: ['/home/guy/mono/apps/api/node_modules/@cyanheads/filesystem-mcp-server/dist/index.js'],
        env: {}
      },
      
      // 2. Operational History (Git)
      'git': {
        command: 'node',
        args: ['/home/guy/mono/apps/api/node_modules/git-mcp-server/build/index.js'],
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
         command: '/home/guy/mono/mcp/extracted/mcp-language-server-main/mcp-language-server',
         args: [
             '-lsp', '/home/guy/mono/apps/api/node_modules/.bin/typescript-language-server', 
             '-workspace', '/home/guy/mono',
             '--', 
             '--stdio'
         ],
         env: {}
      },



      // 8. Grounding (Context7)
      'context7': {
         command: 'node',
         args: ['/home/guy/mono/mcp/extracted/context7-master/packages/mcp/dist/index.js'],
         env: {}
      },



      // 10. Knowledge (DeepWiki)

      // 11. Execution (Docker)
      'docker': {
         command: '/home/guy/mono/mcp/extracted/mcp-server-docker-main/.venv/bin/mcp-server-docker',
         args: [],
         env: {}
      },
      
      // 12. Memory (KnowledgeGraph)
      'memory': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/knowledgegraph-mcp-main && node dist/index.js'],
         env: {}
      },

      // 18. Project Management (Linear)
      'linear': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/mcp-linear-main && node --experimental-json-modules dist/index.js'],
         env: {}
      },







      // 20. Planning (Software Planning Tool)
      'planning': {
         command: 'node',
         args: ['/home/guy/mono/mcp/extracted/Software-planning-mcp-main/build/index.js'],
         env: {}
      },

      // 21. Research (Deep Research)
      'deep-research': {
         command: '/home/guy/mono/mcp/extracted/Claude-Deep-Research-main/.venv/bin/python',
         args: ['/home/guy/mono/mcp/extracted/Claude-Deep-Research-main/deep_research.py'],
         env: {}
      },
      
      // 22. Commander (Desktop Commander)
      'commander': {
          command: 'node',
          args: ['/home/guy/mono/mcp/extracted/DesktopCommanderMCP-main/dist/index.js'],
          env: {}
      },


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


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
      { name: 'memory', description: 'Memory: Knowledge Graph' },
      { name: 'tavily', description: 'Web Search: Tavily Search' },
      { name: 'serena', description: 'Coding: Agent Toolkit' },
      { name: 'openspec', description: 'SDLC: Spec-Driven Development' },
      { name: 'graphiti', description: 'Memory: Temporal Knowledge Graph' },
      { name: 'sentry', description: 'Monitoring: Sentry Error Tracking' },
      { name: 'linear', description: 'Project Management: Linear Issues' },
      { name: 'jira', description: 'Project Management: Jira Issues' },
      { name: 'mindsdb', description: 'Data: AI Database' },
      { name: 'langgraph', description: 'Workflow: LangGraph Agents' }
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
      },

      // 13. Web Search (Tavily)
      'tavily': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/mcp-server-tavily-main && uv run tavily-search'],
         env: {}
      },

      // 14. Coding Agent (Serena)
      'serena': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/serena-main && uv run serena-mcp-server'],
         env: {}
      },

      // 15. SDLC (OpenSpec)
      'openspec': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/openspec-main && node dist/cli/index.js'],
         env: {}
      },

      // 16. Temporal Graph (Graphiti)
      'graphiti': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/graphiti-main && uv run -m mcp_server'],
         env: {}
      },

      // 17. Monitoring (Sentry)
      'sentry': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/sentry-mcp-main && node packages/mcp-server/dist/index.js'],
         env: {}
      },

      // 18. Project Management (Linear)
      'linear': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/mcp-linear-main && node dist/index.js'],
         env: {}
      },

      // 19. Project Management (Jira)
      'jira': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/mcp-atlassian-main && uv run mcp-atlassian'],
         env: {}
      },

      // 20. AI Database (MindsDB)
      'mindsdb': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/minds-mcp-main && uv run server.py'],
         env: {}
      },

      // 21. Workflow Agents (LangGraph)
      'langgraph': {
         command: 'sh',
         args: ['-c', 'cd /home/guy/mono/mcp/extracted/langgraph-mcp-main && uv run -m langgraph_mcp'],
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


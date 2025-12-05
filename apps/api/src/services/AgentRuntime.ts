import { CodeModeUtcpClient } from '@utcp/code-mode';
import { CallTemplateSerializer, CommunicationProtocol, CallTemplate, IUtcpClient, Tool } from '@utcp/sdk';
import { z } from 'zod';
import { terminalTools } from '../tools/terminal.js';
import { createFsTools } from '../tools/filesystem.js';
import { browserTools } from '../tools/browser.js';
import { webScraperTool } from '../tools/webScraper.js';
import { complexityTool } from '../tools/complexityTool.js';
import { mcpOrchestrator } from './McpOrchestrator.js';
import { metaTools } from '../tools/meta.js';
import { listFilesTree, searchCodebase } from '@repo/mcp-server-vfs';
import { vfsSessionService } from './vfsSession.service.js';
import { contextManager } from './ContextManager.js';

// --- Local Protocol Implementation ---

const LocalCallTemplateSchema = z.object({
  call_template_type: z.literal('local'),
  name: z.string(),
  tools: z.array(z.any()).optional().default([]),
}).passthrough();

// Define types for Tool Definition
interface ToolDefinition {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  tags?: string[];
  handler?: (args: unknown) => unknown;
}

interface ManualCallTemplate extends CallTemplate {
  name: string;
  tools?: ToolDefinition[];
  call_template_type: string; // Must be string, not optional
}

class LocalCallTemplateSerializer extends CallTemplateSerializer {
  toDict(obj: CallTemplate) { return obj as unknown as Record<string, unknown>; }
  validateDict(obj: unknown) { return LocalCallTemplateSchema.parse(obj); }
}

class LocalCommunicationProtocol extends CommunicationProtocol {
  private handlers = new Map<string, (args: unknown) => unknown>();

  async registerManual(client: IUtcpClient, manualCallTemplate: CallTemplate) {
    const template = manualCallTemplate as ManualCallTemplate;
    const tools: Tool[] = [];
    const prefix = template.name;

    for (const toolDef of template.tools || []) {
      // Ensure tool name is fully qualified if not already
      const fullToolName = toolDef.name.includes('.') ? toolDef.name : `${prefix}.${toolDef.name}`;
      
      // Store handler
      if (toolDef.handler) {
        this.handlers.set(fullToolName, toolDef.handler);
      }

      tools.push({
        name: fullToolName,
        description: toolDef.description || '',
        inputs: toolDef.input_schema || toolDef.inputs || {},
        outputs: toolDef.outputs || {},
        tags: toolDef.tags || [],
        tool_call_template: {
            call_template_type: 'local',
            name: prefix
        }
      });
    }
    
    // Satisfy async requirement
    await Promise.resolve();

    return {
      success: true,
      manual: {
        utcp_version: '1.0.0',
        manual_version: '1.0.0',
        tools: tools
      },
      manualCallTemplate: template as unknown as CallTemplate,
      errors: []
    };
  }

  async deregisterManual(client: IUtcpClient, manualCallTemplate: CallTemplate) {
      const template = manualCallTemplate as ManualCallTemplate;
      // Cleanup handlers for this manual
      const prefix = template.name;
      for (const key of this.handlers.keys()) {
          if (key.startsWith(prefix + '.')) {
              this.handlers.delete(key);
          }
      }
      // Satisfy async requirement
      await Promise.resolve();
  }

  async callTool(client: IUtcpClient, toolName: string, args: unknown) {
    const handler = this.handlers.get(toolName);
    if (!handler) {
        throw new Error(`No local handler found for tool ${toolName}`);
    }
    return await handler(args);
  }

  async *callToolStreaming(client: IUtcpClient, toolName: string, args: unknown) {
      // For now, just yield the result of callTool as a single chunk
      const result = await this.callTool(client, toolName, args);
      yield result;
  }
}

// Register the protocol globally (idempotent)
CallTemplateSerializer.registerCallTemplate('local', new LocalCallTemplateSerializer());

export class AgentRuntime {
  private client!: CodeModeUtcpClient;
  private fsTools: ReturnType<typeof createFsTools>;
  private rootPath: string;
  private contextManager = contextManager;
  private toolDocs: string = '';

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.fsTools = createFsTools(rootPath);
    // use the shared contextManager singleton
    this.contextManager = contextManager;
  }

  static async create(rootPath?: string, tools: string[] = []): Promise<AgentRuntime> {
    const runtime = new AgentRuntime(rootPath);
    await runtime.init(tools);
    return runtime;
  }

  private async init(requestedTools: string[], _roleId?: string) {
    this.client = await CodeModeUtcpClient.create();

    // ONLY setup tools if explicitly requested
    if (requestedTools.length === 0) {
      console.log('[AgentRuntime] No tools requested - running in simple chat mode');
      return;
    }

    // INJECT LOCAL PROTOCOL INSTANCE INTO THIS CLIENT
    const localProtocol = new LocalCommunicationProtocol();
    // @ts-expect-error - accessing private/internal map
    this.client._registeredCommProtocols.set('local', localProtocol);
    
    // 1. Initialize Orchestrator & Load Servers
    // We assume requestedTools contains server names like 'git', 'postgres'
    // Filter out native tools and 'meta' from this list before passing to orchestrator
    const nativeToolNames = ['read_file', 'write_file', 'list_files', 'browse', 'research.web_scrape', 'analysis.complexity'];
    const serverNames = requestedTools.filter(t => !nativeToolNames.includes(t) && t !== 'meta');
    
    if (serverNames.length > 0) {
        await mcpOrchestrator.prepareEnvironment(serverNames); 
    }

    // 2. Get Dynamic Tools
    const mcpTools = await mcpOrchestrator.getToolsForSandbox();
    
    // 3. Register "system" namespace with Native, MCP, and optionally Meta tools
    const nativeTools = this.getNativeTools().filter(t => 
        requestedTools.includes(t.name)
    );

    // 4. Add meta-tools if requested and role has permission
    const toolsToRegister = [...nativeTools, ...mcpTools];
    
    if (requestedTools.includes('meta')) {
      console.log('[AgentRuntime] Meta-tools requested - adding role and orchestration management tools');
      toolsToRegister.push(...metaTools);
    }

    await this.client.registerManual({
      name: 'system',
      call_template_type: 'local',
      tools: toolsToRegister
    } as unknown as CallTemplate); // Cast to CallTemplate
    
    // 5. Load Tool Documentation
    await this.loadToolDocs(requestedTools);
    
    console.log(`[AgentRuntime] Registered ${toolsToRegister.length} tools: ${nativeTools.length} native, ${mcpTools.length} MCP${requestedTools.includes('meta') ? ', ' + metaTools.length + ' meta' : ''}`);
  }

  private getNativeTools(): ToolDefinition[] {
     return [
        { 
            name: 'read_file', 
            handler: async (args: unknown) => this.fsTools.readFile(args as { path: string }),
            description: 'Read a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        { 
            name: 'write_file', 
            handler: async (args: unknown) => this.fsTools.writeFile(args as { path: string; content: string }),
            description: 'Write to a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    content: { type: 'string' }
                },
                required: ['path', 'content']
            }
        },
        { 
            name: 'list_files', 
            handler: async (args: unknown) => this.fsTools.listFiles(args as { path: string }),
            description: 'List files in a directory',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        { 
            name: 'browse', 
            handler: async (args: unknown) => browserTools.fetchPage(args as { url: string }),
            description: 'Fetch a web page',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string' }
                },
                required: ['url']
            }
        },
        {
          name: webScraperTool.name,
          handler: async (args: unknown) => webScraperTool.handler(args as { url: string }),
          description: webScraperTool.description,
          input_schema: webScraperTool.input_schema
        },
        {
          name: complexityTool.name,
          handler: async (args: unknown) => complexityTool.handler(args as { taskDescription: string }),
          description: complexityTool.description,
          input_schema: complexityTool.input_schema
        },
        {
            name: 'terminal_execute',
            handler: async (args: unknown) => {
                // delegate to the centralized terminal tool implementation
                // terminalTools.execute.handler expects { command, cwd }
                return await (terminalTools.execute.handler as any)(args as any);
            },
            description: terminalTools.execute.description,
            input_schema: terminalTools.execute.inputSchema as unknown as Record<string, unknown>
        },
        {
            name: 'search_codebase',
            handler: async (args: unknown) => {
                const typedArgs = args as { query: string };
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: this.rootPath });
                return searchCodebase(fs, typedArgs.query);
            },
            description: 'Search the codebase for a string',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            }
        },
        {
            name: 'list_files_tree',
            handler: async () => {
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: this.rootPath });
                return listFilesTree(fs, '/');
            },
            description: 'List files in a tree structure',
            input_schema: {
                type: 'object',
                properties: {},
                required: []
            }
        }
     ];
  }

  async runAgentLoop(userGoal: string, llmCallback: (prompt: string) => Promise<string>) {
    // The Prompt for the LLM


    // 1. Get Code from LLM (using the provided callback)
    const aiResponse = await llmCallback(userGoal); 
    
    // Convert response to string if it's an object (some providers return objects)
    const responseStr = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
    
    // Simple code extraction (regex for ```ts ... ``` or just the whole body if no blocks)
    const codeBlockMatch = responseStr.match(/```(?:typescript|ts|js|javascript)?\n([\s\S]*?)```/);
    
    let codeToExecute: string | null = null;

    if (codeBlockMatch) {
        codeToExecute = codeBlockMatch[1];
    } else {
        // SAFETY CHECK: If no code block, only execute if it looks like code.
        // If it contains markdown bold/italic or doesn't look like code, skip execution.
        const isMarkdown = /\*\*|__/.test(responseStr); // Simple check for bold
        // Check for common code keywords at the start of lines
        const hasCodeKeywords = /^(?:import|const|let|var|function|class|await|system\.)/m.test(responseStr.trim());
        
        if (!isMarkdown && hasCodeKeywords) {
            codeToExecute = responseStr;
        }
    }

    if (!codeToExecute) {
        // Treat as conversational response - DO NOT EXECUTE
        console.log('[AgentRuntime] No code block found and text looks conversational. Skipping execution.');
        return { result: responseStr, logs: [] };
    }

    // 2. Execute in Sandbox
    const { result, logs } = await this.client.callToolChain(codeToExecute);
    
    // 3. Return logs to your UI Terminal
    return { result, logs };
  }

  /**
   * Wrap a provider/agent generate call and enhance the system prompt
   * using the ContextManager state for the given roleId.
   */
  async generateWithContext(agent: { generate: (prompt: string) => Promise<unknown> }, baseSystemPrompt: string, prompt: string, roleId?: string) {
    const roleContext = roleId ? await this.contextManager.getContext(roleId) : { tone: '', style: '', memory: {} };
    const memoryStr = Object.entries(roleContext.memory || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
    
    let enhancedSystemPrompt = `${baseSystemPrompt || ''}\n\n${roleContext.tone || ''}\n\n${memoryStr}`.trim();
    
    // Inject Tool Documentation
    if (this.toolDocs) {
        if (enhancedSystemPrompt.includes('{{tool_definitions}}')) {
            enhancedSystemPrompt = enhancedSystemPrompt.replace('{{tool_definitions}}', this.toolDocs);
        } else {
            // Auto-append Protocol + Docs if tag is missing
            const CODE_MODE_PROTOCOL = `
## 🛠️ TOOL USAGE PROTOCOL
You are operating in **CODE MODE**. To perform actions, you must write executable TypeScript code blocks.
- Use the \`system\` namespace for tools (e.g., \`await system.read_file({ path: "..." })\`).
- Always wrap logic in \`async function main() { ... }\` or top-level await blocks.
- Use \`console.log()\` to output your final answer or reasoning.

### Available Tools:
${this.toolDocs}
`;
            enhancedSystemPrompt += CODE_MODE_PROTOCOL;
        }
    }

    const finalPrompt = `${enhancedSystemPrompt}\n\n${prompt}`.trim();
    // Delegate to the provided agent/provider
    return agent.generate(finalPrompt);
  }

  private async loadToolDocs(tools: string[]) {
      const docs: string[] = [];
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Resolve path to .domoreai/tools
      let rootDir = process.cwd();
      if (rootDir.endsWith('apps/api')) {
          rootDir = path.resolve(rootDir, '../../');
      }
      const toolsDir = path.join(rootDir, '.domoreai/tools');

      const nativeTools = this.getNativeTools();

      for (const tool of tools) {
          // 1. Native Tools
          const nativeTool = nativeTools.find(t => t.name === tool);
          if (nativeTool) {
              docs.push(`### Tool: \`system.${nativeTool.name}\``);
              docs.push(`**Description:** ${nativeTool.description}`);
              docs.push('**Signature:**');
              docs.push('```typescript');
              // Simplified signature generation
              const props = nativeTool.input_schema?.properties || {};
              const args = Object.entries(props).map(([k, v]) => `${k}: ${(v).type}`).join(', ');
              docs.push(`await system.${nativeTool.name}({ ${args} })`);
              docs.push('```');
              docs.push('---');
              continue;
          }

          // 2. MCP Tools (Server Names)
          // We assume the tool string IS the server name for MCP tools in this context
          // (AgentRuntime init receives server names)
          try {
              const content = await fs.readFile(path.join(toolsDir, `${tool}_examples.md`), 'utf-8');
              docs.push(content);
          } catch (e) {
              // Ignore if no doc found
          }
      }
      
      this.toolDocs = docs.join('\n\n');
  }
}

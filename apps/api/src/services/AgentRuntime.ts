import { CodeModeUtcpClient } from '@utcp/code-mode';
import { CallTemplateSerializer, CallTemplate, CommunicationProtocol } from '@utcp/sdk';
import { createFsTools } from '../tools/filesystem.js';
import { mcpOrchestrator } from './McpOrchestrator.js';
import { metaTools } from '../tools/meta.js';
import { contextManager } from './ContextManager.js';
import { LocalCommunicationProtocol, LocalCallTemplateSerializer, ToolDefinition } from './protocols/LocalProtocol.js';
import { getNativeTools } from './tools/NativeToolsRegistry.js';
import { loadToolDocs } from './tools/ToolDocumentationLoader.js';

// Register the protocol globally (idempotent)
CallTemplateSerializer.registerCallTemplate('local', new LocalCallTemplateSerializer());

interface IClientWithProtocolRegistry {
  _registeredCommProtocols: Map<string, CommunicationProtocol>;
}

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
    try {
      this.client = await CodeModeUtcpClient.create();
    } catch (error) {
      console.warn('[AgentRuntime] Failed to create UTCP client:', error);
      console.log('[AgentRuntime] Proceeding without tool support (simple chat mode)');
      return;
    }

    // ONLY setup tools if explicitly requested
    if (requestedTools.length === 0) {
      console.log('[AgentRuntime] No tools requested - running in simple chat mode');
      return;
    }

    // INJECT LOCAL PROTOCOL INSTANCE INTO THIS CLIENT
    const localProtocol = new LocalCommunicationProtocol();
    // Use an interface cast to bypass access restriction on private property in a typesafe manner
    (this.client as unknown as IClientWithProtocolRegistry)._registeredCommProtocols.set('local', localProtocol);
    
    // 1. Initialize Orchestrator & Load Servers
    // We assume requestedTools contains server names like 'git', 'postgres'
    // Filter out native tools and 'meta' from this list before passing to orchestrator
    const nativeToolNames = ['read_file', 'write_file', 'list_files', 'browse', 'research.web_scrape', 'analysis.complexity'];
    const serverNames = requestedTools.filter(t => !nativeToolNames.includes(t) && t !== 'meta');
    
    let mcpTools: ToolDefinition[] = [];
    
    if (serverNames.length > 0) {
      try {
        await mcpOrchestrator.prepareEnvironment(serverNames);
        // 2. Get Dynamic Tools from MCP servers
        const tools = await mcpOrchestrator.getToolsForSandbox();
        // Convert to ToolDefinition compatible format
        mcpTools = tools as unknown as ToolDefinition[];
      } catch (mcpError) {
        console.warn('[AgentRuntime] MCP connection failed:', mcpError);
        console.log('[AgentRuntime] Proceeding with native tools only');
        // Continue without MCP tools - don't crash the entire agent
      }
    }
    
    // 3. Register "system" namespace with Native, MCP, and optionally Meta tools
    const nativeTools = getNativeTools(this.rootPath, this.fsTools).filter(t =>
        requestedTools.includes(t.name)
    );

    // 4. Add meta-tools if requested and role has permission
    const toolsToRegister = [...nativeTools, ...mcpTools];
    
    if (requestedTools.includes('meta')) {
      console.log('[AgentRuntime] Meta-tools requested - adding role and orchestration management tools');
      toolsToRegister.push(...metaTools as unknown as ToolDefinition[]);
    }

    try {
      await this.client.registerManual({
        name: 'system',
        call_template_type: 'local',
        tools: toolsToRegister
      } as unknown as CallTemplate); // Cast to CallTemplate
      
      // 5. Load Tool Documentation
      this.toolDocs = await loadToolDocs(requestedTools, getNativeTools(this.rootPath, this.fsTools));
      
      console.log(`[AgentRuntime] Registered ${toolsToRegister.length} tools: ${nativeTools.length} native, ${mcpTools.length} MCP${requestedTools.includes('meta') ? ', ' + metaTools.length + ' meta' : ''}`);
    } catch (registerError) {
      console.warn('[AgentRuntime] Failed to register tools:', registerError);
      console.log('[AgentRuntime] Agent will run without tool support');
    }
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
}

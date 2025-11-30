import { CodeModeUtcpClient } from '@utcp/code-mode';
import { CallTemplateSerializer, CommunicationProtocol } from '@utcp/sdk';
import { z } from 'zod';
import { terminalTools } from '../tools/terminal.js';
import { createFsTools } from '../tools/filesystem.js';
import { browserTools } from '../tools/browser.js';
import { mcpOrchestrator } from './McpOrchestrator.js';

// --- Local Protocol Implementation ---

const LocalCallTemplateSchema = z.object({
  call_template_type: z.literal('local'),
  name: z.string(),
  tools: z.array(z.any()).optional().default([]),
}).passthrough();

class LocalCallTemplateSerializer extends CallTemplateSerializer {
  toDict(obj: any) { return obj; }
  validateDict(obj: any) { return LocalCallTemplateSchema.parse(obj); }
}

class LocalCommunicationProtocol extends CommunicationProtocol {
  private handlers = new Map<string, Function>();

  async registerManual(client: any, manualCallTemplate: any) {
    const tools: any[] = [];
    const prefix = manualCallTemplate.name;

    for (const toolDef of manualCallTemplate.tools || []) {
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
    
    return {
      success: true,
      manual: {
        utcp_version: '1.0.0',
        manual_version: '1.0.0',
        tools: tools
      },
      manualCallTemplate: manualCallTemplate, // Added missing property
      errors: []
    };
  }

  async deregisterManual(client: any, manualCallTemplate: any) {
      // Cleanup handlers for this manual
      const prefix = manualCallTemplate.name;
      for (const key of this.handlers.keys()) {
          if (key.startsWith(prefix + '.')) {
              this.handlers.delete(key);
          }
      }
  }

  async callTool(client: any, toolName: string, args: any) {
    const handler = this.handlers.get(toolName);
    if (!handler) {
        throw new Error(`No local handler found for tool ${toolName}`);
    }
    return handler(args);
  }

  async *callToolStreaming(client: any, toolName: string, args: any) {
      // For now, just yield the result of callTool as a single chunk
      const result = await this.callTool(client, toolName, args);
      yield result;
  }
}

// Register the protocol globally (idempotent)
CallTemplateSerializer.registerCallTemplate('local', new LocalCallTemplateSerializer());
// We need to register the protocol instance. Since it holds state (handlers), 
// we should probably create a shared instance or register it per client.
// However, CommunicationProtocol.communicationProtocols is static.
// We'll register a singleton for now, but this might share handlers across clients if not careful.
// A better approach is to register it on the client instance, but UtcpClient copies from static.
// We will register a fresh one, but note that `registerManual` populates it.
// Since `registerManual` is called per client, and we want isolation, this is tricky with the static registry.
// BUT `UtcpClient` constructor copies the map. So if we register it globally, new clients get a copy?
// No, it copies the *reference* to the protocol instance.
// So all clients would share the same protocol instance and handlers!
// This is bad for isolation if handlers differ.
// But here, handlers are mostly static (fsTools, browserTools).
// EXCEPT `fsTools` depends on `rootPath` which is per-client (AgentRuntime instance).
// So we DO need per-client isolation.

// Workaround: We can't easily register per-client protocol via the static registry.
// We will rely on the fact that we are in `AgentRuntime` and can hack the client instance.

export class AgentRuntime {
  private client!: CodeModeUtcpClient;
  private fsTools: ReturnType<typeof createFsTools>;

  constructor(rootPath: string = process.cwd()) {
    this.fsTools = createFsTools(rootPath);
  }

  static async create(rootPath?: string, tools: string[] = []): Promise<AgentRuntime> {
    const runtime = new AgentRuntime(rootPath);
    await runtime.init(tools);
    return runtime;
  }

  private async init(requestedTools: string[]) {
    this.client = await CodeModeUtcpClient.create();

    // ONLY setup tools if explicitly requested
    if (requestedTools.length === 0) {
      console.log('[AgentRuntime] No tools requested - running in simple chat mode');
      return;
    }

    // INJECT LOCAL PROTOCOL INSTANCE INTO THIS CLIENT
    const localProtocol = new LocalCommunicationProtocol();
    // @ts-ignore - accessing private/internal map
    this.client._registeredCommProtocols.set('local', localProtocol);
    
    // 1. Initialize Orchestrator & Load Servers
    // We assume requestedTools contains server names like 'git', 'postgres'
    // Filter out native tools from this list before passing to orchestrator
    const nativeToolNames = ['read_file', 'write_file', 'list_files', 'browse'];
    const serverNames = requestedTools.filter(t => !nativeToolNames.includes(t));
    
    if (serverNames.length > 0) {
        await mcpOrchestrator.prepareEnvironment(serverNames); 
    }

    // 2. Get Dynamic Tools
    const mcpTools = await mcpOrchestrator.getToolsForSandbox();
    
    // 3. Register "system" namespace with BOTH Native and MCP tools
    const nativeTools = this.getNativeTools().filter(t => 
        requestedTools.includes(t.name)
    );

    await this.client.registerManual({
      name: 'system',
      call_template_type: 'local',
      tools: [
        ...nativeTools, 
        ...mcpTools
      ]
    } as any);
    
    console.log(`Successfully registered manual 'system' with ${nativeTools.length + mcpTools.length} tools.`);
  }

  private getNativeTools() {
     return [
        { 
            name: 'read_file', 
            handler: this.fsTools.readFile,
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
            handler: this.fsTools.writeFile,
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
            handler: this.fsTools.listFiles,
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
            handler: browserTools.fetchPage,
            description: 'Fetch a web page',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string' }
                },
                required: ['url']
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
}

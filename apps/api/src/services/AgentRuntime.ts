import { CodeModeUtcpClient } from '@utcp/code-mode';
import { terminalTools } from '../tools/terminal.js';
import { fsTools } from '../tools/filesystem.js';
import { browserTools } from '../tools/browser.js';

export class AgentRuntime {
  private client!: CodeModeUtcpClient;

  constructor() {
    // Initialize the Code Mode Sandbox
    // Note: CodeModeUtcpClient.create() might be async depending on the library version, 
    // but usually the client itself is synchronous to instantiate, and connection is async.
    // Based on the snippet, it seems to be a static async method or we need to await it.
    // However, constructors cannot be async. We'll use a static factory or an init method.
    // For now, I'll assume we can instantiate it or use a factory method.
    // Let's follow the snippet provided: "this.client = await CodeModeUtcpClient.create();"
    // This implies we need an async init.
  }

  static async create(): Promise<AgentRuntime> {
    const runtime = new AgentRuntime();
    await runtime.init();
    return runtime;
  }

  private async init() {
    this.client = await CodeModeUtcpClient.create();
    
    // Register your "Native" Manuals (No HTTP overhead!)
    await this.client.registerManual({
      name: 'system',
      call_template_type: 'direct-call', // Uses direct JS execution
      tools: [
        { 
            name: 'exec', 
            handler: terminalTools.execute,
            description: 'Execute a shell command',
            input_schema: {
                type: 'object',
                properties: {
                    command: { type: 'string' },
                    cwd: { type: 'string' }
                },
                required: ['command']
            }
        },
        { 
            name: 'read_file', 
            handler: fsTools.readFile,
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
            handler: fsTools.writeFile,
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
            handler: fsTools.listFiles,
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
      ]
    });
  }

  async runAgentLoop(userGoal: string, llmCallback: (prompt: string) => Promise<string>) {
    // The Prompt for the LLM
    const prompt = `
      GOAL: ${userGoal}
      
      Write a TypeScript script to achieve this. 
      You have access to:
      - system.exec({ command })
      - system.read_file({ path })
      - system.write_file({ path, content })
      - system.list_files({ path })
      - system.browse({ url })
      
      Log all your findings using console.log().
    `;

    // 1. Get Code from LLM (using the provided callback)
    const aiResponse = await llmCallback(prompt); 
    
    // Simple code extraction (regex for ```ts ... ``` or just the whole body if no blocks)
    const codeBlockMatch = aiResponse.match(/```(?:typescript|ts|js|javascript)?\n([\s\S]*?)```/);
    const code = codeBlockMatch ? codeBlockMatch[1] : aiResponse;

    // 2. Execute in Sandbox
    const { result, logs } = await this.client.callToolChain(code);
    
    // 3. Return logs to your UI Terminal
    return { result, logs };
  }
}

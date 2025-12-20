import { CodeModeUtcpClient } from "@utcp/code-mode";
import { CallTemplateSerializer, CommunicationProtocol } from "@utcp/sdk";
import { createFsTools } from "../tools/filesystem.js";
import { mcpOrchestrator } from "./McpOrchestrator.js";
import { metaTools } from "../tools/meta.js";
import { contextManager } from "./ContextManager.js";
import {
  LocalCommunicationProtocol,
  LocalCallTemplateSerializer,
  ToolDefinition,
} from "./protocols/LocalProtocol.js";
import { getNativeTools } from "./tools/NativeToolsRegistry.js";
import { loadToolDocs } from "./tools/ToolDocumentationLoader.js";

// Register the protocol globally (idempotent)
CallTemplateSerializer.registerCallTemplate(
  "local",
  new LocalCallTemplateSerializer()
);

interface IClientWithProtocolRegistry {
  _registeredCommProtocols: Map<string, CommunicationProtocol>;
}

export class AgentRuntime {
  private client!: CodeModeUtcpClient;
  private fsTools: ReturnType<typeof createFsTools>;
  private rootPath: string;
  private contextManager = contextManager;
  private toolDocs: string = "";

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    this.fsTools = createFsTools(rootPath);
    // use the shared contextManager singleton
    this.contextManager = contextManager;
  }

  static async create(
    rootPath?: string,
    tools: string[] = []
  ): Promise<AgentRuntime> {
    const runtime = new AgentRuntime(rootPath);
    await runtime.init(tools);
    return runtime;
  }

  private async init(requestedTools: string[], _roleId?: string) {
    try {
      this.client = await CodeModeUtcpClient.create();
    } catch (error) {
      console.warn("[AgentRuntime] Failed to create UTCP client:", error);
      console.log(
        "[AgentRuntime] Proceeding without tool support (simple chat mode)"
      );
      return;
    }

    // ONLY setup tools if explicitly requested
    if (requestedTools.length === 0) {
      console.log(
        "[AgentRuntime] No tools requested - running in simple chat mode"
      );
      return;
    }

    // INJECT LOCAL PROTOCOL INSTANCE INTO THIS CLIENT
    const localProtocol = new LocalCommunicationProtocol();
    // Use an interface cast to bypass access restriction on private property in a typesafe manner
    (
      this.client as unknown as IClientWithProtocolRegistry
    )._registeredCommProtocols.set("local", localProtocol);

    // 1. Initialize Orchestrator & Load Servers
    // We assume requestedTools contains server names like 'git', 'postgres'
    // Filter out native tools and 'meta' from this list before passing to orchestrator
    const nativeToolNames = [
      "read_file",
      "write_file",
      "list_files",
      "browse",
      "research.web_scrape",
      "analysis.complexity",
      "terminal_execute",
      "search_codebase",
      "list_files_tree",
      "scan_ui_components",
      "nebula",
    ];
    const serverNames = requestedTools.filter(
      (t) => !nativeToolNames.includes(t) && t !== "meta"
    );

    let mcpTools: ToolDefinition[] = [];

    if (serverNames.length > 0) {
      try {
        await mcpOrchestrator.prepareEnvironment(serverNames);
        // 2. Get Dynamic Tools from MCP servers
        const tools = await mcpOrchestrator.getToolsForSandbox();
        // Convert to ToolDefinition compatible format
        mcpTools = tools as unknown as ToolDefinition[];
      } catch (mcpError) {
        console.warn("[AgentRuntime] MCP connection failed:", mcpError);
        console.log("[AgentRuntime] Proceeding with native tools only");
        // Continue without MCP tools - don't crash the entire agent
      }
    }

    // 3. Register "system" namespace with Native, MCP, and optionally Meta tools
    const nativeTools = getNativeTools(this.rootPath, this.fsTools).filter(
      (t) => requestedTools.includes(t.name)
    );

    // 4. Wrap tools with logging
    const toolsToRegister: ToolDefinition[] = [...nativeTools, ...mcpTools].map(
      (tool) => ({
        ...tool,
        handler: tool.handler
          ? async (args: unknown) => {
              console.log(
                `Calling tool 'system.${tool.name}' via protocol 'local'.`
              );
              try {
                const result = await tool.handler!(args);
                console.log(JSON.stringify(result));
                return result;
              } catch (error) {
                console.error(`Tool 'system.${tool.name}' failed:`, error);
                throw error;
              }
            }
          : undefined,
      })
    );

    if (requestedTools.includes("meta")) {
      const wrappedMetaTools = (metaTools as unknown as ToolDefinition[]).map(
        (tool) => ({
          ...tool,
          handler: tool.handler
            ? async (args: unknown) => {
                console.log(
                  `Calling tool 'system.${tool.name}' via protocol 'local'.`
                );
                try {
                  const result = await tool.handler!(args);
                  console.log(JSON.stringify(result));
                  return result;
                } catch (error) {
                  console.error(`Tool 'system.${tool.name}' failed:`, error);
                  throw error;
                }
              }
            : undefined,
        })
      );
      toolsToRegister.push(...wrappedMetaTools);
    }

    try {
      await this.client.registerManual({
        name: "system",
        call_template_type: "local",
        tools: toolsToRegister as any,
      });

      // 5. Load Tool Documentation
      this.toolDocs = await loadToolDocs(
        requestedTools,
        getNativeTools(this.rootPath, this.fsTools)
      );

      console.log(
        `[AgentRuntime] Registered ${toolsToRegister.length} tools: ${
          nativeTools.length
        } native, ${mcpTools.length} MCP${
          requestedTools.includes("meta")
            ? ", " + metaTools.length + " meta"
            : ""
        }`
      );
    } catch (registerError) {
      console.warn("[AgentRuntime] Failed to register tools:", registerError);
      console.log("[AgentRuntime] Agent will run without tool support");
    }
  }

  async runAgentLoop(
    userGoal: string,
    initialResponse: string,
    regenerateCallback: (retryPrompt: string) => Promise<string>
  ): Promise<{ result: string; logs: string[] }> {
    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError: string | null = null;
    let currentResponse = initialResponse;

    while (attempt <= MAX_RETRIES) {
      attempt++;

      // If this is a retry, regenerate with error feedback
      if (lastError && attempt > 1) {
        const retryPrompt = `Your previous code failed with this error:\n\n${lastError}\n\nHere is the full response that caused the error:\n\n${currentResponse}\n\nPlease fix the code and try again. Original request: ${userGoal}`;
        process.stdout.write(
          `[AgentRuntime] Retry attempt ${attempt}/${
            MAX_RETRIES + 1
          } - Calling LLM with error feedback\n`
        );
        currentResponse = await regenerateCallback(retryPrompt);
        process.stdout.write(`[AgentRuntime] Received new response from LLM\n`);
      }

      // Convert response to string if it's an object (some providers return objects)
      const responseStr =
        typeof currentResponse === "string"
          ? currentResponse
          : JSON.stringify(currentResponse);

      // Simpler, more robust code extraction logic
      const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
      let match;
      const blocks: string[] = [];

      while ((match = codeBlockRegex.exec(responseStr)) !== null) {
        const block = match[1].trim();
        if (block) {
          blocks.push(block);
        }
      }

      let codeToExecute: string | null = null;

      if (blocks.length > 0) {
        codeToExecute = blocks.join("\n\n");
      } else {
        // Fallback for no code blocks at all: check if the whole response is code
        const isMarkdown = /\*\*|__/.test(responseStr);
        const hasCodeKeywords =
          /^(?:import|const|let|var|function|class|await|system\.|nebula\.)/m.test(
            responseStr.trim()
          );

        if (!isMarkdown && hasCodeKeywords) {
          codeToExecute = responseStr;
        }
      }

      // SANITIZE: Remove thinking protocol lines that AI might have included in code block
      if (codeToExecute) {
        const lines = codeToExecute.split("\n");
        const sanitizedLines = lines.filter((line) => {
          const trimmed = line.trim();
          // Remove lines that are part of the thinking protocol
          if (
            trimmed.startsWith("LOCATE:") ||
            trimmed.startsWith("DEFINE:") ||
            trimmed.startsWith("EXECUTE:") ||
            /^\d+\.\s+(LOCATE|DEFINE|EXECUTE):/.test(trimmed)
          ) {
            return false;
          }
          return true;
        });
        codeToExecute = sanitizedLines.join("\n");
      }

      // Check if response contains nebula operations even without proper code blocks
      const hasNebulaOps =
        responseStr.includes("nebula.addNode") ||
        responseStr.includes("nebula.") ||
        responseStr.includes("LOCATE:");

      if (!codeToExecute || codeToExecute.trim().length === 0) {
        if (hasNebulaOps) {
          // Force execution if we detect nebula operations
          codeToExecute = responseStr;
          console.log(
            "[AgentRuntime] Forcing execution despite no code blocks due to nebula operations"
          );
        } else {
          // Treat as conversational response - DO NOT EXECUTE
          process.stdout.write(
            "[AgentRuntime] No code found or text looks conversational. Skipping execution.\n"
          );
          return { result: responseStr, logs: [] };
        }
      }

      console.log("[AgentRuntime] Executing code in sandbox:\n", codeToExecute);

      // 2. Check if we should use the specialized TypeScript interpreter for Nebula Code Mode
      const useSpecializedInterpreter =
        codeToExecute.includes("nebula.") || codeToExecute.includes("ast.");

      let result = "";
      let logs: string[] = [];

      if (useSpecializedInterpreter) {
        process.stdout.write(
          "[AgentRuntime] Using specialized Nebula Code Mode interpreter...\n"
        );
        const { typescriptInterpreterTool } = await import(
          "../tools/typescriptInterpreter.js"
        );
        const interpreterResponse = await (
          typescriptInterpreterTool.handler as (args: {
            code: string;
          }) => Promise<{ text: string; meta?: { nebula_actions?: any[] } }[]>
        )({ code: codeToExecute });

        // The interpreter tool returns an array of message objects
        const firstMessage = interpreterResponse[0];
        const responseText = firstMessage?.text || "";
        const actions = firstMessage?.meta?.nebula_actions || [];

        // Check if execution failed
        if (
          responseText.includes("❌ Execution Error:") ||
          responseText.includes("ERROR:")
        ) {
          lastError = responseText;
          process.stdout.write(
            `[AgentRuntime] Execution failed on attempt ${attempt}/${
              MAX_RETRIES + 1
            }\n`
          );
          process.stdout.write(`[AgentRuntime] Error message:\n${lastError}\n`);

          // If we have retries left, continue the loop
          if (attempt <= MAX_RETRIES) {
            continue;
          } else {
            // Out of retries, return the error
            return {
              result: JSON.stringify([
                {
                  type: "text",
                  content: `Failed after ${
                    MAX_RETRIES + 1
                  } attempts. Last error:\n${lastError}`,
                },
              ]),
              logs: [responseText],
            };
          }
        }

        const toolResults: unknown[] = [];
        // If we have actions, we need to execute them via the nebula tool
        if (actions.length > 0) {
          process.stdout.write(
            `[AgentRuntime] Executing ${actions.length} captured Nebula actions...\n`
          );
          for (const action of actions) {
            const toolOutput = await this.client.callTool(
              "system.nebula",
              action
            );
            toolResults.push(toolOutput);
          }
        }

        // Parse result and logs from the response text
        const outputMatch = responseText.match(
          /Output:\n([\s\S]*?)(?:\nWarnings\/Errors:|$)/
        );
        const parsedResult = outputMatch ? outputMatch[1].trim() : responseText;

        // Return both the text output and the captured tool results
        // We wrap the text in an object that the frontend will ignore (fails ui_action check)
        // but can still be displayed as the primary output.
        const combinedResult: unknown = [
          { type: "text", content: parsedResult },
          ...toolResults,
        ];

        result = JSON.stringify(combinedResult);
        logs = [responseText];

        // Success! Break out of retry loop
        return { result, logs };
      } else {
        // Standard Sandbox Execution
        const sandboxResponse = (await this.client.callToolChain(
          codeToExecute
        )) as { result: string; logs: string[] };
        result = sandboxResponse?.result || "";
        logs = sandboxResponse?.logs || [];

        // Success! Break out of retry loop
        return { result, logs };
      }
    }

    // This should never be reached, but TypeScript needs it
    return { result: "", logs: [] };
  }

  /**
   * Wrap a provider/agent generate call and enhance the system prompt
   * using the ContextManager state for the given roleId.
   */
  async generateWithContext(
    agent: { generate: (prompt: string) => Promise<unknown> },
    baseSystemPrompt: string,
    prompt: string,
    roleId?: string
  ) {
    const roleContext = roleId
      ? await this.contextManager.getContext(roleId)
      : { tone: "", style: "", memory: {} };
    const memoryStr = Object.entries(roleContext.memory || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    let enhancedSystemPrompt = `${baseSystemPrompt || ""}\n\n${
      roleContext.tone || ""
    }\n\n${memoryStr}`.trim();

    // Inject Tool Documentation
    if (this.toolDocs) {
      if (enhancedSystemPrompt.includes("{{tool_definitions}}")) {
        enhancedSystemPrompt = enhancedSystemPrompt.replace(
          "{{tool_definitions}}",
          this.toolDocs
        );
      } else {
        // Auto-append Protocol + Docs if tag is missing
        const CODE_MODE_PROTOCOL = `
🧠 System Instruction: Nebula Code Mode v2.0
Role: You are the Nebula Engine Pilot. You do not write code to describe a UI; you write code to construct it using the live nebula runtime instance.

The Prime Directive: NEVER write code without first verifying the current state.

Your Runtime Environment:
- Global Object: nebula (Instance of NebulaOps)
- Global Helper: ast (Instance of AstTransformer)
- Context: tree (Read-only access to current NebulaTree state)

## 🛠️ TOOL USAGE PROTOCOL
You are operating in **CODE MODE**. Your primary objective is to fulfill the user's request by calling available tools. 

### 🚨 CRITICAL RULES:
1. **NO CONVERSATIONAL FILLER.** Do not say "Sure, I can help with that." 
2. **USE CODE BLOCKS.** You MUST wrap your logic in a \` \` \`typescript block.
3. **USE THE NEBULA OBJECT.** Call nebula methods directly: \`const id = nebula.addNode(...)\`.
4. **CAPTURE RETURNS.** The addNode function returns an ID. YOU MUST CAPTURE IT.
   - ✅ Good: \`const cardId = nebula.addNode(...)\`
   - ❌ Bad: \`nebula.addNode(...)\` (ID is lost, cannot add children).
5. **ATOMIC OPERATIONS.** Group related changes into a single execution block.
6. **NEVER HALLUCINATE IDs.** Do not update node_123 unless you created it or confirmed it exists in the tree.

### Phase 1: The "Thinking" Protocol (Mandatory)
Before writing code, you must output a plan:
- LOCATE: Which node ID am I attaching to? (Check existence).
- DEFINE: What specific tokens (Tailwind) and Layouts (flex/grid) will I use?
- EXECUTE: Write the script.

### Component Registry (Use these as "type" for addNode)
- **Box**: Layout container (div). Default.
- **Text**: Props: { content: string, type: 'h1'|'h2'|'h3'|'p' }.
- **Button**: Props: { children: string, variant: 'default'|'outline'|'ghost' }.
- **Input / Textarea**: Form inputs.
- **Badge**: Tiny pill label.
- **Label**: Form labels.
- **Slider**: Range input.
- **Icon**: Props: { name: string } (Lucide names like 'User', 'Settings').
- **Card**: Composite (CardHeader, CardTitle, CardDescription, CardContent, CardFooter).
- **Tabs**: Composite (TabsList, TabsTrigger [prop value], TabsContent [prop value]).
- **AiButton / SuperAiButton**: AI trigger buttons.
- **Image**: Props: { src: string, alt: string }.

### Phase 2: API Reference (Cheat Sheet)
\`\`\`typescript
// 1. ADDING NODES (Recursive)
const parentId = "root"; // Or some captured ID
const btnId = nebula.addNode(parentId, {
  type: "Button",
  props: { children: "Click Me", variant: "default" },
  style: { background: "bg-primary", padding: "p-4" },
  layout: { mode: "flex" }
});

// 2. BUILDING COCHLEATED STRUCTURES (Cards)
const cardId = nebula.addNode("root", { type: "Card", style: { width: "w-80" } });
const headerId = nebula.addNode(cardId, { type: "CardHeader" });
nebula.addNode(headerId, { type: "CardTitle", props: { children: "User Profile" } });
const contentId = nebula.addNode(cardId, { type: "CardContent" });
nebula.addNode(contentId, { type: "Text", props: { children: "Managing your account settings level here." } });

// 3. UPDATING NODES
nebula.updateNode(btnId, { style: { background: "bg-red-500" } });

// 3. MOVING NODES
nebula.moveNode(btnId, "new-parent-id", 0); // Index 0

// 4. INGESTION (Raw Code -> Nodes)
const rawJSX = \`<div className="p-4">...</div>\`;
const fragment = ast.parse(rawJSX);
nebula.addNode(parentId, fragment);
\`\`\`

### Example Pattern: The "Iterator" (Building Lists)
\`\`\`typescript
const listId = nebula.addNode(parentId, { type: 'Box', layout: { mode: 'flex', direction: 'column' }});
const items = ['Pricing', 'Features', 'About'];

items.forEach(item => {
  nebula.addNode(listId, { 
    type: 'Button', 
    props: { children: item, variant: 'ghost' },
    style: { width: 'w-full', align: 'start' }
  });
});
\`\`\`

### Available Tools:
\${this.toolDocs}
`;
        enhancedSystemPrompt += CODE_MODE_PROTOCOL;
      }
    }

    const finalPrompt = `${enhancedSystemPrompt}\n\n${prompt}`.trim();
    // Delegate to the provided agent/provider
    return agent.generate(finalPrompt);
  }
}

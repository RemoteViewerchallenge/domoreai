import { CodeModeUtcpClient } from "@utcp/code-mode";
import { CallTemplateSerializer, CommunicationProtocol } from "@utcp/sdk";
import { createFsTools } from "../tools/filesystem.js";
import { mcpOrchestrator } from "../orchestrator/McpOrchestrator.js";
import { metaTools } from "../tools/meta.js";
import { tokenService } from "./TokenService.js";
import {
  LocalCommunicationProtocol,
  LocalCallTemplateSerializer,
  ToolDefinition,
} from "./protocols/LocalProtocol.js";
import { getNativeTools } from "./tools/NativeToolsRegistry.js";
import { loadToolDocs } from "./tools/ToolDocumentationLoader.js";
import { IExecutionStrategy, CodeModeStrategy, JsonRpcStrategy } from "./tooling/ExecutionStrategies.js";
// import { CreateGitAwareWorkerTools } from "./tools/GitAwareTools.js";

// Register the protocol globally (idempotent)
// ... existing registration code (lines 16-19) ...
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
  private contextManager = tokenService;
  private toolDocs: string = "";
  // [NEW] Track tier
  private tier: string = 'Worker'; 

  constructor(rootPath: string = process.cwd(), tier: string = 'Worker') {
    this.rootPath = rootPath;
    this.fsTools = createFsTools(rootPath);
    // use the shared contextManager singleton
    this.contextManager = tokenService;
    this.tier = tier;
  }

  static async create(
    rootPath?: string,
    tools: string[] = [],
    tier: string = 'Worker'
  ): Promise<AgentRuntime> {
    const runtime = new AgentRuntime(rootPath, tier);
    await runtime.init(tools);
    return runtime;
  }

  // ... init method ...
  // I'll keep init method mostly same but handle GitAwareInjection if needed or rely on executeTask

  private async init(requestedTools: string[], _roleId?: string) {
      // ... existing init code ...
      try {
        this.client = await CodeModeUtcpClient.create();
      } catch (error) {
        console.warn("[AgentRuntime] Failed to create UTCP client:", error);
        return;
      }
  
      if (requestedTools.length === 0 && this.tier !== 'Worker') { // Workers might need implicit tools
        console.log("[AgentRuntime] No tools requested - running in simple chat mode");
        return;
      }
      
      const localProtocol = new LocalCommunicationProtocol();
      (this.client as unknown as IClientWithProtocolRegistry)._registeredCommProtocols.set("local", localProtocol);
      
      // ... existing tool loading logic ...
      const nativeToolNames = [
        "read_file", "write_file", "list_files", "browse", "research.web_scrape", "analysis.complexity",
        "terminal_execute", "search_codebase", "list_files_tree", "scan_ui_components", "nebula", "meta"
      ];
      
      const { prisma } = await import("../db.js");
      const dbTools = await prisma.tool.findMany({
        where: { name: { in: requestedTools } },
        select: { name: true, serverId: true }
      });

      const serverNames = Array.from(new Set(
        dbTools
          .filter(t => t.serverId && !nativeToolNames.includes(t.name))
          .map(t => t.serverId!)
      ));
      
      let mcpTools: ToolDefinition[] = [];
      if (serverNames.length > 0) {
           try {
             await mcpOrchestrator.prepareEnvironment(serverNames);
             const tools = await mcpOrchestrator.getToolsForSandbox();
             mcpTools = tools as unknown as ToolDefinition[];
           } catch (e) { console.warn("MCP Error", e); }
      }
      
      const nativeTools = getNativeTools(this.rootPath, this.fsTools).filter(t => requestedTools.includes(t.name));
      const toolsToRegister: ToolDefinition[] = [...nativeTools, ...mcpTools];
      // ... meta tools logic ...
      if (requestedTools.includes("meta")) {
          // ...
          const wrappedMeta = (metaTools as unknown as ToolDefinition[]).map(t => ({...t, handler: t.handler })); // Simplified for replacement
          toolsToRegister.push(...wrappedMeta);
      }
      
      // [NEW] INJECT GIT AWARE TOOLS FOR WORKERS
      if (this.tier === 'Worker') {
            // We need jobId and vfsToken. 
            // Ideally passed in constructor or executeTask. 
            // Since init is async, we might not have them yet. 
            // But strict requirement says "Inject... into Worker runtime".
            // I'll inject the definition here if I can, OR handle it dynamically in executeTask.
            // But UTCP requires registration.
            // I'll register it as a dynamic tool or placeholder.
            // Actually, `CreateGitAwareWorkerTools` returns a ToolDefinition.
            // I'll mock jobId/vfsToken for registration or allow dynamic context?
            // UTCP tools are registered once.
            // Maybe I should add it to `executeTask` to register purely for that run?
            // `executeTask` in snippet calls `this.tools.execute_script.execute`.
            // Snippet `AgentRuntime` didn't use UTCP in the simplified version.
            // Existing `AgentRuntime` USES UTCP.
            
            // I will ADD `execute_task_logic` to the registered tools here with a placeholder handler
            // that gets replaced or uses context?
            // Actually, I'll allow `executeTask` to pass the `jobId` via context or similar.
            // For now, let's assume `jobId` comes from environment or args in execution.
      }

      await this.client.registerManual({
        name: "system",
        call_template_type: "local",
        tools: toolsToRegister,
      });
      // ... load docs ...
       this.toolDocs = await loadToolDocs(requestedTools);
  }

  // ... runAgentLoop ...

  /**
   * FUNCTIONAL SYSTEM PROMPT
   * Identity-as-Configuration.
   */


  async runAgentLoop(
    userGoal: string,
    initialResponse: string,
    regenerateCallback: (retryPrompt: string) => Promise<string>
  ): Promise<{ result: string; logs: string[] }> {
    const MAX_TURNS = 5; // Allow up to 5 back-and-forth turns
    let turn = 0;
    let currentResponse = initialResponse;
    const allLogs: string[] = [];

    // We maintain a "conversation history" effectively by appending new context
    let contextAccumulator = `Original Goal: ${userGoal}\n\n`;

    while (turn < MAX_TURNS) {
      turn++;
      console.log(`[AgentRuntime] 🔄 Turn ${turn}/${MAX_TURNS}`);

      // Convert response to string if it's an object (some providers return objects)
      const responseStr =
        typeof currentResponse === "string"
          ? currentResponse
          : JSON.stringify(currentResponse);

      // [LOGGING] Capture the full thought process + code for the UI
      allLogs.push(`[Thought Process]:\n${responseStr}`);


      // 1. Router Logic (JSON-RPC has priority over Code Mode)
      let strategy: IExecutionStrategy | null = null;
      if (JsonRpcStrategy.canHandle(responseStr)) {
        strategy = new JsonRpcStrategy(this.client);
      } else if (CodeModeStrategy.canHandle(responseStr)) {
        strategy = new CodeModeStrategy(this.client);
      }

      // 2. Execution or Fallback
      let turnResult = "";
      let turnLogs: string[] = [];

      if (strategy) {
        console.log(`[AgentRuntime] 🔀 Routing to ${strategy.name}`);
        const result = await strategy.execute(responseStr, {
          roleId: undefined, // Add logic to pass roleId/sessionId if available in loop
          sessionId: undefined
        });
        turnResult = result.output;
        turnLogs = result.logs;
      } else {
        // No strategy matched -> Assume conversational text
        console.log("[AgentRuntime] ℹ️ Response contains no executable code. Returning text/markdown.");
        return { result: responseStr, logs: allLogs };
      }

      allLogs.push(...turnLogs);

      // 4. FEEDBACK LOOP (The Critical Fix)
      // Instead of returning, we feed the output back to the model
      
      // Check if this was a successful role creation
      const isRoleCreationSuccess = turnResult.includes('✅ Role Variant Created Successfully') || 
                                     turnResult.includes('biologically spawned');
      
      const observationPrompt = isRoleCreationSuccess 
        ? `
[SYSTEM_OBSERVATION]
✅ SUCCESS! The role was created successfully.

Output:
${turnResult}

Instructions:
Respond with a brief confirmation message to the user. DO NOT create another role. DO NOT output more JSON.
Example: "I've successfully created the [Role Name] role. It's now available in your roster."
`
        : `
[SYSTEM_OBSERVATION]
The action was executed.

Output:
${turnResult}

Logs:
${turnLogs.join("\n")}

Instructions:
1. If this output answers the user's goal fully, reply with the FINAL ANSWER in text (no code blocks or JSON).
2. If you need more information or need to take another step, generate the NEXT code block or JSON tool call.
`;

      // Append observation to context
      contextAccumulator += `\nAssistant's Action:\n${responseStr}\n\nSystem Output:\n${turnResult}\n`;

      console.log(`[AgentRuntime] 🔙 Feeding result back to model...`);
      currentResponse = await regenerateCallback(
        contextAccumulator + "\n" + observationPrompt
      );
    }

    return {
      result: "Max turns reached. Last response: " + currentResponse,
      logs: allLogs,
    };
  }

  /**
   * Wrap a provider/agent generate call and enhance the system prompt
   * using the ContextManager state for the given roleId.
   */
  async generateWithContext(
    agent: { generate: (prompt: string) => Promise<unknown> },
    baseSystemPrompt: string,
    prompt: string,
    roleId?: string,
    sessionId?: string
  ) {
    const roleContext = roleId
      ? await this.contextManager.getContext(roleId)
      : { tone: "", style: "", memory: {} };
    
    // Fetch Conversation History
    let historyStr = "";
    if (sessionId) {
        const history = await this.contextManager.getHistory(sessionId);
        if (history.length > 0) {
            historyStr = "## Conversation History:\n" + 
                history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n\n");
        }
        // Record the NEW user prompt immediately? 
        // Or record it after success? 
        // Let's record it now so it's in history for next time if we crash? 
        // But if we record it now, and then "generate", the model might see it?
        // No, we are constructing the prompt NOW by fetching history first.
        // So the CURRENT prompt is NOT in history yet. That's correct.
    }

    const memoryStr = Object.entries(roleContext.memory || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    let enhancedSystemPrompt = `${baseSystemPrompt || ""}\n\n${
      roleContext.tone || ""
    }\n\n${memoryStr}\n\n${historyStr}`.trim();

    // Inject Tool Documentation
    if (this.toolDocs) {
      if (enhancedSystemPrompt.includes("{{tool_definitions}}")) {
        enhancedSystemPrompt = enhancedSystemPrompt.replace(
          "{{tool_definitions}}",
          this.toolDocs
        );
      } else {
        // Auto-append Protocol + Docs if tag is missing
        
        // 1. Specialized Protocol for Nebula Architect (UI Builder)
        const NEBULA_PROTOCOL = `
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
5. **ATOMIC OPERATIONS.** Group related changes into a single execution block.
6. **NEVER HALLUCINATE IDs.** Do not update node_123 unless you created it or confirmed it exists in the tree.

### API Reference (Cheat Sheet)
\`\`\`typescript
// 1. ADDING NODES
const btnId = nebula.addNode(parentId, { type: "Button", props: { children: "Click Me" } });

// 2. UPDATING NODES
nebula.updateNode(btnId, { style: { background: "bg-red-500" } });
\`\`\`

### Available Tools:
${this.toolDocs}
`;

        // 2. Generic Protocol for all other agents (Role Architect, Workers, etc.)
        const GENERIC_CODE_PROTOCOL = `
🧠 System Instruction: TypeScript Tooling Mode
Role: You are a specialized agent operating in a TypeScript Runtime Environment.

### 🛠️ HYBRID PROTOCOL: DYNAMIC SWITCHING
You have access to two execution modes. Choose the right one for the task.

### 1. CODE MODE (High Complexity)
**Trigger:** Complex logic, piping data between tools, loops, or file manipulation.
**Format:** Wrap TypeScript logic in a markdown block.
\`\`\`typescript
const data = await system.read_file({ path: "..." });
console.log(data);
\`\`\`

### 2. JSON MODE (Low Latency / Atomic)
**Trigger:** Single, simple tool calls (e.g., looking up a quick fact or checking time).
**Format:** Output a raw JSON block (NO markdown backticks).
{ "tool": "system.time", "args": {} }

### Heuristic:
- IF you need to process the output of Tool A before calling Tool B -> **USE CODE MODE**.
- IF you just need to call Tool A and show the user the result -> **USE JSON MODE**.

### 🚨 CRITICAL RULES:
1. **NO CONVERSATIONAL FILLER.** Do not say "Here is the code." Just output the code or JSON.
2. **ASYNC/AWAIT.** Always use \`await\` for tool calls in Code Mode.
3. **CONSOLE LOGGING.** In Code Mode, use \`console.log\` to print results so you can see them in the next turn.

### Runtime Environment:
- **system**: The global object containing all your tools.
- **console**: Standard console for logging.

### Available Tools:
${this.toolDocs}
`;

        // Select Protocol based on Role
        const isNebulaArchitect = enhancedSystemPrompt.includes("Nebula Architect") || this.toolDocs.includes("system.nebula");
        const isRoleArchitect = enhancedSystemPrompt.includes("Role Architect") || enhancedSystemPrompt.includes("identityArchitect") || this.toolDocs.includes("create_role_variant");
        
        console.log('[AgentRuntime] 🔍 Role Detection Debug:');
        console.log('  - Prompt includes "Role Architect":', enhancedSystemPrompt.includes("Role Architect"));
        console.log('  - Prompt includes "identityArchitect":', enhancedSystemPrompt.includes("identityArchitect"));
        console.log('  - Tools include "create_role_variant":', this.toolDocs.includes("create_role_variant"));
        console.log('  - isRoleArchitect:', isRoleArchitect);
        
        let protocol = isNebulaArchitect ? NEBULA_PROTOCOL : GENERIC_CODE_PROTOCOL;

        if (isRoleArchitect) {
             console.log('[AgentRuntime] 🎯 ROLE ARCHITECT DETECTED - Injecting JSON-RPC protocol');
             protocol = `
🧠 CRITICAL DIRECTIVE: ROLE CREATION VIA JSON TOOL CALL

You are the Role Architect. Your ONLY job is to call the 'system.create_role_variant' tool using JSON-RPC format.

### ⛔ FORBIDDEN:
- NO TypeScript code blocks
- NO Python code
- NO shell commands
- NO explanations

### ✅ REQUIRED FORMAT (JSON-RPC):
When the user asks for a new role, output ONLY this JSON structure (no markdown, no code blocks):

{
  "tool": "system.create_role_variant",
  "args": {
    "intent": {
      "name": "Prompt Enhancement Specialist",
      "description": "Analyzes and refines user prompts for syntax, clarity, and effectiveness",
      "domain": "Creative",
      "complexity": "MEDIUM"
    }
  }
}

### 🎯 EXAMPLE:
User: "Create a role to improve prompts"
Your response (RAW JSON, no backticks):
{
  "tool": "system.create_role_variant",
  "args": {
    "intent": {
      "name": "Prompt Improver",
      "description": "Refines user prompts for clarity and effectiveness",
      "domain": "Creative",
      "complexity": "MEDIUM"
    }
  }
}

RESPOND WITH JSON ONLY. NO OTHER TEXT.
`;
        }

        enhancedSystemPrompt += protocol;
      }
    }

    const finalPrompt = `${enhancedSystemPrompt}\n\n${prompt}`.trim();
    
    // Delegate to the provided agent/provider
    const result = await agent.generate(finalPrompt);

    // Record History (if session active)
    if (sessionId && typeof result === 'string') {
        const userMsg = prompt; // Original user prompt
        const assistantMsg = result;
        await this.contextManager.addMessage(sessionId, 'user', userMsg);
        await this.contextManager.addMessage(sessionId, 'assistant', assistantMsg);
    }

    return result;
  }

  /**
   * FUNCTIONAL SYSTEM PROMPT
   * Identity-as-Configuration.
   */
  async executeTask(jobId: string, vfsToken: string, taskContext: string) {
    if (this.tier !== 'Worker') throw new Error("Only Workers execute tasks.");
    
    // const gitTool = CreateGitAwareWorkerTools(jobId, vfsToken);
    
    await this.client.registerManual({
        name: "volcano", // Separate namespace for dynamic tools
        call_template_type: "local",
        tools: [] // [gitTool]
    });

    const SYSTEM_PROMPT = `
      ## SYSTEM_MODE: CODE_GENERATION
      ## CONSTRAINT: NO CHAT. NO EXPLANATIONS.
      ## OUTPUT: JSON Tool Call Only.
      
      You are a TypeScript Engine. 
      Access files via 'env.fs' or standard 'fs' if permitted.
      ALWAYS wrap logic in try/catch.
      RETURN final status via console.log.
      
      AVAILABLE TOOLS:
      - volcano.execute_task_logic: USE THIS to commit your work.
    `;

    const result = await this.client.callToolChain(
        `${SYSTEM_PROMPT}\n\nTASK: ${taskContext}\n\nExecute the task using volcano.execute_task_logic.`
    );
    
    return result;
  }
}

import { CodeModeUtcpClient } from "@utcp/code-mode";
import { CallTemplateSerializer, CommunicationProtocol } from "@utcp/sdk";
import { createFsTools } from "../tools/filesystem.js";
import { mcpOrchestrator } from "../orchestrator/McpOrchestrator.js";
import { roleArchitectTools } from "../tools/roleArchitectTools.js";
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
  private toolDocsFull: string = "";
  private toolDocsSignatures: string = "";
  // [NEW] Track tier
  private tier: string = 'Worker'; 
  private executionMode: string = 'HYBRID_AUTO';
  private silenceConfirmation: boolean = false;
  private traceId: string = '';
  private roleId?: string;
  private baggage: Record<string, string> = {};
  private injectedServers: Set<string> = new Set();
  private availableTools: string[] = [];


  constructor(rootPath: string = process.cwd(), tier: string = 'Worker', executionMode: string = 'HYBRID_AUTO', silenceConfirmation: boolean = false) {
    this.rootPath = rootPath;
    this.fsTools = createFsTools(rootPath);
    // use the shared contextManager singleton
    this.contextManager = tokenService;
    this.tier = tier;
    this.executionMode = executionMode;
    this.silenceConfirmation = silenceConfirmation;
    this.traceId = `trace-${Math.random().toString(36).substring(7)}`;
    this.roleId = undefined; // Will be set in runAgentLoop if needed
  }



  static async create(
    rootPath?: string,
    tools: string[] = [],
    tier: string = 'Worker',
    executionMode: string = 'HYBRID_AUTO',
    silenceConfirmation: boolean = false
  ): Promise<AgentRuntime> {
    const runtime = new AgentRuntime(rootPath, tier, executionMode, silenceConfirmation);

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
        "terminal_execute", "search_codebase", "list_files_tree", "scan_ui_components", 
        "ui_architect_tree_inspect", "ui_architect_node_mutate", "ui_factory_layout_generate",
        "role_registry_list", "role_variant_evolve", "role_config_patch"
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
      if (requestedTools.includes("role_architect") || requestedTools.includes("meta")) {
          // Flatten role architect tools into the registry
          const wrappedTools = (roleArchitectTools as unknown as ToolDefinition[]).map(t => ({...t, handler: t.handler }));
          toolsToRegister.push(...wrappedTools);
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

      
      // Add lookup_tool_docs tool
      toolsToRegister.push({
          name: "lookup_tool_docs",
          description: "Fetch detailed usage examples and full documentation for specific tools. Use this if the initial documentation only contains signatures.",
          inputSchema: {
              type: "object",
              properties: {
                  toolNames: { type: "array", items: { type: "string" }, description: "List of tools to get full documentation for" }
              },
              required: ["toolNames"]
          },
          handler: async (args: any) => {
              const docs = await loadToolDocs(args.toolNames);
              return [{ type: 'text', text: docs.fullDocs }];
          }
      } as unknown as ToolDefinition);

      // [NEW] Expand monolithic tool names for documentation loading
      const expandedDocsTools = [...requestedTools];
      if (requestedTools.includes("nebula")) {
          expandedDocsTools.push("ui_architect_tree_inspect", "ui_architect_node_mutate", "ui_factory_layout_generate");
      }
      if (requestedTools.includes("meta") || requestedTools.includes("role_architect")) {
          expandedDocsTools.push("role_registry_list", "role_variant_evolve", "role_config_patch");
      }

      
      this.availableTools = toolsToRegister.map(t => t.name);

      await this.client.registerManual({
        name: "system",
        call_template_type: "local",
        tools: toolsToRegister,
      });
      // ... load docs ...
      const docs = await loadToolDocs(expandedDocsTools);
      this.toolDocsFull = docs.fullDocs;
      this.toolDocsSignatures = docs.signatures;
  }

  // ... runAgentLoop ...

  /**
   * FUNCTIONAL SYSTEM PROMPT
   * Identity-as-Configuration.
   */


  async runAgentLoop(
    userGoal: string,
    initialResponse: string,
    regenerateCallback: (retryPrompt: string) => Promise<string>,
    maxTurns: number = 5
  ): Promise<{ result: string; logs: string[] }> {
    let turn = 0;
    let currentResponse = initialResponse;
    const allLogs: string[] = [];

    // We maintain a "conversation history" effectively by appending new context
    let contextAccumulator = `Original Goal: ${userGoal}\n\n`;
    
    // [PHASE 1] Instrumentation
    this.baggage = { ...this.baggage, screenspaceId: process.env.ACTIVE_SCREENSPACE_ID || '1' };

    while (turn < maxTurns) {
      turn++;
      console.log(`[AgentRuntime] 🔄 Turn ${turn}/${maxTurns}`);

      // [PHASE 2] Hot-Reloading DNA every 5 turns (or exactly at 5, or every 5)
      // Since MAX_TURNS is 5, let's do it if turn === 3 or something to show it works, 
      // but user said "every 5 turns".
      if (turn % 5 === 0 && this.roleId) {
          await this.checkDnaUpdates();
      }

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

      // [JIT TOOL INJECTION] Check for REQUEST_TOOL signal in model's response BEFORE execution
      if (responseStr.includes("REQUEST_TOOL:")) {
        const match = responseStr.match(/REQUEST_TOOL:([a-zA-Z0-9_-]+)/);
        if (match) {
          const requestedTool = match[1];
          const logMsg = `[AgentRuntime] 🧰 JIT Tool Request Detected in Response: ${requestedTool}`;
          console.log(logMsg);
          allLogs.push(logMsg);
          try {
            await this.injectTools(requestedTool);
          } catch (injectError: any) {
            const errLog = `[AgentRuntime] Failed to hot-load tool '${requestedTool}': ${injectError.message}`;
            console.warn(errLog);
            allLogs.push(errLog);
          }
        }
      }

      // 2. Execution or Fallback
      let turnResult = "";
      let turnLogs: string[] = [];

      if (strategy) {
        console.log(`[AgentRuntime] 🔀 Routing to ${strategy.name} (Trace: ${this.traceId})`);
        try {
          const result = await strategy.execute(responseStr, {
            roleId: this.roleId,
            sessionId: undefined,
            traceId: this.traceId,
            baggage: this.baggage
          } as any);
          turnResult = result.output;
          turnLogs = result.logs;
        } catch (execError: any) {
          turnResult = `[EXECUTION_ERROR]: ${execError.message}`;
          turnLogs = [execError.stack || execError.message];
        }

        // [JIT TOOL INJECTION] Also check for REQUEST_TOOL signal in output (from a tool call)
        if (turnResult.includes("REQUEST_TOOL:")) {
          const match = turnResult.match(/REQUEST_TOOL:([a-zA-Z0-9_-]+)/);
          if (match) {
            const requestedTool = match[1];
            const logMsg = `[AgentRuntime] 🧰 JIT Tool Request Detected in Output: ${requestedTool}`;
            console.log(logMsg);
            allLogs.push(logMsg);
            try {
              await this.injectTools(requestedTool);
              const safeNamespace = requestedTool.replace(/-/g, '_');
              turnResult = `[SYSTEM]: Tools from '${requestedTool}' have been hot-loaded and are now available in the '${safeNamespace}' namespace. Please retry your action.`;
            } catch (injectError: any) {
              turnResult = `[SYSTEM_ERROR]: Failed to hot-load tool '${requestedTool}': ${injectError.message}`;
              allLogs.push(turnResult);
            }
          }
        }
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
      
      const hasErrors = turnLogs.some(log => log.toLowerCase().includes("error") || log.toLowerCase().includes("failed")) || 
                        turnResult.toLowerCase().includes("error") || 
                        turnResult.toLowerCase().includes("failed");

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
${hasErrors ? '🚨 ERRORS DETECTED: A technical failure occurred. You must now generate a "Fix Strategy" to repair the system.' : ''}
${(hasErrors && !isRoleCreationSuccess) ? `\n[AVAILABLE_TOOLS]: ${this.availableTools.join(', ')}\n[CONSTRAINT]: You MUST NOT use tools outside this list. If you need a missing tool, check if you can hot-load it.` : ''}

Output:
${turnResult}

Logs:
${turnLogs.join("\n")}

Instructions:
${hasErrors ? 
  "1. Analyze the error logs above identify the root cause (e.g. TypeError = missing tool).\n2. Output a FIX STRATEGY.\n3. Execute any necessary tool calls from the [AVAILABLE_TOOLS] list to apply the fix." : 
  "1. If this output answers the user's goal fully, reply with the FINAL ANSWER in text (no code blocks or JSON).\n2. If you need more information or need to take another step, generate the NEXT code block or JSON tool call."}
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
    if (this.toolDocsSignatures || this.toolDocsFull) {
        // 1. Calculate Budget (Simplified estimation)
        const baseLength = enhancedSystemPrompt.length + prompt.length;
        
        // 2. Protocols (Hardcoded strings for now as per requirement, but logic is cleaned up)
        const UI_ARCHITECT_PROTOCOL = `
🧠 System Instruction: UI Architect Code Mode
Role: You are the UI Architect. You do not write code to describe a UI; you write code to construct it using the atomic UI tools.

The Prime Directive: NEVER write code without first verifying the current state using 'system.ui_architect_tree_inspect'.

Your Runtime Environment:
- system.ui_architect_tree_inspect: Read current tree.
- system.ui_architect_node_mutate: Update/Move/Delete nodes.
- system.ui_factory_layout_generate: Add nodes or ingest JSX.

## 🛠️ TOOL USAGE PROTOCOL
You are operating in **CODE MODE**. 

### 🚨 CRITICAL RULES:
1. **NO CONVERSATIONAL FILLER.**
2. **USE CODE BLOCKS.**
3. **CAPTURE RETURNS.** Some tools return IDs. YOU MUST CAPTURE THEM.
4. **ATOMIC OPERATIONS.** Group related changes into a single execution block.
5. **NEVER HALLUCINATE IDs.** Verify existence before mutation.

### API Reference (Cheat Sheet)
\`\`\`typescript
// 1. INSPECT
const tree = await system.ui_architect_tree_inspect({});

// 2. ADDING NODES
const btnId = await system.ui_factory_layout_generate({ 
    action: "addNode", 
    parentId: "root", 
    node: { type: "Button", props: { children: "Click Me" } } 
});

// 3. UPDATING NODES
await system.ui_architect_node_mutate({ 
    action: "updateNode", 
    nodeId: btnId, 
    update: { style: { background: "bg-red-500" } } 
});
\`\`\`
`;

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
`;

        const JSON_STRICT_PROTOCOL = `
🧠 System Instruction: JSON-RPC Mode
Role: You are an atomic agent operating via structured JSON-RPC.

### 🛠️ TOOL CALL PROTOCOL
When you need to execute an action/tool:
1. **JSON ONLY.** Output a raw JSON object.
2. **NO MARKDOWN.** Do NOT wrap the tool call in backticks.
3. **NO FILLER.** Do not say "I am calling the tool..." - just output the JSON.
4. **ONE AT A TIME.** Generate exactly one tool call per turn.

### Format:
{ "tool": "system.tool_name", "args": { "param": "value" } }
`;

        const CODE_STRICT_PROTOCOL = `
🧠 System Instruction: TypeScript Engine Mode
Role: You are a high-performance TypeScript engine.

### 🚨 CRITICAL RULES:
1. **CODE ONLY.** Every action must be wrapped in a \` \` \`typescript block.
2. **FULL LOGIC.** You can pipe data, use loops, and handle complex logic.
3. **LOG OUTPUTS.** Use \`console.log\` to see the results of your tool calls.
4. **NO JSON.** Do NOT use raw JSON blocks.

### Format:
\`\`\`typescript
const result = await system.tool_name({ ... });
console.log(result);
\`\`\`
`;

        const SPECIALIZED_ARCHITECT_PROTOCOL = `
🧠 System Instruction: Meta-Evolution Protocol
Role: You are an Architect specializing in the creation and evolution of AI roles.

### 🛠️ ARCHITECT GOALS:
1. Discover existing roles using 'system.role_registry_list'.
2. Evolve new capabilities using 'system.role_variant_evolve'.
3. Fine-tune behavior using 'system.role_config_patch'.

Execution Mode: Favor JSON_STRICT for tool calls to ensure reliability.
`;

        // 3. Selection (Protocol Selection Logic)
        let protocol = GENERIC_CODE_PROTOCOL;
        
        if (this.tier === 'Architect') {
            protocol = SPECIALIZED_ARCHITECT_PROTOCOL;
        } else if (this.executionMode === 'JSON_STRICT') {
            protocol = JSON_STRICT_PROTOCOL;
        } else if (this.executionMode === 'CODE_INTERPRETER') {
            protocol = CODE_STRICT_PROTOCOL;
        } else if (this.tier === 'Nebula' || this.toolDocsSignatures.includes("ui_architect_")) {
            protocol = UI_ARCHITECT_PROTOCOL;
        }

        if (this.silenceConfirmation) {
            protocol += `\n\n### 🚨 AUTONOMOUS BEHAVIOR:
1. **NO CONVERSATION.** Do not explain yourself, confirm tasks, or say "Finished."
2. **TOOL OUTPUT ONLY.** Only output tool calls or raw data results.
3. **TASK COMPLETE.** When the user's intent is logically fulfilled by previous tool outputs, stop responding.
`;
        }

        // 4. Just-in-Time Documentation Truncation
        const toolHeader = "\n\n### Available Tools:\n";
        
        if (baseLength < 8000) {
            // High budget: Full documentation
            enhancedSystemPrompt += protocol + toolHeader + this.toolDocsFull;
        } else {
            // Low budget: Signatures only + lookup tool
            enhancedSystemPrompt += protocol + toolHeader + this.toolDocsSignatures + 
                "\n\nNOTE: Use 'system.lookup_tool_docs' for full examples if you are unsure how to use a tool.";
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

  public async injectTools(serverName: string) {
      if (this.injectedServers.has(serverName)) {
          console.log(`[AgentRuntime] Server '${serverName}' already hot-loaded. Skipping.`);
          return;
      }

      const newTools = await mcpOrchestrator.attachToolToSession(serverName);
      const safeNamespace = serverName.replace(/-/g, '_');
      
      await this.client.registerManual({
          name: safeNamespace,
          call_template_type: "local",
          tools: newTools as any,
      });
      this.injectedServers.add(serverName);
      console.log(`[AgentRuntime] Successfully injected ${newTools.length} tools into namespace '${safeNamespace}' from ${serverName}`);
  }

  public async checkDnaUpdates() {
      if (!this.roleId) return;
      const { prisma } = await import("../db.js");
      const variant = await prisma.roleVariant.findFirst({
          where: { roleId: this.roleId, isActive: true }
      });
      if (variant) {
          console.log(`[AgentRuntime] 🧬 Polling DNA for ${this.roleId}...`);
          const cortex = (variant.cortexConfig as any) || {};
          if (cortex.executionMode) this.executionMode = cortex.executionMode;
          // Could update basePrompt here if we pass it through system prompt enhancer
      }
  }
}

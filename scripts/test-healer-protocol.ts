import { AgentRuntime } from '../apps/api/src/services/AgentRuntime.js';
import { RoleFactoryService } from '../apps/api/src/services/RoleFactoryService.js';
import { prisma } from '../apps/api/src/db.js';
import { ProviderManager } from '../apps/api/src/services/ProviderManager.js';
import { loadEnv } from './env-loader.js';

async function testHealerProtocol() {
  loadEnv();
  console.log("🧬 Starting Healer Protocol Test...");

  const factory = new RoleFactoryService();
  
  // 1. Create the System Health Probe Role
  console.log("🏗️ Creating 'System Health Probe'...");
  const intent = {
    name: "System Health Probe",
    description: "Detects and repairs technical failures and missing capabilities.",
    domain: "System",
    complexity: "HIGH" as const,
    capabilities: ["reasoning", "json"]
  };

  const baseRole = await prisma.role.upsert({
    where: { name: "System Diagnostic" },
    update: {},
    create: { 
      name: "System Diagnostic", 
      basePrompt: "You are a system health probe. Detect failures and repair them." 
    }
  });

  const variant = await factory.createRoleVariant(baseRole.id, intent);
  console.log("✅ Probe Variant Created:", variant.id);
  const cortex = variant.cortexConfig as any;
  console.log("  Execution Mode:", cortex.executionMode);
  console.log("  Governance Strategy:", (variant.governanceConfig as any).assessmentStrategy);

  // 2. Initialize Runtime
  const runtime = await AgentRuntime.create(process.cwd(), ['read_file', 'terminal_execute'], 'Architect', 'HYBRID_AUTO');
  
  // 3. Run the Healer Simulation
  console.log("\n🧪 Running Healer Simulation...");
  
  // We'll mock a failing situation
  const userGoal = "Check the health of the MCP registry. If any service is missing, hot-load it using REQUEST_TOOL:<service_name>.";
  
  // Initial response from model (simulated)
  // We'll simulate the first turn where it 'detects' a failure
  const initialResponse = `I am checking the system logs for MCP failures...
\`\`\`typescript
const logs = await system.terminal_execute({ command: "cat non_existent_log_file.log" });
console.log(logs);
\`\`\``;

  // Mock regenerateCallback to simulate model behavior
  let turnCount = 0;
  const mockRegenerate = async (prompt: string) => {
    turnCount++;
    console.log(`\n--- TURN ${turnCount} PROMPT RECEIVED ---`);
    console.log(`Prompt Preview: ${prompt.substring(prompt.length - 500)}`);
    if (prompt.includes("git_status") || prompt.includes("git_git_status") || prompt.includes("Failed to execute git_status")) {
        console.log("✨ Model detected the repair tool output! Restoring capabilities...");
        return "The git tool is now active. Although the status call had argument issues, the system is now capable of git operations. FINAL ANSWER: The system has been successfully healed and the git capability is restored.";
    }

    if (prompt.includes("🚨 ERRORS DETECTED")) {
      console.log("✨ Model detected the error! Triggering Fix Strategy...");
      return `The log check failed as expected. I need more powerful tools to repair the registry.
REQUEST_TOOL:git
I will now use the git tool to check the repository state.
{ "tool": "git.git_status", "args": { "path": "." } }`;
    }

    return "Processing...";
  };

  const result = await runtime.runAgentLoop(userGoal, initialResponse, mockRegenerate);
  
  console.log("\n--- TEST RESULT ---");
  console.log(result.result);

  const hasJitLog = result.logs.some(l => l.includes("JIT Tool Request Detected in Response: git"));
  const hasSuccess = result.result.includes("successfully healed");

  if (hasJitLog && hasSuccess) {
      console.log("\n🏆 SUCCESS: Healer Protocol verified! JIT Tool Injection worked.");
  } else {
      console.log("\n❌ FAILURE:");
      if (!hasJitLog) console.log("- JIT Tool Injection not detected in logs.");
      if (!hasSuccess) console.log("- Success message not found in final result.");
  }

  process.exit(0);
}

testHealerProtocol().catch(console.error);

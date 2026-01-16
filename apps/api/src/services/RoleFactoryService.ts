import { RoleVariant, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ProviderManager } from './ProviderManager.js';
import { type BaseLLMProvider } from '../utils/BaseLLMProvider.js';
import { LLMSelector } from '../orchestrator/LLMSelector.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Type-safe helper for accessing providerData
interface ProviderDataWithId {
    id?: string;
    [key: string]: unknown;
}

// Type guard for error objects
interface ExecError extends Error {
    stderr?: string;
}

interface RoleIntent {
    name: string;
    description: string;
    domain: string; // e.g., "Frontend", "Backend", "Creative"
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    capabilities?: string[]; // e.g. ['vision', 'reasoning', 'tts', 'embedding']
}

interface IdentityConfig {
    personaName: string;
    systemPromptDraft: string;
    style: string;
    thinkingProcess: 'SOLO' | 'CHAIN_OF_THOUGHT' | 'MULTI_STEP_PLANNING';
    reflectionEnabled: boolean;
}

interface CortexConfig {
    contextRange: { min: number; max: number };
    capabilities: string[];
    tools: string[]; // List of tool names
}

interface ContextConfig {
    strategy: string[]; // Non-exclusive: EXPLORATORY, VECTOR_SEARCH, LOCUS_FOCUS
    permissions: string[];
}

interface GovernanceConfig {
    rules: string[];
    assessmentStrategy: string[]; // Non-exclusive: LINT_ONLY, VISUAL_CHECK, STRICT_TEST_PASS, JUDGE, LIBRARIAN
    enforcementLevel: string;
}

/**
 * RoleFactoryService (Factory 4.0 - Unlocked)
 * 
 * Assembles "Synthetic Organisms" (RoleVariants) by configuring their DNA modules.
 * Now powered by the "Role Architect" Meta-Agent via ProviderManager.
 */
export class RoleFactoryService {

    /**
     * The Master Method: Assembles a new RoleVariant from intent
     */
    private async executeCodeMode<T>(code: string, timeout = 30000): Promise<T> {
        // Robust extraction: try to find a block or at least the roleBuilder call
        let cleanCode = code;
        
        // 1. Try to extract triple-backtick block
        const blockMatch = code.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
        if (blockMatch) {
            cleanCode = blockMatch[1];
        } else {
            // 2. See if there is a roleBuilder call anywhere
            const callMatch = code.match(/(roleBuilder\.set[a-zA-Z]+\s*\([\s\S]*\)\s*;?)/);
            if (callMatch) {
                cleanCode = callMatch[1];
            }
        }

        const tempDir = path.join(process.cwd(), '.temp', 'role-builder');
        await fs.mkdir(tempDir, { recursive: true });
        const fileName = `architect_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
        const filePath = path.join(tempDir, fileName);

        // Minimal Shim for Role Building
        const SHIM = `
const __result = {};
const meta = {}; // Safety shim for models hallucinating a global meta object
const roleBuilder = {
    setIdentity: (config) => { Object.assign(__result, { identityConfig: config }); },
    setCortex: (config) => { Object.assign(__result, { cortexConfig: config }); },
    setContext: (config) => { Object.assign(__result, { contextConfig: config }); },
    setGovernance: (config) => { Object.assign(__result, { governanceConfig: config }); },
    setTools: (tools) => { Object.assign(__result, { tools }); }
};

try {
    ${cleanCode}
} catch (err) {
    console.error("RUNTIME_ERROR: " + err.message);
    process.exit(1);
}

process.stdout.write(JSON.stringify(__result));
`;

        try {
            await fs.writeFile(filePath, SHIM, 'utf-8');
            const { stdout } = await execAsync(`npx tsx ${filePath}`, { timeout, cwd: tempDir });
            return JSON.parse(stdout.trim()) as T;
        } catch (e: unknown) {
            const error = e as ExecError;
            console.error(`[RoleFactory] Code Execution Failed for snippet: ${cleanCode.substring(0, 100)}...`, error.stderr || error.message);
            throw new Error(`Architect Code Execution Failed: ${error.message}`);
        } finally {
            try { await fs.unlink(filePath); } catch { }
        }
    }

    /**
     * Create a new variant of a role based on intent
     */
    async createRoleVariant(roleId: string, intent: RoleIntent): Promise<RoleVariant> {
        console.log(`[RoleFactory] 🧬 Assembling DNA for role: ${intent.name} (${intent.complexity})`);

        // 0. Get the Provider and Model (The Architect's Brain)
        // We use the LLMSelector to find the most capable model for reasoning/architecting
        const { modelId } = await this.getArchitectBrain();

        // 1. Identity Architect (LLM)
        // [CODE MODE] Now returns IdentityConfig via TypeScript execution
        const identityConfig = await this.identityArchitect(modelId, intent);

        // 2. Cortex Architect (LLM)
        // Defines HOW the agent thinks (Orchestration, Context Range).
        const cortexConfig = await this.cortexArchitect(modelId, intent);

        // 3. Context Architect (LLM)
        // Defines WHAT the agent remembers/accesses.
        const contextConfig = await this.contextArchitect(modelId, intent);

        // 4. Governance Architect (LLM)
        // Defines rules and safety boundaries.
        const governanceConfig = await this.governanceArchitect(modelId, intent);

        // 5. Tool Architect (LLM) - [NEW]
        // Defines WHICH tools the agent can use.
        // We use the same 'modelId' for consistency, or we could ask Selector for a specialized tool-picker.
        const toolNames = await this.toolArchitect(modelId, intent);
        cortexConfig.tools = toolNames;

        // 5. Persist the DNA
        const variant = await prisma.roleVariant.create({
            data: {
                roleId: roleId,
                identityConfig: identityConfig as unknown as Prisma.InputJsonValue,
                cortexConfig: cortexConfig as unknown as Prisma.InputJsonValue,
                governanceConfig: governanceConfig as unknown as Prisma.InputJsonValue,
                contextConfig: contextConfig as unknown as Prisma.InputJsonValue,
                isActive: true
            }
        });

        console.log(`[RoleFactory] ✅ Born: Variant ${variant.id}`);
        return variant;
    }

    /**
     * Resolves the best available model for the Architect to use.
     */
    private async getArchitectBrain(): Promise<{ provider: BaseLLMProvider, modelId: string }> {
        const selector = new LLMSelector();

        // Define virtual requirements for the Architect
        // We want a smart model with reasoning if possible
        const architectRequirements = {
            id: 'role-architect-virtual',
            metadata: {
                requirements: {
                    capabilities: ['reasoning', 'json'],
                    minContext: 16000
                }
            }
        };

        try {
            // Ask LLMSelector to pick the best model
            const bestModelId = await selector.resolveModelForRole(architectRequirements);

            // Get the provider details for this model
            const modelDef = await prisma.model.findUnique({
                where: { id: bestModelId },
                include: { provider: true }
            });

            if (!modelDef || !modelDef.provider) {
                throw new Error(`Selected model ${bestModelId} not found in DB`);
            }

            const provider = ProviderManager.getProvider(modelDef.providerId);
            if (!provider) {
                throw new Error(`Provider ${modelDef.providerId} for model ${bestModelId} is not initialized`);
            }

            // Resolve the actual API Model ID (e.g. "gpt-4o") from metadata
            let apiModelId = modelDef.name; // Default to name
            if (modelDef.providerData && typeof modelDef.providerData === 'object') {
                const data = modelDef.providerData as ProviderDataWithId;
                if (data.id && typeof data.id === 'string') {
                    apiModelId = data.id;
                }
            }

            console.log(`[RoleFactory] 🧠 Architect using ${apiModelId} (DB: ${bestModelId}) via ${modelDef.providerId}`);
            return { provider, modelId: bestModelId }; // Return DB ID so downstream can resolve provider/slug properly

        } catch (error) {
            console.warn("[RoleFactory] ⚠️ Failed to resolve smart model via selector. Falling back to simple scan.", error);

            // Fail-safe: Iterate known providers like before, but grab their first available model
            const candidateProviders = ['openai', 'anthropic', 'openrouter', 'google', 'mistral', 'groq', 'nvidia', 'cerebras', 'ollama'];

            for (const pid of candidateProviders) {
                const provider = ProviderManager.getProvider(pid);
                if (provider) {
                    // Try to get a default model from this provider
                    try {
                        const models = await provider.getModels();
                        if (models.length > 0) {
                            // Pick the last one (often the most recent/capable?) 
                            // or just the first. Let's pick the first.
                            return { provider, modelId: models[0].id };
                        }
                    } catch { continue; }
                }
            }

            throw new Error("No Intelligence Provider available for Role Factory.");
        }
    }

    /**
     * Helper to get provider instance from modelId
     */
    /**
     * Helper to get provider instance AND api-ready model ID from DB modelId
     */
    private async resolveProvider(dbModelId: string): Promise<{ provider: BaseLLMProvider, apiModelId: string }> {
        const model = await prisma.model.findUnique({ where: { id: dbModelId } });
        if (!model) throw new Error(`Model ${dbModelId} not found`);

        const provider = ProviderManager.getProvider(model.providerId);
        if (!provider) throw new Error(`Provider ${model.providerId} not initialized`);

        // Resolve API Slug
        let apiModelId = model.name;
        if (model.providerData && typeof model.providerData === 'object') {
            const data = model.providerData as ProviderDataWithId;
            if (data.id && typeof data.id === 'string') {
                apiModelId = data.id;
            }
        }

        return { provider, apiModelId };
    }

    /**
     * STAGE 1: IDENTITY
     * Defines exactly WHO the agent is.
     */
    async identityArchitect(modelId: string, intent: RoleIntent): Promise<IdentityConfig> {
        console.log(`[RoleFactory] 👤 Designing Identity for ${intent.name}...`);

        const prompt = `
        You are the Identity Architect.
        Design the core persona for a new AI Role.

        Input Intent:
        - Name: ${intent.name}
        - Description: ${intent.description}
        - Domain: ${intent.domain}
        - Complexity: ${intent.complexity}

        ## INSTRUCTIONS:
        Write a generic TypeScript block to configure the identity.
        Use the global 'roleBuilder.setIdentity(config)' function.
        
        Config Interface:
        interface IdentityConfig {
            personaName: string;
            systemPromptDraft: string; // Write a high-quality system prompt here
            style: 'PROFESSIONAL_CONCISE' | 'FRIENDLY_HELPFUL' | 'ACADEMIC_FORMAL' | 'CREATIVE';
            thinkingProcess: 'SOLO' | 'CHAIN_OF_THOUGHT' | 'CRITIC_LOOP';
            reflectionEnabled: boolean;
        }

        ## RULES:
        1. Write ONLY valid TypeScript code relative to the interface.
        2. Do NOT import anything.
        3. Do NOT refer to any external variables OR global objects like 'meta', 'intent', or 'prisma'.
        4. Do NOT use spread operators (...) or ellipsis.
        5. Call roleBuilder.setIdentity({...}) with your config.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'OUTPUT ONLY TYPESCRIPT CODE. NO TEXT. NO EXPLANATIONS. JUST CODE.' },
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: 'roleBuilder.setIdentity({' },
                ]
            });

            const prefix = 'roleBuilder.setIdentity({';
            let fullCode = raw.trim();
            if (!fullCode.includes('roleBuilder.setIdentity')) {
                fullCode = prefix + fullCode;
            }

            return await this.executeCodeMode<IdentityConfig>(fullCode);
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Identity Architect failed, falling back to gene pool.", e);
            return {
                personaName: intent.name,
                systemPromptDraft: `You are ${intent.name}. ${intent.description}.`,
                style: 'PROFESSIONAL_CONCISE',
                thinkingProcess: intent.complexity === 'HIGH' ? 'CHAIN_OF_THOUGHT' : 'SOLO',
                reflectionEnabled: intent.complexity === 'HIGH'
            };
        }
    }

    /**
     * MODULE B: Cortex (The Brain)
     * "How do I think?"
     */
    async cortexArchitect(modelId: string, intent: RoleIntent): Promise<CortexConfig> {
        const prompt = `
        You are the Cortex Architect.
        Determine the cognitive load and orchestration strategy.

        Intent:
        - Complexity: ${intent.complexity}
        - Domain: ${intent.domain}

        ## INSTRUCTIONS:
        Write a generic TypeScript block to configure the cortex.
        Use the global 'roleBuilder.setCortex(config)' function.
        
        Config Interface:
        interface CortexConfig {
            contextRange: { min: number, max: number }; // Token limits (e.g. 4096-128000)
            capabilities: string[]; // ["vision", "reasoning", "tts", "embedding"]
            tools: string[]; // List of tool names to pre-load (e.g. "filesystem")
        }
        
        IMPORTANT: Do NOT include "coding" as a capability. It is handled by the model choice automatically.
        - Only include "reasoning" for deep logic/math/planning.
        - Only include "vision" for UI/Image tasks.
        
        ## RULES:
        1. Write ONLY valid TypeScript code.
        2. Do NOT refer to any external variables or global objects like 'meta' or 'intent'.
        3. Do NOT use spread operators (...) or ellipsis.
        4. Call roleBuilder.setCortex({...}) with your config.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'OUTPUT ONLY TYPESCRIPT CODE. NO TEXT. NO EXPLANATIONS. JUST CODE.' },
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: 'roleBuilder.setCortex({' },
                ]
            });

            const prefix = 'roleBuilder.setCortex({';
            let fullCode = raw.trim();
            if (!fullCode.includes('roleBuilder.setCortex')) {
                fullCode = prefix + fullCode;
            }

            return await this.executeCodeMode<CortexConfig>(fullCode);
        } catch (e: unknown) {
            console.warn("Cortex Architect failed, falling back to gene pool.", e);
            // Fallback heuristic
            const caps: string[] = [];
            if (intent.capabilities?.includes('vision')) caps.push('vision');
            if (intent.capabilities?.includes('reasoning')) caps.push('reasoning');

            return {
                contextRange: { min: 4096, max: 8192 },
                capabilities: caps,
                tools: []
            };
        }
    }

    /**
     * MODULE C: Context (The Memory)
     * "What do I remember?"
     */
    async contextArchitect(modelId: string, intent: RoleIntent): Promise<ContextConfig> {
        const prompt = `
        You are the Context Architect.
        Determine how this agent accesses information.

        Intent: ${intent.domain}

        ## INSTRUCTIONS:
        Write a generic TypeScript block using 'roleBuilder.setContext(config)'.
        
        Config Interface:
        interface ContextConfig {
            strategy: string[]; // e.g. ["EXPLORATORY", "VECTOR_SEARCH", "LOCUS_FOCUS"]
            permissions: string[]; // e.g. ["/src", "/docs"] or ["ALL"]
        }
        
        IMPORTANT: Most roles should include "EXPLORATORY" as the base strategy.
        
        ## RULES:
        1. Write ONLY valid TypeScript code.
        2. Do NOT use spread operators (...) or ellipsis.
        3. Call roleBuilder.setContext({...}) with your config.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'OUTPUT ONLY TYPESCRIPT CODE. NO TEXT. NO EXPLANATIONS. JUST CODE.' },
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: 'roleBuilder.setContext({' },
                ]
            });

            const prefix = 'roleBuilder.setContext({';
            let fullCode = raw.trim();
            if (!fullCode.includes('roleBuilder.setContext')) {
                fullCode = prefix + fullCode;
            }

            return await this.executeCodeMode<ContextConfig>(fullCode);
        } catch (e: unknown) {
            console.warn("Context Architect failed, falling back to gene pool.", e);
            // Fallback
            return {
                strategy: ['EXPLORATORY'],
                permissions: ['ALL']
            };
        }
    }

    /**
     * MODULE D: Governance (The Law)
     * "How am I judged?"
     */
    async governanceArchitect(modelId: string, intent: RoleIntent): Promise<GovernanceConfig> {
        const prompt = `
        You are the Governance Architect.
        Set the rules and assessment criteria.

        Intent:
        - Domain: ${intent.domain}
        - Complexity: ${intent.complexity}

        ## INSTRUCTIONS:
        Write a generic TypeScript block using 'roleBuilder.setGovernance(config)'.
        
        Config Interface:
        interface GovernanceConfig {
            rules: string[]; // e.g. ["Always use TypeScript", "No vague answers"]
            assessmentStrategy: string[]; // e.g. ["LINT_ONLY", "VISUAL_CHECK", "STRICT_TEST_PASS"]
            enforcementLevel: "LOW" | "MEDIUM" | "HIGH";
        }
        
        ## RULES:
        1. Write ONLY valid TypeScript code.
        2. Do NOT use spread operators (...) or ellipsis.
        3. Call roleBuilder.setGovernance({...}) with your config.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'OUTPUT ONLY TYPESCRIPT CODE. NO TEXT. NO EXPLANATIONS. JUST CODE.' },
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: 'roleBuilder.setGovernance({' },
                ]
            });

            const prefix = 'roleBuilder.setGovernance({';
            let fullCode = raw.trim();
            if (!fullCode.includes('roleBuilder.setGovernance')) {
                fullCode = prefix + fullCode;
            }

            return await this.executeCodeMode<GovernanceConfig>(fullCode);
        } catch (e: unknown) {
            console.warn("Governance Architect failed, falling back to gene pool.", e);
            return {
                rules: ["Verify work before submitting."],
                assessmentStrategy: ["VISUAL_CHECK"],
                enforcementLevel: "MEDIUM"
            };
        }
    }

    /**
     * MODULE E: Tools (The Hands)
     * "What can I do?"
     */
    async toolArchitect(modelId: string, intent: RoleIntent): Promise<string[]> {
        const prompt = `
        You are the Tool Architect.
        Select the necessary tools for this agent.

        Intent:
        - Domain: ${intent.domain}
        - Description: ${intent.description}
        - Complexity: ${intent.complexity}

        ## INSTRUCTIONS:
        Write a generic TypeScript block using 'roleBuilder.setTools(tools)'.
        
        Available Tools:
        - "filesystem" (Read/Write files)
        - "terminal" (Execute commands)
        - "browser" (Read websites)
        - "create_role_variant" (Spawn new agents)
        - "search_codebase" (Grep/Find files)
        
        ## RULES:
        1. Write ONLY valid TypeScript code.
        2. Do NOT use spread operators (...) or ellipsis.
        3. Call roleBuilder.setTools(["tool1", "tool2"]) with your list.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'OUTPUT ONLY TYPESCRIPT CODE. NO TEXT. NO EXPLANATIONS. JUST CODE.' },
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: 'roleBuilder.setTools([' },
                ]
            });

            const prefix = 'roleBuilder.setTools([';
            let fullCode = raw.trim();
            if (!fullCode.includes('roleBuilder.setTools')) {
                fullCode = prefix + fullCode;
            }

            const result = await this.executeCodeMode<{ tools: string[] }>(fullCode);
            return result.tools || ['filesystem', 'terminal'];

        } catch (e: unknown) {
            console.warn("Tool Architect failed, falling back.", e);
            return ['filesystem', 'terminal'];
        }
    }

    /**
     * Seeds the "Role Architect" agent into the DB if missing.
     * This allows the user to chat with the factory.
     */
    async ensureArchitectRole() {
        const name = "Role Architect";
        const existing = await prisma.role.findUnique({ where: { name } });
        if (existing) return existing;

        console.log(`[RoleFactory] 🏗️ Seeding "Role Architect"...`);

        // Create the Category if needed
        let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
        if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

        return await prisma.role.create({
            data: {
                name,
                description: "The Master Builder. Designs and evolves other agents.",
                categoryId: cat.id,
                basePrompt: `You are the Role Architect.
Your mission is to design specialized AI agents (Roles) for the user's workspace.
You have access to the 'create_role_variant' tool to biologically spawn new agent lifeforms.

When the user asks for a new agent:
1. Detect Intent: Infer the Domain (Frontend, Backend, Research), Complexity (Low/High), and Special Capabilities from the user's initial request.
2. DO NOT ASK FOR CLARIFICATION: Act autonomously. Make your best guess for the parameters.
3. Use 'create_role_variant' IMMEDIATELY to generate the role. 
4. Confirm to the user that the agent has been biologically spawned.
`
            }
        });
    }
}

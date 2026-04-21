import { RoleVariant, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ProviderManager } from './ProviderManager.js';
import { type BaseLLMProvider } from '../utils/BaseLLMProvider.js';
import { LLMSelector } from '../orchestrator/LLMSelector.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { COORDINATOR_PROTOCOL_SNIPPET } from '../prompts/CoordinatorProtocol.js';

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

export type AgentExecutionMode = 'JSON_STRICT' | 'CODE_INTERPRETER' | 'HYBRID_AUTO';

export interface RoleIntent {
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


export interface CortexConfig {
    executionMode: AgentExecutionMode;
    contextRange: { min: number; max: number };
    maxOutputTokens?: number; // Role-specific output length requirement (default: 1024 for JSON/tools, higher for planning/writing)
    capabilities: string[];
    tools: string[]; // List of tool names
}

export interface ContextConfig {
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
    /**
     * Executes an architect stage using a structured JSON strategy.
     * This is much more robust than "Code Mode" for configuration data.
     */
    private async executeJsonMode<T>(modelId: string, prompt: string, schemaName: string): Promise<T> {
        const { provider, apiModelId } = await this.resolveProvider(modelId);

        console.log(`[RoleFactory] 🤖 ${schemaName} Architect is thinking (JSON Mode)...`);

        try {
            const response = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    {
                        role: 'system',
                        content: `You are the ${schemaName} Architect. 
Return ONLY a valid JSON object. 
No markdown code blocks unless requested. 
Ensure the output is parseable by JSON.parse().`
                    },
                    { role: 'user', content: prompt }
                ],
                // responseFormat: { type: 'json_object' } // Some providers support this
            });

            // Robust JSON extraction
            let jsonStr = response.trim();
            // Allow ```json, ```JSON, or just ```
            const blockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (blockMatch) {
                jsonStr = blockMatch[1];
            } else {
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }
            }

            return JSON.parse(jsonStr) as T;
        } catch (e: unknown) {
            console.error(`[RoleFactory] ❌ JSON Execution Failed for ${schemaName}:`, e instanceof Error ? e.message : String(e));
            throw e;
        }
    }

    /**
     * Master method for code execution (Legacy/Hybrid support)
     */
    private async executeCodeMode<T>(code: string, timeoutInput: any = 30000): Promise<T> {
        const timeout = typeof timeoutInput === 'number' ? timeoutInput : (Number(timeoutInput) || 30000);
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

            console.log(`[RoleFactory] 🔧 Executing code in: ${filePath}`);
            console.log(`[RoleFactory] 📝 Code to execute:\n${code.substring(0, 300)}${code.length > 300 ? '...' : ''}`);

            const { stdout, stderr } = await execAsync(`npx tsx ${filePath}`, { timeout, cwd: tempDir });

            if (stderr) {
                console.warn(`[RoleFactory] ⚠️ Execution stderr: ${stderr}`);
            }

            console.log(`[RoleFactory] ✓ Execution stdout: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);

            return JSON.parse(stdout.trim()) as T;
        } catch (e: any) {
            console.error(`[RoleFactory] Code Execution Failed:`, e.stderr || e.message);
            throw new Error(`Architect Code Execution Failed: ${e.message}`);
        } finally {
            try { await fs.unlink(filePath); } catch { }
        }
    }


    async createRoleVariant(roleId: string, intent: RoleIntent): Promise<RoleVariant> {
        console.log(`\n========================================`);
        console.log(`[RoleFactory] 🧬 ROLE FACTORY SERVICE CALLED`);
        console.log(`[RoleFactory] 🧬 Assembling DNA for role: ${intent.name} (${intent.complexity})`);
        console.log(`[RoleFactory] 🧬 Description: ${intent.description}`);
        console.log(`========================================\n`);

        // State for Sticky Model Selection
        let currentModelId: string | null = null;
        let currentProvider: BaseLLMProvider | null = null;
        const excludedModelIds: string[] = [];

        // Helper to ensure we have a working brain
        const ensureBrain = async () => {
            if (currentModelId && currentProvider) return { modelId: currentModelId, provider: currentProvider };

            try {
                const brain = await this.getArchitectBrain(excludedModelIds);
                currentModelId = brain.modelId;
                currentProvider = brain.provider;
                return brain;
            } catch (err) {
                console.error("[RoleFactory] 💀 Critical: Could not find ANY capable architect model.", err);
                throw err;
            }
        };

        // Resilience Wrapper: Tries current model, if fails -> records exclusion -> picks new model -> retries
        const executeWithResilience = async <T>(
            stageName: string,
            operation: (modelId: string) => Promise<T>,
            fallbackGenerator: () => T
        ): Promise<T> => {
            const MAX_RETRIES = 2;
            let attempts = 0;

            while (attempts <= MAX_RETRIES) {
                try {
                    const brain = await ensureBrain();
                    return await operation(brain.modelId);
                } catch (error) {
                    attempts++;
                    const isLastAttempt = attempts > MAX_RETRIES;
                    const errorMsg = error instanceof Error ? error.message : String(error);

                    console.warn(`[RoleFactory] ⚠️ ${stageName} Architect failed with model ${currentModelId} (Attempt ${attempts}/${MAX_RETRIES + 1}). Error: ${errorMsg}`);

                    // Mark current model as bad for this session
                    if (currentModelId) {
                        excludedModelIds.push(currentModelId);
                        currentModelId = null; // Force refresh
                        currentProvider = null;
                    }

                    if (isLastAttempt) {
                        console.error(`[RoleFactory] ❌ ${stageName} Architect exhausted all retries. Using Fallback.`);
                        break;
                    }
                }
            }

            return fallbackGenerator();
        };

        // 1. Identity Architect
        const identityConfig = await executeWithResilience<IdentityConfig>(
            "Identity",
            (mid) => this.identityArchitect(mid, intent),
            () => this.getIdentityFallback(intent)
        );

        // 2. Cortex Architect
        const cortexConfig = await executeWithResilience<CortexConfig>(
            "Cortex",
            (mid) => this.cortexArchitect(mid, intent),
            () => this.getCortexFallback(intent)
        );

        // 3. Context Architect
        const contextConfig = await executeWithResilience<ContextConfig>(
            "Context",
            (mid) => this.contextArchitect(mid, intent),
            () => this.getContextFallback(intent)
        );

        // 4. Governance Architect
        const governanceConfig = await executeWithResilience<GovernanceConfig>(
            "Governance",
            (mid) => this.governanceArchitect(mid, intent),
            () => this.getGovernanceFallback(intent)
        );

        // 5. Tool Architect
        const toolNames = await executeWithResilience<string[]>(
            "Tool",
            (mid) => this.toolArchitect(mid, intent),
            () => ['filesystem', 'terminal']
        );
        cortexConfig.tools = toolNames;

        // 5. Persist the DNA
        const variant = await prisma.roleVariant.create({
            data: {
                roleId: roleId,
                identityConfig: finalIdentity as unknown as Prisma.InputJsonValue,
                cortexConfig: cortexConfig as unknown as Prisma.InputJsonValue,
                governanceConfig: finalGovernance as unknown as Prisma.InputJsonValue,
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
    private async getArchitectBrain(excludedModelIds: string[] = []): Promise<{ provider: BaseLLMProvider, modelId: string }> {
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
            // Ask ModelSelector to pick the best model
            const bestModelId = await selector.resolveModelForRole(architectRequirements);

            // Get the provider details for this model
            const modelDef = await prisma.model.findUnique({
                where: { id: bestModelId },
                include: { provider: true }
            });

            if (!modelDef || !modelDef.provider) {
                throw new Error(`Selected model ${bestModelId} not found in DB`);
            }

            // Check if this model is appropriate for text generation
            const modelName = modelDef.name.toLowerCase();
            const modelId = (modelDef.id || '').toLowerCase();

            // Check providerData for model type
            let modelType = '';
            if (modelDef.providerData && typeof modelDef.providerData === 'object') {
                const data = modelDef.providerData as any;
                modelType = (data.type || data.modelType || '').toLowerCase();
            }

            const isInappropriate = inappropriateTypes.some(type =>
                modelName.includes(type) ||
                modelId.includes(type) ||
                modelType.includes(type)
            );

            if (isInappropriate) {
                console.warn(`[RoleFactory] ⚠️ Model ${modelDef.name} (type: ${modelType || 'unknown'}) is not suitable for text generation (attempt ${attempt}/${MAX_ATTEMPTS}), trying another...`);
                excludedModels.push(bestModelId);
                continue; // Try again with this model excluded
            }

            const provider = ProviderManager.getProvider(modelDef.providerId);
            if (!provider) {
                console.warn(`[RoleFactory] ⚠️ Provider ${modelDef.providerId} not available, trying another model...`);
                excludedModels.push(bestModelId);
                continue;
            }

            // Resolve the actual API Model ID (e.g. "gpt-4o") from metadata
            let apiModelId = modelDef.name; // Default to name
            if (modelDef.providerData && typeof modelDef.providerData === 'object') {
                const data = modelDef.providerData as any;
                if (data.id) apiModelId = data.id;
            }

            console.log(`[RoleFactory] 🧠 Architect using ${apiModelId} (DB: ${bestModelId}) via ${modelDef.providerId}`);
            return { provider, modelId: bestModelId }; // Return DB ID so downstream can resolve provider/slug properly

        } catch (error: any) {
            // Check if it's a 400 error (model requires terms acceptance, wrong model type, etc.)
            const is400Error = error.message?.includes('400') || error.message?.includes('requires terms');

            if (is400Error) {
                console.warn(`[RoleFactory] ⚠️ 400 error with current model (attempt ${attempt}/${MAX_ATTEMPTS}), trying another...`);
                // Don't throw, just continue to next attempt
                continue;
            }

            if (attempt === MAX_ATTEMPTS) {
                console.warn("[RoleFactory] ⚠️ Failed to resolve smart model via selector after all attempts. Falling back to simple scan.", error);
                break; // Exit loop, use fallback
            }
        }
    }

        // Fail-safe: Iterate known providers like before, but grab their first TEXT GENERATION model
        console.log('[RoleFactory] Using fallback provider scan...');
    const candidateProviders = ['openai', 'anthropic', 'openrouter', 'google', 'mistral', 'groq', 'nvidia', 'cerebras', 'ollama'];

    for(const pid of candidateProviders) {
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

        throw new Error("No suitable text generation model available for Role Factory.");
    }

    /**
     * Helper to get provider instance from modelId
     */
    /**
     * Helper to get provider instance AND api-ready model ID from DB modelId
     */
    public async resolveProvider(dbModelId: string): Promise < { provider: BaseLLMProvider, apiModelId: string } > {
    const model = await prisma.model.findUnique({ where: { id: dbModelId } });
    if(!model) throw new Error(`Model ${dbModelId} not found`);

    const provider = ProviderManager.getProvider(model.providerId);
    if(!provider) throw new Error(`Provider ${model.providerId} not initialized`);

    // Resolve API Slug
    let apiModelId = model.name;
    if(model.providerData && typeof model.providerData === 'object') {
    const data = model.providerData as ProviderDataWithId;
    if (data.id && typeof data.id === 'string') {
        apiModelId = data.id;
    }
}

return { provider, apiModelId };
    }

    /**
     * STAGE 1: IDENTITY
     */
    async identityArchitect(modelId: string, intent: RoleIntent): Promise < IdentityConfig > {
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
        3. Call roleBuilder.setIdentity({...}) with your config.
        `;

    const { provider, apiModelId } = await this.resolveProvider(modelId);

    try {
        const raw = await provider.generateCompletion({
            modelId: apiModelId,
            messages: [{ role: 'system', content: 'You are a TypeScript Geneator. Write code only.' }, { role: 'user', content: prompt }]
        });

        // Allow for markdown extraction if they wrap in ```
        let code = raw;
        const match = raw.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        if(match) code = match[1];

        return await this.executeCodeMode<IdentityConfig>(code);

    } catch(e: unknown) {
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
     */
    async cortexArchitect(modelId: string, intent: RoleIntent): Promise < CortexConfig > {
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

        IMPORTANT: Be conservative with capabilities to avoid rate limits!
        - Only include "reasoning" for deep logic/math/planning.
        - Only include "vision" for UI/Image tasks.
        
        ## RULES:
        1. Write ONLY valid TypeScript code.
        2. Call roleBuilder.setCortex({...}) with your config.
        `;

    const { provider, apiModelId } = await this.resolveProvider(modelId);

    try {
        const raw = await provider.generateCompletion({
            modelId: apiModelId,
            messages: [{ role: 'system', content: 'You are a TypeScript Generator. Write code only.' }, { role: 'user', content: prompt }]
        });

        let code = raw;
        const match = raw.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        if(match) code = match[1];

        return await this.executeCodeMode<CortexConfig>(code);
    } catch(e: unknown) {
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
     */
    async contextArchitect(modelId: string, intent: RoleIntent): Promise < ContextConfig > {
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
        `;

    const { provider, apiModelId } = await this.resolveProvider(modelId);

    try {
        const raw = await provider.generateCompletion({
            modelId: apiModelId,
            messages: [{ role: 'system', content: 'You are a TypeScript Generator.' }, { role: 'user', content: prompt }]
        });

        let code = raw;
        const match = raw.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        if(match) code = match[1];

        return await this.executeCodeMode<ContextConfig>(code);
    } catch(e: unknown) {
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
     */
    async governanceArchitect(modelId: string, intent: RoleIntent): Promise < GovernanceConfig > {
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
        `;

    const { provider, apiModelId } = await this.resolveProvider(modelId);

    try {
        const raw = await provider.generateCompletion({
            modelId: apiModelId,
            messages: [{ role: 'system', content: 'You are a TypeScript Generator.' }, { role: 'user', content: prompt }]
        });

        let code = raw;
        const match = raw.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        if(match) code = match[1];

        return await this.executeCodeMode<GovernanceConfig>(code);
    } catch(e: unknown) {
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
     */
    async toolArchitect(modelId: string, intent: RoleIntent): Promise < string[] > {
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
        2. Call roleBuilder.setTools(["tool1", "tool2"]) with your list.
        `;

    const { provider, apiModelId } = await this.resolveProvider(modelId);

    try {
        const raw = await provider.generateCompletion({
            modelId: apiModelId,
            messages: [{ role: 'system', content: 'You are a TypeScript Generator.' }, { role: 'user', content: prompt }]
        });

        let code = raw;
        const match = raw.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        if(match) code = match[1];

        const result = await this.executeCodeMode<{ tools: string[] }>(code);
        return result.tools || ['filesystem', 'terminal'];

    } catch(e: unknown) {
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
    let role = await prisma.role.findUnique({
        where: { name },
        include: { variants: { where: { isActive: true }, take: 1 } }
    });

    if (!role) {
        console.log(`[RoleFactory] 🏗️ Seeding "Role Architect"...`);
        // Create the Category if needed
        let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
        if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

        role = await prisma.role.create({
            data: {
                name,
                description: "The Master Builder. Designs and evolves other agents.",
                categoryId: cat.id,
                basePrompt: `You are the Role Architect...` // Simplified for now, the seed script has the full one
            },
            include: { variants: true }
        });
    }

    // SMART SEEDING
    await this.smartSeedVariant(role, {
        identity: {
            personaName: 'DNA Synthesizer',
            style: 'PROFESSIONAL_CONCISE',
            systemPromptDraft: role.basePrompt,
            thinkingProcess: 'CHAIN_OF_THOUGHT',
            reflectionEnabled: true
        },
        cortex: {
            executionMode: 'JSON_STRICT',
            contextRange: { min: 32000, max: 128000 },
            maxOutputTokens: 2048,
            capabilities: ['reasoning'],
            tools: ['role_registry_list', 'role_variant_evolve', 'role_config_patch']
        },
        context: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
        governance: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' }
    });

    // Ensure other system roles are seeded
    await this.seedCoordinator();
    await this.seedLiaison();

    return await prisma.role.findUnique({ where: { id: role.id } });
}

    public async seedCoordinator() {
    const name = "Grand Orchestrator";

    // Find by name OR slug if available (though slug isn't on Role model in previous snippet, assume name is unique)
    let role = await prisma.role.findFirst({ where: { name } });

    if (!role) {
        console.log(`[RoleFactory] 👑 Seeding "Grand Orchestrator"...`);
        let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
        if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

        role = await prisma.role.create({
            data: {
                name,
                description: "The primary entry point for all complex requests.",
                categoryId: cat.id,
                basePrompt: COORDINATOR_PROTOCOL_SNIPPET
            }
        });
    }

    await this.smartSeedVariant(role, {
        identity: {
            personaName: 'Coordinator',
            style: 'PROFESSIONAL_CONCISE',
            systemPromptDraft: COORDINATOR_PROTOCOL_SNIPPET,
            thinkingProcess: 'CHAIN_OF_THOUGHT',
            reflectionEnabled: true
        },
        cortex: {
            executionMode: 'JSON_STRICT',
            contextRange: { min: 32000, max: 128000 },
            maxOutputTokens: 2048,
            capabilities: ['reasoning'],
            tools: ["role_registry_list", "role_variant_evolve", "volcano.execute_task"]
        },
        context: { strategy: ['EXPLORATORY'], permissions: ['ALL'] },
        governance: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' }
    });

    return role;
}

    public async seedLiaison() {
    const name = "Terminal Liaison";

    let role = await prisma.role.findFirst({ where: { name } });

    if (!role) {
        console.log(`[RoleFactory] 🤝 Seeding "Terminal Liaison"...`);
        let cat = await prisma.roleCategory.findUnique({ where: { name: 'System' } });
        if (!cat) cat = await prisma.roleCategory.create({ data: { name: 'System', order: 0 } });

        role = await prisma.role.create({
            data: {
                name,
                description: "Expert at local execution and avoiding sudo hangs.",
                categoryId: cat.id,
                basePrompt: "You are the Terminal Liaison. You are an expert at avoiding sudo hangs. Always use npx or local --prefix for CLI tool installations."
            }
        });
    }

    await this.smartSeedVariant(role, {
        identity: {
            personaName: 'Liaison',
            style: 'CONCISE',
            systemPromptDraft: role.basePrompt,
            thinkingProcess: 'SOLO',
            reflectionEnabled: false
        },
        cortex: {
            executionMode: 'CODE_INTERPRETER',
            contextRange: { min: 4000, max: 32000 },
            maxOutputTokens: 1024,
            capabilities: ['coding'],
            tools: ["terminal_execute", "system.context_fetch"]
        },
        context: { strategy: ['LOCUS_FOCUS'], permissions: ['ALL'] },
        governance: { rules: ["Never use sudo"], assessmentStrategy: ['VISUAL_CHECK'], enforcementLevel: 'MEDIUM' }
    });

    return role;
}

    /**
     * Helper to perform "Smart Seeding" of variants.
     * PRESERVES user edits to existing variants while upgrading outdated defaults.
     */
    private async smartSeedVariant(
    role: any,
    defaultConfig: {
    identity: Record<string, any>,
    cortex: Record<string, any>,
    context: Record<string, any>,
    governance: Record<string, any>
}
) {
    const activeVariant = await prisma.roleVariant.findFirst({
        where: { roleId: role.id, isActive: true }
    });

    if (!activeVariant) {
        console.log(`[RoleFactory] 🧬 Creating missing DNA Variant for "${role.name}"...`);
        return await prisma.roleVariant.create({
            data: {
                roleId: role.id,
                isActive: true,
                identityConfig: defaultConfig.identity,
                cortexConfig: defaultConfig.cortex,
                contextConfig: defaultConfig.context,
                governanceConfig: defaultConfig.governance,
            }
        });
    }

    // SMART UPDATE LOGIC
    // Check for outdated defaults and upgrade without touching custom values
    const currentCortex = (activeVariant.cortexConfig as any) || {};
    let needsUpdate = false;
    const newCortex = { ...currentCortex };

    // 1. Min Context Upgrade (8192 | 4096 -> 32000 | 4000)
    const currentMin = currentCortex.contextRange?.min;
    const defaultMin = (defaultConfig.cortex as any).contextRange?.min;

    // Known outdated defaults
    const OUTDATED_DEFAULTS = [8192, 4096];

    if (OUTDATED_DEFAULTS.includes(currentMin)) {
        if (defaultMin && defaultMin !== currentMin) {
            console.log(`[RoleFactory] 🆙 Upgrading outdated minContext ${currentMin} -> ${defaultMin} for "${role.name}"`);
            if (!newCortex.contextRange) newCortex.contextRange = {};
            newCortex.contextRange.min = defaultMin;
            needsUpdate = true;
        }
    }

    // 2. Max Output Tokens Upgrade (if missing or default 0/null/outdated)
    // If Role Factory logic changed (e.g. adding maxOutputTokens), backfill it safely.
    const defaultMaxOutput = (defaultConfig.cortex as any).maxOutputTokens;
    if (defaultMaxOutput && !currentCortex.maxOutputTokens) {
        console.log(`[RoleFactory] 🆙 Backfilling missing maxOutputTokens (${defaultMaxOutput}) for "${role.name}"`);
        newCortex.maxOutputTokens = defaultMaxOutput;
        needsUpdate = true;
    }

    if (needsUpdate) {
        await prisma.roleVariant.update({
            where: { id: activeVariant.id },
            data: { cortexConfig: newCortex }
        });
        console.log(`[RoleFactory] ✅ Smart-updated "${role.name}" variant.`);
    }

    return activeVariant;
}

}

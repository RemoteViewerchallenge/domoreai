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

export type AgentExecutionMode = 'JSON_STRICT' | 'CODE_INTERPRETER' | 'HYBRID_AUTO';

export interface RoleIntent {
    name: string;
    description: string;
    domain: string; // e.g., "Frontend", "Backend", "Creative"
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    capabilities?: string[]; // e.g. ['vision', 'reasoning', 'tts', 'embedding']
}

export interface IdentityConfig {
    personaName: string;
    systemPromptDraft: string;
    style: string; // [FLEXIBLE] Allow legacy styles like 'SOCRATIC'
    thinkingProcess: string; // [FLEXIBLE] Allow legacy processes
    reflectionEnabled: boolean;
}


export interface CortexConfig {
    executionMode: AgentExecutionMode;
    contextRange: { min: number; max: number };
    capabilities: string[];
    tools: string[]; // List of tool names
}

export interface ContextConfig {
    strategy: string[]; // Non-exclusive: EXPLORATORY, VECTOR_SEARCH, LOCUS_FOCUS
    permissions: string[];
}

export interface GovernanceConfig {
    rules: string[];
    assessmentStrategy: string[]; // Non-exclusive: LINT_ONLY, VISUAL_CHECK, STRICT_TEST_PASS, JUDGE, LIBRARIAN
    enforcementLevel: 'LOW' | 'MEDIUM' | 'HIGH';
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
            const blockMatch = jsonStr.match(/```json\n([\s\S]*?)```/);
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
    /**
     * STAGE 1: IDENTITY
     */
    async identityArchitect(modelId: string, intent: RoleIntent): Promise<IdentityConfig> {
        const prompt = `
        Design the core persona for a new AI Role.
        Input Intent:
        - Name: ${intent.name}
        - Description: ${intent.description}
        - Domain: ${intent.domain}
        - Complexity: ${intent.complexity}

        ## JSON Schema:
        {
            "personaName": "String",
            "systemPromptDraft": "String (Detailed system instructions)",
            "style": "PROFESSIONAL_CONCISE" | "FRIENDLY_HELPFUL" | "ACADEMIC_FORMAL" | "CREATIVE",
            "thinkingProcess": "SOLO" | "CHAIN_OF_THOUGHT" | "CRITIC_LOOP",
            "reflectionEnabled": boolean
        }
        `;

        try {
            return await this.executeJsonMode<IdentityConfig>(modelId, prompt, "Identity");
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Identity Architect fallback.", e);
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
    async cortexArchitect(modelId: string, intent: RoleIntent): Promise<CortexConfig> {
        const prompt = `
        Determine the cognitive load and execution strategy for this agent.
        Intent:
        - Complexity: ${intent.complexity}
        - Domain: ${intent.domain}

        ## DNA SETTING: 
        Determine if this agent should use:
        1. JSON_STRICT: Best for Architects/Managers (Data input/output).
        2. CODE_INTERPRETER: Best for Workers/Engineers (Writing/Running code).
        3. HYBRID_AUTO: Best for generalists who need to pick the best tool.

        ## JSON Schema:
        {
            "executionMode": "JSON_STRICT" | "CODE_INTERPRETER" | "HYBRID_AUTO",
            "contextRange": { "min": number, "max": number },
            "capabilities": string[], // ["vision", "reasoning", "tts", "embedding"]
            "tools": string[] // ["filesystem", "terminal", "browser", "search_codebase"]
        }
        `;

        try {
            return await this.executeJsonMode<CortexConfig>(modelId, prompt, "Cortex");
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Cortex Architect fallback.", e);
            return {
                executionMode: intent.complexity === 'HIGH' ? 'HYBRID_AUTO' : 'JSON_STRICT',
                contextRange: { min: 4096, max: 128000 },
                capabilities: intent.capabilities || [],
                tools: ['filesystem', 'terminal']
            };
        }
    }

    /**
     * MODULE C: Context (The Memory)
     */
    async contextArchitect(modelId: string, intent: RoleIntent): Promise<ContextConfig> {
        const prompt = `
        Determine how this agent accesses information.
        Intent Domain: ${intent.domain}

        ## JSON Schema:
        {
            "strategy": ["EXPLORATORY" | "VECTOR_SEARCH" | "LOCUS_FOCUS"],
            "permissions": ["/src", "/docs", "ALL"]
        }
        `;

        try {
            return await this.executeJsonMode<ContextConfig>(modelId, prompt, "Context");
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Context Architect fallback.", e);
            return { strategy: ['EXPLORATORY'], permissions: ['ALL'] };
        }
    }

    /**
     * MODULE D: Governance (The Law)
     */
    async governanceArchitect(modelId: string, intent: RoleIntent): Promise<GovernanceConfig> {
        const prompt = `
        Set the rules and assessment criteria.
        Intent: ${intent.domain} (${intent.complexity})

        ## JSON Schema:
        {
            "rules": string[],
            "assessmentStrategy": ["LINT_ONLY" | "VISUAL_CHECK" | "STRICT_TEST_PASS" | "JUDGE"],
            "enforcementLevel": "LOW" | "MEDIUM" | "HIGH"
        }
        `;

        try {
            return await this.executeJsonMode<GovernanceConfig>(modelId, prompt, "Governance");
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Governance Architect fallback.", e);
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
    async toolArchitect(modelId: string, intent: RoleIntent): Promise<string[]> {
        const prompt = `
        Select the necessary tools.
        Intent: ${intent.description}

        Available Options: ["filesystem", "terminal", "browser", "create_role_variant", "search_codebase"]

        ## JSON Schema:
        {
            "tools": string[]
        }
        `;

        try {
            const res = await this.executeJsonMode<{ tools: string[] }>(modelId, prompt, "Tool");
            return res.tools || ['filesystem', 'terminal'];
        } catch (e: unknown) {
            console.warn("[RoleFactory] ⚠️ Tool Architect fallback.", e);
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

        // Ensure it has an active variant
        if (role.variants.length === 0) {
            console.log(`[RoleFactory] 🧬 Creating missing DNA Variant for "Role Architect"...`);
            await prisma.roleVariant.create({
                data: {
                    roleId: role.id,
                    isActive: true,
                    identityConfig: {
                        personaName: 'DNA Synthesizer',
                        style: 'PROFESSIONAL_CONCISE',
                        systemPromptDraft: role.basePrompt,
                        thinkingProcess: 'CHAIN_OF_THOUGHT',
                        reflectionEnabled: true
                    } as Prisma.InputJsonValue,
                    cortexConfig: {
                        executionMode: 'JSON_STRICT',
                        contextRange: { min: 8192, max: 128000 },
                        capabilities: ['reasoning'],
                        tools: ['meta']
                    } as Prisma.InputJsonValue,
                    contextConfig: { strategy: ['EXPLORATORY'], permissions: ['ALL'] } as Prisma.InputJsonValue,
                    governanceConfig: { rules: [], assessmentStrategy: ['LINT_ONLY'], enforcementLevel: 'LOW' } as Prisma.InputJsonValue
                }
            });
            // Re-fetch to return with variant
            return await prisma.role.findUnique({ where: { id: role.id } });
        }

        return role;
    }

}

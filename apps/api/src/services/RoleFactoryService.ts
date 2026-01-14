import { RoleVariant, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ProviderManager } from './ProviderManager.js';
import { type BaseLLMProvider } from '../utils/BaseLLMProvider.js';

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
}

interface CortexConfig {
    orchestration: string;
    contextRange: { min: number; max: number };
    reflectionEnabled: boolean;
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
    async createRoleVariant(roleId: string, intent: RoleIntent): Promise<RoleVariant> {
        console.log(`[RoleFactory] 🧬 Assembling DNA for role: ${intent.name} (${intent.complexity})`);

        // 0. Get the Provider (The Architect's Brain)
        // We use the default provider for meta-tasks
        const provider = ProviderManager.getProvider('openai') || ProviderManager.getProvider('anthropic') || ProviderManager.getProvider('ollama');
        if (!provider) throw new Error("No Intelligence Provider available for Role Factory.");

        // 1. Identity Architect (LLM)
        // Defines WHO the agent is.
        const identityConfig = await this.identityArchitect(provider, intent);

        // 2. Cortex Architect (LLM)
        // Defines HOW the agent thinks (Orchestration, Context Range).
        const cortexConfig = await this.cortexArchitect(provider, intent);

        // 3. Governance Architect (LLM)
        // Defines HOW the agent is regulated (Lint, Tests).
        const governanceConfig = await this.governanceArchitect(provider, intent);

        // 4. Context Strategy (LLM)
        // Defines MEMORY access.
        const contextConfig = await this.contextArchitect(provider, intent);

        // 5. Tool Architect (LLM)
        // Determines which MCP or System tools this role needs.
        const suggestedTools = await this.toolArchitect(provider, intent);
        cortexConfig.tools = suggestedTools;

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
     * MODULE A: Identity (The Persona)
     * "Who am I?"
     */
    private async identityArchitect(provider: BaseLLMProvider, intent: RoleIntent): Promise<IdentityConfig> {
        const prompt = `
        You are the Identity Architect.
        Design a persona for a new AI Agent.
        
        Intent:
        - Name: ${intent.name}
        - Domain: ${intent.domain}
        - Description: ${intent.description}
        
        Output JSON with keys:
        - personaName: A creative codename
        - systemPromptDraft: A detailed, strict, and highly specialized system prompt (at least 5 sentences).
        - style: Communication style (e.g., "PROFESSIONAL_CONCISE", "SOCRATIC", "AGGRESSIVE_AUDITOR").
        `;

        try {
            const raw = await provider.generateCompletion({
                modelId: 'gpt-4o',
                messages: [{ role: 'system', content: 'You are a JSON generator.' }, { role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(raw) as IdentityConfig;
        } catch (e: unknown) {
            console.warn("Identity Architect failed, falling back to gene pool.", e);
            return {
                personaName: intent.name,
                systemPromptDraft: `You are ${intent.name}. ${intent.description}.`,
                style: 'PROFESSIONAL_CONCISE'
            };
        }
    }

    /**
     * MODULE B: Cortex (The Brain)
     * "How do I think?"
     */
    private async cortexArchitect(provider: BaseLLMProvider, intent: RoleIntent): Promise<CortexConfig> {
        const prompt = `
        You are the Cortex Architect.
        Determine the cognitive load and orchestration strategy.

        Intent:
        - Complexity: ${intent.complexity}
        - Domain: ${intent.domain}

        Output JSON with keys:
        - orchestration: "SOLO" or "CHAIN_OF_THOUGHT" or "MULTI_STEP_PLANNING"
        - contextRange: { min: number, max: number } (Token limits)
        - reflectionEnabled: boolean (Should it verify its own steps?)
        - capabilities: string[] (Required hardware/software features: "vision", "reasoning", "tts", "embedding", "coding")
        `;
        
        try {
            const raw = await provider.generateCompletion({
                modelId: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(raw) as CortexConfig;
        } catch (e: unknown) {
             console.warn("Cortex Architect failed, falling back to gene pool.", e);
            // Fallback heuristic
            const caps: string[] = [];
            if (intent.capabilities?.includes('vision')) caps.push('vision');
            if (intent.capabilities?.includes('reasoning')) caps.push('reasoning');

            return {
                orchestration: intent.complexity === 'HIGH' ? 'CHAIN_OF_THOUGHT' : 'SOLO',
                contextRange: { min: 4096, max: 8192 },
                reflectionEnabled: false,
                capabilities: caps,
                tools: []
            };
        }
    }

    /**
     * MODULE C: Context (The Memory)
     * "What do I remember?"
     */
    private async contextArchitect(provider: BaseLLMProvider, intent: RoleIntent): Promise<ContextConfig> {
        const prompt = `
        You are the Context Architect.
        Determine how this agent accesses information.

        Intent: ${intent.domain}

        Output JSON with keys:
        - strategy: string[] (Non-exclusive! Can select multiple: "EXPLORATORY" (Find relevant files), "VECTOR_SEARCH" (RAG semantic search), "LOCUS_FOCUS" (Active file only))
        - permissions: string[] (List of allowed paths like ["/src", "/docs"] or ["ALL"])
        
        IMPORTANT: strategy is an ARRAY. Most roles should include "EXPLORATORY" as the base strategy.
        `;

        try {
            const raw = await provider.generateCompletion({
                modelId: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(raw) as ContextConfig;
        } catch (e: unknown) {
            console.warn("Context Architect failed, falling back to gene pool.", e);
            return { strategy: ['EXPLORATORY'], permissions: ['ALL'] }; // Default to EXPLORATORY
        }
    }

    /**
     * MODULE D: Governance (The Law)
     * "How am I judged?"
     */
    private async governanceArchitect(provider: BaseLLMProvider, intent: RoleIntent): Promise<GovernanceConfig> {
         const prompt = `
        You are the Governance Architect.
        Set the rules and assessment criteria.

        Intent Domain: ${intent.domain}

        Output JSON with keys:
        - rules: string[] (e.g., "No destructive migrations", "Use arrow functions", "Always type function parameters")
        - assessmentStrategy: string[] (Non-exclusive! Can select multiple: "LINT_ONLY" (fast syntax check), "VISUAL_CHECK" (user confirmation), "STRICT_TEST_PASS" (must pass tests), "JUDGE" (use judge role), "LIBRARIAN" (code quality analysis))
        - enforcementLevel: "BLOCK_ON_FAIL" or "WARN_ONLY"
        
        IMPORTANT: assessmentStrategy is an ARRAY. Most coding roles should include at least ["LINT_ONLY"].
        `;

        try {
            const raw = await provider.generateCompletion({
                modelId: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(raw) as GovernanceConfig;
        } catch (e: unknown) {
             console.warn("Governance Architect failed, falling back to gene pool.", e);
             return {
                rules: [],
                assessmentStrategy: ['LINT_ONLY'], // Array as default
                enforcementLevel: 'WARN_ONLY'
            };
        }
    }

    /**
     * MODULE E: Tools (The Extensions)
     * "What can I do?"
     */
    private async toolArchitect(provider: BaseLLMProvider, intent: RoleIntent): Promise<string[]> {
        // 1. Get all available tools from the database (including newly synced MCP tools)
        const dbTools = await prisma.tool.findMany({
            where: { isEnabled: true },
            select: { name: true, description: true }
        });

        const toolsList = dbTools.map((t: { name: string; description: string }) => `- ${t.name}: ${t.description}`).join('\n');

        const prompt = `
        You are the Tool Architect.
        Select the most appropriate tools for this new AI Agent from the available inventory.
        
        Intent:
        - Domain: ${intent.domain}
        - Description: ${intent.description}
        - Complexity: ${intent.complexity}

        AVAILABLE TOOLS:
        ${toolsList}

        Output JSON with keys:
        - selectedTools: string[] (The names of the tools you want to assign)
        `;

        try {
            const raw = await provider.generateCompletion({
                modelId: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            const result = JSON.parse(raw) as { selectedTools: string[] };
            // Filter to make sure we only returned tools that actually exist
            const validNames = new Set(dbTools.map((t: { name: string }) => t.name));
            return result.selectedTools.filter(name => validNames.has(name));
        } catch (e: unknown) {
            console.warn("Tool Architect failed, falling back to basic tools.", e);
            // Default fallback
            return ['filesystem', 'terminal'];
        }
    }

    /**
     * Seeds the "Role Architect" agent into the DB if missing.
     * This allows the user to chat with the factory.
     */
    async ensureArchitectRole() {
        const name = "Nebula Architect";
        const existing = await prisma.role.findUnique({ where: { name } });
        if (existing) return existing;

        console.log(`[RoleFactory] 🏗️ Seeding "Nebula Architect"...`);
        
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
1. Clarify the Domain (Frontend, Backend, Research).
2. Clarify the Complexity (Low/High).
3. Ask about Special Capabilities (Vision, TTS, Embeddings) if relevant to the domain.
4. Use 'create_role_variant' to generate the role when you have enough intent.
`
            }
        });
    }
}

import { RoleVariant, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ProviderManager } from './ProviderManager.js';
import { type BaseLLMProvider } from '../utils/BaseLLMProvider.js';
import { ModelSelector } from '../orchestrator/ModelSelector.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RoleIntent {
    name: string;
    description: string;
    domain: string; // e.g., "Frontend", "Backend", "Creative"
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    capabilities?: string[]; // e.g. ['vision', 'reasoning', 'tts', 'embedding']
}

interface IdentityConfig {
    systemPromptDraft: string;              // REQUIRED
    personaName?: string;                   // OPTIONAL - defaults to role name
    style?: string;                         // OPTIONAL - defaults to PROFESSIONAL_CONCISE
    thinkingProcess?: 'SOLO' | 'CHAIN_OF_THOUGHT' | 'MULTI_STEP_PLANNING'; // OPTIONAL - defaults based on complexity
    reflectionEnabled?: boolean;            // OPTIONAL - defaults to false
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
    rules?: string[];                       // OPTIONAL - defaults to []
    assessmentStrategy?: string[];          // OPTIONAL - defaults to ['LINT_ONLY']
    enforcementLevel?: string;              // OPTIONAL - defaults to WARN_ONLY
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
        const tempDir = path.join(process.cwd(), '.temp', 'role-builder');
        await fs.mkdir(tempDir, { recursive: true });
        const fileName = `architect_${Date.now()}_${Math.random().toString(36).substring(7)}.ts`;
        const filePath = path.join(tempDir, fileName);

        // Minimal Shim for Role Building
        const SHIM = `
const __result = {};
const roleBuilder = {
    setIdentity: (config) => { Object.assign(__result, { identityConfig: config }); },
    setCortex: (config) => { Object.assign(__result, { cortexConfig: config }); },
    setContext: (config) => { Object.assign(__result, { contextConfig: config }); },
    setGovernance: (config) => { Object.assign(__result, { governanceConfig: config }); },
    setTools: (tools) => { Object.assign(__result, { tools }); }
};

try {
    ${code}
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
            // Enhanced error logging for debugging
            console.error(`[RoleFactory] ❌ Code Execution Failed`);
            console.error(`[RoleFactory] Generated code preview:\n${code.substring(0, 500)}...`);
            console.error(`[RoleFactory] Error: ${e.stderr || e.message}`);

            // Save failed code for debugging
            const debugPath = path.join(tempDir, `failed_${Date.now()}.ts`);
            await fs.writeFile(debugPath, SHIM, 'utf-8').catch(() => { });
            console.error(`[RoleFactory] Failed code saved to: ${debugPath}`);

            throw new Error(`Architect Code Execution Failed: ${e.message}`);
        } finally {
            try { await fs.unlink(filePath); } catch { }
        }
    }

    /**
     * Create a new variant of a role based on intent
     */
    async createRoleVariant(roleId: string, intent: RoleIntent): Promise<RoleVariant> {
        console.log(`\n========================================`);
        console.log(`[RoleFactory] 🧬 ROLE FACTORY SERVICE CALLED`);
        console.log(`[RoleFactory] 🧬 Assembling DNA for role: ${intent.name} (${intent.complexity})`);
        console.log(`[RoleFactory] 🧬 Description: ${intent.description}`);
        console.log(`========================================\n`);

        // 0. Get the Provider and Model (The Architect's Brain)
        // We use the ModelSelector to find the most capable model for reasoning/architecting
        const { provider, modelId } = await this.getArchitectBrain();

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

        // 5. Apply defaults for optional fields
        const finalIdentity: IdentityConfig = {
            systemPromptDraft: identityConfig.systemPromptDraft,
            personaName: identityConfig.personaName || intent.name,
            style: identityConfig.style || 'PROFESSIONAL_CONCISE',
            thinkingProcess: identityConfig.thinkingProcess || (intent.complexity === 'HIGH' ? 'CHAIN_OF_THOUGHT' : 'SOLO'),
            reflectionEnabled: identityConfig.reflectionEnabled ?? (intent.complexity === 'HIGH')
        };

        const finalGovernance: GovernanceConfig = {
            rules: governanceConfig.rules || [],
            assessmentStrategy: governanceConfig.assessmentStrategy || ['LINT_ONLY'],
            enforcementLevel: governanceConfig.enforcementLevel || 'WARN_ONLY'
        };

        // 6. Persist the DNA
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
    private async getArchitectBrain(): Promise<{ provider: BaseLLMProvider, modelId: string }> {
        const selector = new ModelSelector();

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

        const inappropriateTypes = ['whisper', 'tts', 'embedding', 'moderation', 'dall-e', 'orpheus', 'text-to-speech'];
        const excludedModels: string[] = [];
        const MAX_ATTEMPTS = 5;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                // Ask ModelSelector to pick the best model (excluding previously rejected ones)
                const bestModelId = await selector.resolveModelForRole(architectRequirements, undefined, excludedModels);

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

        for (const pid of candidateProviders) {
            const provider = ProviderManager.getProvider(pid);
            if (provider) {
                // Try to get a default model from this provider
                try {
                    const models = await provider.getModels();

                    // Filter out inappropriate models
                    const textGenModels = models.filter((m: any) => {
                        const name = (m.name?.toLowerCase() || m.id?.toLowerCase() || '');
                        return !inappropriateTypes.some(type => name.includes(type));
                    });

                    if (textGenModels.length > 0) {
                        console.log(`[RoleFactory] ✓ Fallback: Using ${pid} with model ${textGenModels[0].id}`);
                        return { provider, modelId: textGenModels[0].id };
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
    private async resolveProvider(dbModelId: string): Promise<{ provider: BaseLLMProvider, apiModelId: string }> {
        const model = await prisma.model.findUnique({ where: { id: dbModelId } });
        if (!model) throw new Error(`Model ${dbModelId} not found`);

        const provider = ProviderManager.getProvider(model.providerId);
        if (!provider) throw new Error(`Provider ${model.providerId} not initialized`);

        // Resolve API Slug
        let apiModelId = model.name;
        if (model.providerData && typeof model.providerData === 'object') {
            const data = model.providerData as any;
            if (data.id) apiModelId = data.id;
        }

        return { provider, apiModelId };
    }

    /**
     * STAGE 1: IDENTITY
     * Defines exactly WHO the agent is.
     */
    async identityArchitect(modelId: string, intent: RoleIntent): Promise<IdentityConfig> {
        console.log(`[RoleFactory] 👤 Designing Identity for ${intent.name}...`);

        const prompt = `You are the Identity Architect. Design the core persona for a new AI Role.

Input Intent:
- Name: ${intent.name}
- Description: ${intent.description}
- Domain: ${intent.domain}
- Complexity: ${intent.complexity}

## CRITICAL: OUTPUT FORMAT
You MUST output ONLY executable TypeScript code in a code block. Do NOT write explanations, markdown headers, or descriptions.

## YOUR TASK:
1. Think briefly (one line)
2. Write TypeScript code using roleBuilder.setIdentity()
3. That's it - no explanations after the code!

## INTERFACE:
\`\`\`typescript
interface IdentityConfig {
    systemPromptDraft: string;              // REQUIRED
    personaName?: string;                   // OPTIONAL
    style?: string;                         // OPTIONAL
    thinkingProcess?: string;               // OPTIONAL
    reflectionEnabled?: boolean;            // OPTIONAL
}
\`\`\`

## CORRECT OUTPUT EXAMPLE:

Thinking: Prompt improver needs systematic thinking.

\`\`\`typescript
roleBuilder.setIdentity({
    systemPromptDraft: "You are a Prompt Improver specializing in enhancing clarity and correctness.",
    personaName: "PromptPolisher",
    style: 'PROFESSIONAL_CONCISE',
    thinkingProcess: 'CHAIN_OF_THOUGHT',
    reflectionEnabled: true
});
\`\`\`

## WRONG OUTPUT (DO NOT DO THIS):
### Role Architect: Prompt Improver
#### 1. Identity Module
- **systemPromptDraft**: "..." 
(This is markdown, not code!)

Now generate ONLY the TypeScript code block for: ${intent.description}`;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        // Retry logic: Give LLM up to 3 attempts
        const MAX_RETRIES = 3;
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[RoleFactory] Attempt ${attempt}/${MAX_RETRIES}...`);

                const attemptPrompt = attempt === 1
                    ? prompt
                    : `${prompt}\n\n⚠️ PREVIOUS ATTEMPT FAILED:\n${lastError}\n\nPlease fix the error and try again. Make sure to output valid TypeScript code in a code block.`;

                const raw = await provider.generateCompletion({
                    modelId: apiModelId,
                    messages: [
                        { role: 'system', content: 'You are a TypeScript code generator. Output ONLY code in a ```typescript code block. NO markdown explanations, NO headers, NO descriptions. Just: brief thinking + code block.' },
                        { role: 'user', content: attemptPrompt }
                    ]
                });

                console.log(`[RoleFactory] 📝 Raw LLM response (first 500 chars):\n${raw.substring(0, 500)}${raw.length > 500 ? '...' : ''}`);
                console.log(`[RoleFactory] 📝 Raw response length: ${raw.length} chars`);

                // Use Nebula's proven code extraction logic
                const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\ s\S]*?)```/g;
                let match;
                const blocks: string[] = [];
                while ((match = codeBlockRegex.exec(raw)) !== null) {
                    if (match[1].trim()) blocks.push(match[1].trim());
                }

                // Join all code blocks
                let code = blocks.join("\n\n");

                console.log(`[RoleFactory] 📦 Extracted ${blocks.length} code blocks, total ${code.length} chars`);

                // Fallback: If no blocks but looks like code
                if (!code && /^(?:roleBuilder\.|const|let|var|function|class)/m.test(raw.trim())) {
                    console.log(`[RoleFactory] ✓ No code blocks found, but content looks like code - using raw response`);
                    code = raw;
                }

                if (!code) {
                    lastError = `No executable code found in response. Response preview: ${raw.substring(0, 200)}`;
                    console.warn(`[RoleFactory] ⚠️ ${lastError}`);
                    console.log(`[RoleFactory] 📄 Full raw response:\n${raw}`);
                    continue; // Try again
                }

                console.log(`[RoleFactory] ✓ Extracted ${code.length} chars of code`);

                const result = await this.executeCodeMode<IdentityConfig>(code);
                console.log(`[RoleFactory] ✅ Identity config generated successfully`);
                return result;

            } catch (e: unknown) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                lastError = errorMsg;
                console.warn(`[RoleFactory] ⚠️ Attempt ${attempt} failed: ${errorMsg}`);

                if (attempt === MAX_RETRIES) {
                    console.error(`[RoleFactory] ❌ All ${MAX_RETRIES} attempts failed. Using fallback.`);
                    break; // Exit retry loop, use fallback
                }
            }
        }

        // Fallback after all retries failed
        console.warn("[RoleFactory] ⚠️ Identity Architect failed after retries, using fallback.");
        return {
            personaName: intent.name,
            systemPromptDraft: `You are ${intent.name}. ${intent.description}.`,
            style: 'PROFESSIONAL_CONCISE',
            thinkingProcess: intent.complexity === 'HIGH' ? 'CHAIN_OF_THOUGHT' : 'SOLO',
            reflectionEnabled: intent.complexity === 'HIGH'
        };
    }

    /**
     * MODULE B: Cortex (The Brain)
     * "How do I think?"
     */
    async cortexArchitect(modelId: string, intent: RoleIntent): Promise<CortexConfig> {
        const prompt = `You are the Cortex Architect. Determine the cognitive capabilities and context needs.

Intent:
- Complexity: ${intent.complexity}
- Domain: ${intent.domain}
- Capabilities: ${JSON.stringify(intent.capabilities || [])}

## YOUR TASK:
1. Think about what cognitive capabilities this role needs
2. Set appropriate context window size
3. Write TypeScript code using roleBuilder.setCortex()

## INTERFACE:
\`\`\`typescript
interface CortexConfig {
    contextRange: { min: number, max: number }; // Token limits
    capabilities: string[];  // ["vision", "reasoning", "coding", "tts", "embedding"]
    tools: string[];         // Will be set by Tool Architect, use []
}
\`\`\`

## GUIDELINES:
- LOW complexity: 4096-8192 tokens, minimal capabilities
- MEDIUM complexity: 8192-32000 tokens, standard capabilities
- HIGH complexity: 16000-128000 tokens, reasoning + coding
- Only add "vision" for UI/image tasks
- Only add "reasoning" for complex logic/planning
- Be conservative to avoid rate limits!

## EXAMPLE:

For a "Code Reviewer" (HIGH complexity, Backend domain):

Thinking: Code review needs large context to see multiple files, reasoning for analysis, and coding capability.

\`\`\`typescript
roleBuilder.setCortex({
    contextRange: { min: 16000, max: 32000 },
    capabilities: ["reasoning", "coding"],
    tools: []
});
\`\`\`

Now generate the cortex config for the role described above.`;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'You are a TypeScript code generator. Think briefly, then output a code block. Format: ```typescript\n<code>\n```' },
                    { role: 'user', content: prompt }
                ]
            });

            // Use Nebula's proven code extraction logic
            const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
            let match;
            const blocks: string[] = [];
            while ((match = codeBlockRegex.exec(raw)) !== null) {
                if (match[1].trim()) blocks.push(match[1].trim());
            }

            let code = blocks.join("\n\n");

            // Fallback: If no blocks but looks like code
            if (!code && /^(?:roleBuilder\.|const|let|var|function|class)/m.test(raw.trim())) {
                code = raw;
            }

            return await this.executeCodeMode<CortexConfig>(code);
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
        const prompt = `You are the Context Architect. Determine how this agent accesses information.

Intent Domain: ${intent.domain}

## YOUR TASK:
1. Think about what files/context this role needs
2. Choose appropriate memory strategies
3. Write TypeScript code using roleBuilder.setContext()

## INTERFACE:
\`\`\`typescript
interface ContextConfig {
    strategy: string[];      // ["EXPLORATORY", "VECTOR_SEARCH", "LOCUS_FOCUS"]
    permissions: string[];   // ["/src", "/docs"] or ["ALL"]
}
\`\`\`

## STRATEGIES:
- EXPLORATORY: Finds relevant files (most roles need this)
- VECTOR_SEARCH: Semantic search across codebase
- LOCUS_FOCUS: Only active file (for simple tasks)

## EXAMPLE:

For a "Frontend Developer" role:

Thinking: Frontend work needs to explore component files and styles. Should have access to /src and /public.

\`\`\`typescript
roleBuilder.setContext({
    strategy: ["EXPLORATORY", "VECTOR_SEARCH"],
    permissions: ["/src", "/public", "/docs"]
});
\`\`\`

Now generate the context config for the role described above.`;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'You are a TypeScript code generator. Think briefly, then output a code block. Format: ```typescript\n<code>\n```' },
                    { role: 'user', content: prompt }
                ]
            });

            // Use Nebula's proven code extraction logic
            const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
            let match;
            const blocks: string[] = [];
            while ((match = codeBlockRegex.exec(raw)) !== null) {
                if (match[1].trim()) blocks.push(match[1].trim());
            }

            let code = blocks.join("\n\n");

            // Fallback: If no blocks but looks like code
            if (!code && /^(?:roleBuilder\.|const|let|var|function|class)/m.test(raw.trim())) {
                code = raw;
            }

            return await this.executeCodeMode<ContextConfig>(code);
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
        const prompt = `You are the Governance Architect. Set the rules and quality standards.

Intent:
- Domain: ${intent.domain}
- Complexity: ${intent.complexity}

## YOUR TASK:
1. Think about what rules this role should follow
2. Choose quality assessment strategies
3. Write TypeScript code using roleBuilder.setGovernance()
4. All fields are OPTIONAL - you can provide minimal or detailed config!

## INTERFACE:
\`\`\`typescript
interface GovernanceConfig {
    rules?: string[];                       // OPTIONAL - domain-specific constraints (defaults to [])
    assessmentStrategy?: string[];          // OPTIONAL - defaults to ['LINT_ONLY']
    enforcementLevel?: string;              // OPTIONAL - defaults to WARN_ONLY
}
\`\`\`

**Assessment options**: LINT_ONLY, VISUAL_CHECK, STRICT_TEST_PASS, JUDGE, LIBRARIAN
**Enforcement options**: BLOCK_ON_FAIL, WARN_ONLY

## EXAMPLE (minimal - for simple roles):

Thinking: Simple role, default governance is fine.

\`\`\`typescript
roleBuilder.setGovernance({});
\`\`\`

## EXAMPLE (detailed - for critical roles):

Thinking: Database work needs strict rules about migrations and data safety.

\`\`\`typescript
roleBuilder.setGovernance({
    rules: [
        "Never write destructive migrations without user confirmation",
        "Always use transactions for multi-step operations",
        "Validate data integrity before and after changes"
    ],
    assessmentStrategy: ["LINT_ONLY", "STRICT_TEST_PASS"],
    enforcementLevel: "BLOCK_ON_FAIL"
});
\`\`\`

Now generate the governance config for the role described above.`;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'You are a TypeScript code generator. Think briefly, then output a code block. Format: ```typescript\n<code>\n```' },
                    { role: 'user', content: prompt }
                ]
            });

            // Use Nebula's proven code extraction logic
            const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]*?)```/g;
            let match;
            const blocks: string[] = [];
            while ((match = codeBlockRegex.exec(raw)) !== null) {
                if (match[1].trim()) blocks.push(match[1].trim());
            }

            let code = blocks.join("\n\n");

            // Fallback: If no blocks but looks like code
            if (!code && /^(?:roleBuilder\.|const|let|var|function|class)/m.test(raw.trim())) {
                code = raw;
            }

            return await this.executeCodeMode<GovernanceConfig>(code);
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
        2. Call roleBuilder.setTools(["tool1", "tool2"]) with your list.
        `;

        const { provider, apiModelId } = await this.resolveProvider(modelId);

        try {
            const raw = await provider.generateCompletion({
                modelId: apiModelId,
                messages: [
                    { role: 'system', content: 'You are a TypeScript code generator. Think briefly, then output a code block. Format: ```typescript\n<code>\n```' },
                    { role: 'user', content: prompt }
                ]
            });


            const patterns = [
                /```(?:typescript|ts)\s*\n([\s\S]*?)```/,
                /```\s*\n([\s\S]*?)```/,
                /```([\s\S]*?)```/,
            ];

            let code = raw;
            for (const pattern of patterns) {
                const match = raw.match(pattern);
                if (match) {
                    code = match[1].trim();
                    break;
                }
            }

            const result = await this.executeCodeMode<{ tools: string[] }>(code);
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
3. Ask about Special Capabilities (Vision, Reasoning, TTS, Embeddings) if relevant to the domain.
4. Use 'create_role_variant' to generate the role when you have enough intent.
`
            }
        });
    }
}

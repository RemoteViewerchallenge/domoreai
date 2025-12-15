import { AssessmentService } from "./AssessmentService.js";
import { PromptFactory, loadRolePrompt } from "./PromptFactory.js";
import { PrismaLessonProvider } from "./PrismaLessonProvider.js";
import { Role } from "@prisma/client";

import { ProviderManager } from "./ProviderManager.js";
import { getBestModel } from "../services/modelManager.service.js";
import { type BaseLLMProvider } from "../utils/BaseLLMProvider.js";
import { ModelConfigurator } from "./ModelConfigurator.js";
import { ProviderError, CardAgentState } from "../types.js";
import { executeWithRateLimit } from '../rateLimiter.js';

import { IAgentFactory } from "../interfaces/IAgentFactory.js";
import { IAgent } from "../interfaces/IAgent.js";
import { IProviderManager } from "../interfaces/IProviderManager.js";
import { IAgentConfigRepository } from "../interfaces/IAgentConfigRepository.js";
import { PrismaAgentConfigRepository } from "../repositories/PrismaAgentConfigRepository.js";

// Configuration Constants
const DEFAULT_RETRY_SECONDS = 2;
const MAX_RETRY_WAIT = 5;
const JUDGE_MAX_TOKENS = 500;

// Type extension for Role to include metadata fields
interface ExtendedRole extends Role {
  metadata: {
    template?: any;
    memoryConfig?: any;
    orchestrationConfig?: { 
      requiresCheck: boolean; 
      judgeRoleId?: string; 
      minPassScore: number 
    };
    [key: string]: any;
  } | null;
}

// A simple wrapper ensuring the Agent has a standard .generate() interface
export class VolcanoAgent implements IAgent {
  private failedModels: string[] = []; // Track failed models, not providers

  constructor(
    private provider: BaseLLMProvider,
    private systemPrompt: string,
    private config: { apiModelId: string; temperature: number; maxTokens: number },
    private roleId: string,
    private providerManager: IProviderManager,
    private configRepo: IAgentConfigRepository,
    private orchestrationConfig?: { requiresCheck: boolean; judgeRoleId?: string; minPassScore: number }
  ) {}

  /**
   * Generates a response using the configured provider and model.
   * This utilizes the SDK's standardized BaseLLMProvider interface.
   * NOW WITH EXHAUSTIVE FALLBACK!
   */
  async generate(userGoal: string): Promise<string> {
     
    while (true) {
      try {
        console.log(`[VolcanoAgent] Generating with model: "${this.config.apiModelId}" on provider ${this.provider.id}`);
        const response = await executeWithRateLimit(this.provider, {
            modelId: this.config.apiModelId,
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: userGoal }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          });

          // --- JUDGE VERIFICATION ---
          if (this.orchestrationConfig?.requiresCheck && this.orchestrationConfig.judgeRoleId) {
            console.log(`[VolcanoAgent] Judge verification required (Judge Role: ${this.orchestrationConfig.judgeRoleId})`);
            
            try {
               const judgeRole = await this.configRepo.getRole(this.orchestrationConfig.judgeRoleId);
               if (judgeRole) {
                 const verificationPrompt = `
                 ${judgeRole.basePrompt}
                 
                 TASK: Verify the following output against the user goal.
                 
                 USER GOAL: ${userGoal}
                 
                 OUTPUT TO VERIFY:
                 ${response}
                 
                 Respond with "PASS" if it meets the criteria, or "FAIL: <reason>" if it does not.
                 `;
                 
                 // Use a new provider for judge, maybe a specific one
                 const judgeProvider = this.providerManager.getProvider(this.provider.id) ?? this.provider;

                 const verification = await executeWithRateLimit(judgeProvider, {
                   modelId: this.config.apiModelId, // Use same model for now, or find a smart one
                   messages: [{ role: 'user', content: verificationPrompt }],
                   temperature: 0.0,
                   max_tokens: JUDGE_MAX_TOKENS
                 });
                 
                 if (!verification.includes("PASS")) {
                   console.warn(`[VolcanoAgent] Judge Failed: ${verification}`);
                   await AssessmentService.recordFailure(this.roleId, this.systemPrompt, verification);
                   return `[⚠️ JUDGE FAILED: ${verification}]\n\n${response}`;
                 } else {
                   console.log(`[VolcanoAgent] Judge Passed.`);
                 }
               }
            } catch (judgeError) {
              console.error("[VolcanoAgent] Judge execution failed:", judgeError);
            }
          }

          return response;
      } catch (error) {
        const err = error as ProviderError;
        console.warn(`[VolcanoAgent] Generation failed with provider ${this.provider.id || 'unknown'}:`, err);
        
        // Track failed model (not provider - allows other models from same provider to work)
        const modelId = this.config.apiModelId;
        if (modelId) this.failedModels.push(modelId);

        // Add backoff for rate limits and server errors
        const status = err.status;
        if (status === 429 || status === 500) {
          const retryAfter = err.headers?.get?.('retry-after') || String(DEFAULT_RETRY_SECONDS);
          const waitSeconds = Math.min(parseInt(retryAfter, 10) || DEFAULT_RETRY_SECONDS, MAX_RETRY_WAIT);
          console.log(`[VolcanoAgent] Encountered ${status} error. Waiting ${waitSeconds}s before failover.`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        }

        // ATTEMPT RECOVERY
        try {
          console.log(`[VolcanoAgent] Attempting failover... Excluded models: [${this.failedModels.join(', ')}]`);
          
          // 1. Get Next Best Model (excluding failed models)
          const nextModel = await getBestModel(this.roleId, this.failedModels);
          
          if (!nextModel) {
             throw new Error("Orchestrator returned no model available.");
          }
          
          // 2. Reconfigure Agent
          // Ensure we don't pick the same failed model again
          if (this.failedModels.includes(nextModel.modelId)) {
             throw new Error(`Orchestrator returned failed model ${nextModel.modelId} despite exclusion list.`);
          }

          this.config.apiModelId = nextModel.modelId;
          this.config.temperature = nextModel.temperature || this.config.temperature;
          this.config.maxTokens = nextModel.maxTokens || this.config.maxTokens;
          
          // 3. Get New Provider
          const newProvider = this.providerManager.getProvider(nextModel.providerId);
          if (!newProvider) throw new Error(`Provider ${nextModel.providerId} not initialized.`);
          
          this.provider = newProvider;
          console.log(`[VolcanoAgent] Failover successful. Switched to: ${nextModel.providerId} / ${nextModel.modelId}`);
          
          // Loop continues and tries again with new provider...
        } catch (retryError) {
          console.error("[VolcanoAgent] Exhaustive fallback failed:", retryError);
          throw new Error(`Agent Execution Failed (Exhausted all options). Final Error: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
        }
      }
    }
  }

  public getConfig() {
      return {
          modelId: this.config.apiModelId,
          providerId: this.provider.id,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
      };
  }
}

export class AgentFactoryService implements IAgentFactory {
  constructor(
    private providerManager: IProviderManager,
    private configRepo: IAgentConfigRepository
  ) {}

  async createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
    // 1. Load Role Configuration
    const rawRole = await this.configRepo.getRole(cardConfig.roleId);
    let role: ExtendedRole | null = null;
    
    if (rawRole) {
      role = { ...rawRole, metadata: (rawRole as any).metadata || {} } as ExtendedRole;

      // Check for legacy fields or metadata fields
      const template = role.metadata?.template || (rawRole as any).template;
      if (template) {
         // Merge template properties into role
         role = { ...role, ...template, metadata: { ...role.metadata, ...template } };
      }
    }

    // Fallback to 'general_worker' if not found
    if (!role && cardConfig.roleId !== 'general_worker') {
      const rawGw = await this.configRepo.getRole('general_worker');
      if (rawGw) {
        role = { ...rawGw, metadata: (rawGw as any).metadata || {} } as ExtendedRole;
        cardConfig.roleId = 'general_worker';
      }
    }

    // If still not found, attempt to seed 'general_worker' from roles.json packaged with the repo
    if (!role) {
      try {
        // Read roles.json from the monorepo packages
        const fs = await import('fs/promises');
        const path = await import('path');
        const rolesPath = path.join(process.cwd(), 'packages', 'coc', 'agents', 'roles.json');
        const raw = await fs.readFile(rolesPath, 'utf-8');
        const list = JSON.parse(raw);
        const gw = (list || []).find((r: any) => r.id === 'general_worker');
        if (gw) {
          // Insert into DB with id 'general_worker' so future lookups resolve
          try {
            const created = await this.configRepo.createRole({
                id: gw.id,
                name: gw.name || 'General Worker',
                category: gw.category || 'Utility',
                basePrompt: gw.basePrompt || 'You are a versatile AI assistant.',
                tools: gw.tools || [],
            });
            role = { ...created, metadata: (created as any).metadata || {} } as ExtendedRole;
            cardConfig.roleId = 'general_worker';
            console.log('[AgentFactory] Seeded general_worker role from roles.json');
          } catch (createErr) {
            console.warn('[AgentFactory] Failed to seed general_worker role:', createErr);
          }
        }
      } catch (readErr) {
        // ignore if file not present or parse error
        console.warn('[AgentFactory] Could not read roles.json to seed default role:', readErr instanceof Error ? readErr.message : String(readErr));
      }
    }

    if (!role) {
      throw new Error(`Agent creation failed: Role ID ${cardConfig.roleId} not found.`);
    }

      let model: any;
      let effectiveConfig: { modelId: string; temperature?: number; maxTokens?: number } = { modelId: '' };

    // 2. Model Resolution Strategy
    if (!cardConfig.isLocked || !cardConfig.modelId) {
      // STRATEGY A: Dynamic Orchestration (Volcano-style)
      const bestModel = await getBestModel(cardConfig.roleId);

      if (!bestModel) {
        throw new Error("Orchestrator failed to select a model for this agent.");
      }

      model = bestModel.model;
      effectiveConfig = {
          modelId: bestModel.modelId,
          temperature: bestModel.temperature,
          maxTokens: bestModel.maxTokens
      };
    } else {
      // STRATEGY B: Manual/Locked
      const allModels = await this.providerManager.getAllModels();
      const modelDef = allModels.find(m => m.id === cardConfig.modelId);

      if (!modelDef) {
         // Allow fallback if model not found in provider list but might exist in DB
         console.warn(`[AgentFactory] Model '${cardConfig.modelId}' not in active provider cache. Checking DB...`);
      }

      // Fetch the Prisma Model
      const requestedModelId = modelDef?.id || cardConfig.modelId;
      const requestedProviderId = modelDef?.providerId; // Might be undefined if not in cache

      if (requestedProviderId) {
         model = await this.configRepo.getModel(requestedProviderId, requestedModelId);
      }

      // Quick Fix for "model not found" when it strictly exists in DB but not cache
      if (!model && (cardConfig.modelId)) {
           // We can't query reliably without providerId in current Repo structure,
           // but let's assume if we are here, something is wrong or we skip.
      }

      if (!modelDef && !model) {
        throw new Error(`Configuration Error: Model '${cardConfig.modelId}' is not available.`);
      }

      if (modelDef && !model) {
          // JIT Creation: Model exists in provider but not in DB. Create it now.
          console.log(`[AgentFactory] JIT Creation: Model '${cardConfig.modelId}' not found in DB. Creating...`);

          try {
              model = await this.configRepo.createModel(modelDef as any);
              console.log(`[AgentFactory] JIT Creation successful: ${model.id}`);
          } catch (createError) {
               console.error(`[AgentFactory] JIT Creation failed:`, createError);
               throw new Error(`Model '${cardConfig.modelId}' not found in database and JIT creation failed.`);
          }
      }
      
      // Found the model, now set config
      effectiveConfig = {
          modelId: model.id,
          temperature: cardConfig.temperature,
          maxTokens: cardConfig.maxTokens
      };
    }

    // 3. Configure & Validate Parameters
    const [safeParams, _adjustments] = await ModelConfigurator.configure(model, role, effectiveConfig);

    // 4. Initialize Provider
    const provider = this.providerManager.getProvider(model.providerId);
    if (!provider) {
      throw new Error(`Runtime Error: Provider '${model.providerId}' is not initialized.`);
    }

    // 5. Return the Configured Agent
    let basePrompt: string;
    
    try {
      // Use PromptFactory to assemble the prompt with memory
      const lessonProvider = new PrismaLessonProvider();
      const promptFactory = new PromptFactory(lessonProvider);

      const memoryConfig = role.metadata?.memoryConfig || (rawRole as any)?.memoryConfig;

      basePrompt = await promptFactory.build(
          role.name,
          cardConfig.userGoal || '',
          memoryConfig,
          role.tools,
          cardConfig.projectPrompt
      );
    } catch (error) {
      console.warn(`[AgentFactory] PromptFactory failed for role \"${role.name}\". Falling back to simple role prompt load.`, error);
      basePrompt = await loadRolePrompt(role.name);
    }

    const orchestrationConfig = role.metadata?.orchestrationConfig || (rawRole as any)?.orchestrationConfig;

    return new VolcanoAgent(
      provider,
      basePrompt,
      {
        apiModelId: effectiveConfig.modelId,
        temperature: safeParams.temperature ?? 0.7,
        maxTokens: safeParams.max_tokens ?? 2048
      },
      role.id,
      this.providerManager,
      this.configRepo,
      orchestrationConfig
    );
  }
}

// Facade
const defaultFactory = new AgentFactoryService(ProviderManager.getInstance(), new PrismaAgentConfigRepository());
export async function createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
  return defaultFactory.createVolcanoAgent(cardConfig);
}

import { AssessmentService } from "./AssessmentService.js";
import { PromptFactory, loadRolePrompt } from "./PromptFactory.js";
import { PrismaLessonProvider } from "./PrismaLessonProvider.js";
import { Role, Model, Prisma } from "@prisma/client";

import { ProviderManager } from "./ProviderManager.js";
import { getBestModel } from "../services/modelManager.service.js";
import { type BaseLLMProvider } from "../utils/BaseLLMProvider.js";
import { ModelConfigurator } from "./ModelConfigurator.js";
import { ProviderError, CardAgentState } from "../types.js";
import { executeWithRateLimit } from '../rateLimiter.js';
import { AgentRuntime } from './AgentRuntime.js';

import { IAgentFactory } from "../interfaces/IAgentFactory.js";
import { IAgent } from "../interfaces/IAgent.js";
import { IProviderManager } from "../interfaces/IProviderManager.js";
import { IAgentConfigRepository, RoleWithTools } from "../interfaces/IAgentConfigRepository.js";
import { PrismaAgentConfigRepository } from "../repositories/PrismaAgentConfigRepository.js";

// Configuration Constants
const DEFAULT_RETRY_SECONDS = 2;
const MAX_RETRY_WAIT = 5;
const JUDGE_MAX_TOKENS = 500;
const AGENT_MAX_ATTEMPTS = 5; // Prevent infinite loops

// Type extension for Role to include metadata fields and tools
interface ExtendedRole extends RoleWithTools {
  metadata: Prisma.JsonObject | null;
}

interface RoleMetadata extends Prisma.JsonObject {
  template?: Prisma.JsonObject;
  memoryConfig?: Prisma.JsonObject;
  orchestrationConfig?: { 
    requiresCheck: boolean; 
    judgeRoleId?: string; 
    minPassScore: number 
  };
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

  async generate(userGoal: string): Promise<string> {
    for (let attempt = 1; attempt <= AGENT_MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[VolcanoAgent] Generating with model: "${this.config.apiModelId}" on provider ${this.provider.id} (Attempt ${attempt}/${AGENT_MAX_ATTEMPTS})`);

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
                 
                 const judgeProvider = this.providerManager.getProvider(this.provider.id) ?? this.provider;

                 const verification = await executeWithRateLimit(judgeProvider, {
                   modelId: this.config.apiModelId,
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
        
        const modelId = this.config.apiModelId;
        if (modelId) this.failedModels.push(modelId);

        const status = err.status;
        if (status === 429 || status === 500) {
          const headers = err.headers as Record<string, string> | undefined;
          const retryAfter = headers?.['retry-after'] || String(DEFAULT_RETRY_SECONDS);
          const waitSeconds = Math.min(parseInt(retryAfter, 10) || DEFAULT_RETRY_SECONDS, MAX_RETRY_WAIT);
          console.log(`[VolcanoAgent] Encountered ${status} error. Waiting ${waitSeconds}s before failover.`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        }

        if (attempt === AGENT_MAX_ATTEMPTS) {
           throw new Error(`Agent Execution Failed: Max attempts (${AGENT_MAX_ATTEMPTS}) reached. Last Error: ${err.message}`);
        }

        try {
          console.log(`[VolcanoAgent] Attempting failover... Excluded models: [${this.failedModels.join(', ')}]`);
          const nextModel = await getBestModel(this.roleId, this.failedModels);
          
          if (!nextModel) throw new Error("Orchestrator returned no model available.");
          if (this.failedModels.includes(nextModel.modelId)) throw new Error(`Orchestrator returned failed model ${nextModel.modelId}.`);

          this.config.apiModelId = nextModel.modelId;
          this.config.temperature = nextModel.temperature || this.config.temperature;
          this.config.maxTokens = nextModel.maxTokens || this.config.maxTokens;
          
          const newProvider = this.providerManager.getProvider(nextModel.providerId);
          if (!newProvider) throw new Error(`Provider ${nextModel.providerId} not initialized.`);
          
          this.provider = newProvider;
          console.log(`[VolcanoAgent] Failover successful. Switched to: ${nextModel.providerId} / ${nextModel.modelId}`);
        } catch (retryError) {
          console.error("[VolcanoAgent] Exhaustive fallback failed:", retryError);
          throw new Error(`Agent Execution Failed (Exhausted all options). Final Error: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
        }
      }
    }

    throw new Error("Agent execution loop terminated unexpectedly.");
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
  private static cachedRoles: Record<string, unknown>[] | null = null;

  constructor(
    private providerManager: IProviderManager,
    private configRepo: IAgentConfigRepository
  ) {}

  async createVolcanoAgentWithTier(
    cardConfig: CardAgentState,
    tier: 'Executive' | 'Manager' | 'Worker' = 'Worker'
  ): Promise<VolcanoAgent> {
    const tierConfig = { ...cardConfig, isLocked: false };
    const bestModel = await this.getModelForTier(cardConfig.roleId, tier);
    
    if (bestModel) {
      tierConfig.modelId = bestModel.modelId;
      tierConfig.temperature = bestModel.temperature;
      tierConfig.maxTokens = bestModel.maxTokens;
      tierConfig.isLocked = true;
    }
    
    return this.createVolcanoAgent(tierConfig);
  }

  private async getModelForTier(
    _roleId: string,
    tier: 'Executive' | 'Manager' | 'Worker'
  ): Promise<{ modelId: string; providerId: string; temperature: number; maxTokens: number } | null> {
    const { prisma } = await import('../db.js');
    const tierThresholds = {
      Executive: { min: 0.01, max: 1.0 },
      Manager: { min: 0.001, max: 0.01 },
      Worker: { min: 0, max: 0.001 }
    };
    
    const threshold = tierThresholds[tier];
    
    try {
      const model = await prisma.model.findFirst({
        where: {
          isActive: true,
          costPer1k: { gte: threshold.min, lte: threshold.max },
          capabilityTags: { has: 'text' }
        },
        orderBy: [{ costPer1k: tier === 'Executive' ? 'desc' : 'asc' }],
        include: { provider: true }
      });
      
      if (!model) return null;
      
      return {
        modelId: model.id,
        providerId: model.providerId,
        temperature: tier === 'Executive' ? 0.3 : tier === 'Manager' ? 0.5 : 0.7,
        maxTokens: tier === 'Executive' ? 4096 : tier === 'Manager' ? 2048 : 1024
      };
    } catch (error) {
      console.error(`[AgentFactory] Error selecting model for tier ${tier}:`, error);
      return null;
    }
  }

  async createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
    const rawRole = await this.configRepo.getRole(cardConfig.roleId);
    let role: ExtendedRole | null = null;
    
    if (rawRole) {
      const metadata = (rawRole.metadata as unknown as RoleMetadata) || {};
      role = { ...rawRole, metadata: metadata as unknown as Prisma.JsonObject } as ExtendedRole;
      const template = metadata.template || (rawRole as Role & { template?: Prisma.JsonObject }).template;
      if (template) {
         role = { ...role, ...template, metadata: { ...metadata, ...template } as unknown as Prisma.JsonObject } as ExtendedRole;
      }
    }

    if (!role && cardConfig.roleId !== 'general_worker') {
      const rawGw = await this.configRepo.getRole('general_worker');
      if (rawGw) {
        const metadata = (rawGw.metadata as unknown as RoleMetadata) || {};
        role = { ...rawGw, metadata: metadata as unknown as Prisma.JsonObject } as ExtendedRole;
        cardConfig.roleId = 'general_worker';
      }
    }

    if (!role) {
      try {
        if (!AgentFactoryService.cachedRoles) {
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const rolesPath = path.resolve(process.cwd(), 'packages/coc/agents/roles.json');
            const raw = await fs.readFile(rolesPath, 'utf-8');
            AgentFactoryService.cachedRoles = JSON.parse(raw) as Record<string, unknown>[];
        }

        const list = AgentFactoryService.cachedRoles || [];
        const foundRole = list.find((r) => r.id === cardConfig.roleId);

        if (foundRole) {
          try {
             const toolConnections = ((foundRole.tools as string[]) || []).map(t => ({
                 tool: { connect: { name: t } }
             }));

             const created = await this.configRepo.createRole({
                id: foundRole.id as string,
                name: (foundRole.name as string) || foundRole.id as string,
                categoryString: (foundRole.category as string) || 'Utility',
                basePrompt: (foundRole.basePrompt as string) || 'Replaced by system.',
                tools: { create: toolConnections },
             });
             role = { ...created, tools: [], metadata: (created as Role & { metadata: Prisma.JsonObject }).metadata || {} } as unknown as ExtendedRole;
           } catch {
               // Ignore if exists
           }
         }

         if (!role && cardConfig.roleId !== 'general_worker') {
              const gw = list.find((r) => r.id === 'general_worker');
              if (gw) {
                   try {
                     const gwTools = ((gw.tools as string[]) || []).map(t => ({
                          tool: { connect: { name: t } }
                     }));
                     
                      await this.configRepo.createRole({
                         id: gw.id as string,
                         name: (gw.name as string) || 'General Worker',
                         categoryString: (gw.category as string) || 'Utility',
                         basePrompt: (gw.basePrompt as string) || '',
                         tools: { create: gwTools },
                     }).catch(() => {});
                     
                     const rawGw = await this.configRepo.getRole('general_worker');
                      if (rawGw) {
                         const metadata = (rawGw.metadata as unknown as RoleMetadata) || {};
                         role = { ...rawGw, metadata: metadata as unknown as Prisma.JsonObject } as unknown as ExtendedRole;
                         cardConfig.roleId = 'general_worker';
                      }
                   } catch {
                      // Ignore
                   }
              }
         }
       } catch {
         // Silently fail seeding
       }
    }

    if (!role) {
      throw new Error(`Agent creation failed: Role ID ${cardConfig.roleId} not found.`);
    }

    let model: Model | null = null;
    let effectiveConfig: { modelId: string; temperature?: number; maxTokens?: number } = { modelId: '' };

    if (!cardConfig.isLocked || !cardConfig.modelId) {
      const bestModel = await getBestModel(cardConfig.roleId);
      if (!bestModel) throw new Error("Orchestrator failed to select a model for this agent.");

      model = bestModel.model as Model;
      effectiveConfig = {
          modelId: bestModel.modelId,
          temperature: bestModel.temperature,
          maxTokens: bestModel.maxTokens
      };
    } else {
      const allModels = await this.providerManager.getAllModels();
      const modelDef = allModels.find(m => m.id === cardConfig.modelId);
      const requestedModelId = modelDef?.id || cardConfig.modelId;
      const requestedProviderId = modelDef?.providerId;

      if (requestedProviderId && requestedModelId) {
         model = await this.configRepo.getModel(requestedProviderId, requestedModelId);
      }

      if (!modelDef && !model) {
        throw new Error(`Configuration Error: Model '${cardConfig.modelId}' is not available.`);
      }

      if (modelDef && !model) {
          try {
              if (!modelDef.providerId) throw new Error(`Model definition for ${modelDef.id} is missing providerId.`);
              model = await this.configRepo.createModel({
                  id: modelDef.id,
                  providerId: modelDef.providerId,
                  name: modelDef.name,
                  costPer1k: modelDef.costPer1k,
                  isFree: modelDef.isFree,
                  contextWindow: modelDef.specs?.contextWindow,
                  hasVision: modelDef.specs?.hasVision,
                  hasReasoning: modelDef.specs?.hasReasoning,
                  hasCoding: modelDef.specs?.hasCoding,
              });
          } catch {
               throw new Error(`Model '${cardConfig.modelId}' not found in database and JIT creation failed.`);
          }
      }
      
      if (!model) throw new Error(`Model '${cardConfig.modelId}' could not be resolved.`);
      
      effectiveConfig = {
          modelId: model.id,
          temperature: cardConfig.temperature,
          maxTokens: cardConfig.maxTokens
      };
    }

    const [safeParams] = await ModelConfigurator.configure(model, role, effectiveConfig);
    const provider = this.providerManager.getProvider(model.providerId);
    if (!provider) throw new Error(`Runtime Error: Provider '${model.providerId}' is not initialized.`);

    let basePrompt: string;
    try {
      const { prisma } = await import('../db.js');
      const workspace = await prisma.workspace.findFirst({
        select: { codeRules: true, glossary: true },
      });
      
      const constitution = workspace ? {
        codeRules: workspace.codeRules || undefined,
        glossary: (workspace.glossary as Record<string, string>) || undefined,
      } : undefined;

      const lessonProvider = new PrismaLessonProvider();
      const promptFactory = new PromptFactory(lessonProvider);
      const metadata = (role.metadata as unknown as RoleMetadata) || {};
      const memoryConfig = metadata.memoryConfig || (rawRole as ExtendedRole | null)?.metadata?.memoryConfig;

      const roleTools = role.tools?.map((rt) => rt.tool?.name || rt.toolId).filter(Boolean) || [];
      const tools = cardConfig.tools || roleTools;

      basePrompt = await promptFactory.build(
          role.name,
          cardConfig.userGoal || '',
          memoryConfig as { useProjectMemory: boolean } | undefined,
          tools,
          cardConfig.projectPrompt,
          constitution
      );
    } catch {
      basePrompt = await loadRolePrompt(role.name);
    }

    const metadata = (role.metadata as unknown as RoleMetadata) || {};
    const orchestrationConfig = metadata.orchestrationConfig || (rawRole as ExtendedRole | null)?.metadata?.orchestrationConfig;

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
      orchestrationConfig as { requiresCheck: boolean; judgeRoleId?: string; minPassScore: number } | undefined
    );
  }

  async createSwarmAgent(roleId: string, rootPath: string = process.cwd()): Promise<AgentRuntime> {
    const { prisma } = await import('../db.js');
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { 
        category: true,
        tools: { include: { tool: true } }
      }
    });

    if (!role) throw new Error(`Role ${roleId} not found`);

    let finalTools: string[] = [];
    if (role.tools) {
      finalTools = role.tools.map((rt) => rt.tool?.name).filter(Boolean);
    }

    const tier = role.category?.name || role.categoryString || 'Worker';
    if (tier.includes('Worker')) {
      finalTools.push('execute_script', 'git_commit', 'read_file');
    } else if (tier.includes('Manager')) {
      finalTools.push('git_merge', 'review_diff', 'read_file');
    } else if (tier.includes('Executive')) {
      finalTools.push('read_file', 'planner');
    }
    
    finalTools = [...new Set(finalTools)];
    return AgentRuntime.create(rootPath, finalTools, tier);
  }
}

let defaultFactory: AgentFactoryService | null = null;

export async function createVolcanoAgent(cardConfig: CardAgentState): Promise<VolcanoAgent> {
  if (!defaultFactory) {
    defaultFactory = new AgentFactoryService(
      ProviderManager.getInstance(),
      new PrismaAgentConfigRepository()
    );
  }
  return defaultFactory.createVolcanoAgent(cardConfig);
}

export function getDefaultAgentFactory(): AgentFactoryService {
  if (!defaultFactory) {
    defaultFactory = new AgentFactoryService(
      ProviderManager.getInstance(),
      new PrismaAgentConfigRepository()
    );
  }
  return defaultFactory;
}

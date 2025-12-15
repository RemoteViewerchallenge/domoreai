import { IAgentConfigRepository } from "../interfaces/IAgentConfigRepository.js";
import { prisma } from "../db.js";
import { Role, Model, ModelConfig } from "@prisma/client";

export class PrismaAgentConfigRepository implements IAgentConfigRepository {
  async getRole(roleId: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  async getEffectiveRole(roleId: string): Promise<Role | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;
    return role; // Returning Role, caller handles metadata parsing if needed
  }

  async getModel(providerId: string, modelId: string): Promise<Model | null> {
    return prisma.model.findUnique({
      where: { providerId_modelId: { providerId, modelId } }
    });
  }

  async createModel(modelDef: any): Promise<Model> {
    return prisma.model.create({
      data: {
        modelId: modelDef.id,
        provider: { connect: { id: modelDef.providerId } },
        name: modelDef.name || modelDef.id,
        costPer1k: modelDef.costPer1k ?? 0,
        isFree: modelDef.isFree ?? false,
        providerData: modelDef.providerData ?? {},
        specs: {
            contextWindow: modelDef.contextWindow ?? 4096,
            hasVision: modelDef.hasVision ?? false,
            hasReasoning: modelDef.hasReasoning ?? false,
            hasCoding: modelDef.hasCoding ?? false,
            lastUpdated: new Date().toISOString()
        }
      }
    });
  }

  async getModelConfig(modelId: string, roleId: string): Promise<ModelConfig | null> {
    return prisma.modelConfig.findFirst({
      where: {
        modelId: modelId,
        roles: { some: { id: roleId } }
      }
    });
  }

  async createModelConfig(data: { modelId: string, providerId: string, roleId: string, temperature: number, maxTokens: number }): Promise<ModelConfig> {
    return prisma.modelConfig.create({
      data: {
        modelId: data.modelId,
        providerId: data.providerId,
        roles: { connect: { id: data.roleId } },
        temperature: data.temperature,
        maxTokens: data.maxTokens
      }
    });
  }

  async createRole(data: any): Promise<Role> {
      return prisma.role.create({ data });
  }
}

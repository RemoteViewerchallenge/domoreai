import { prisma } from '../db.js';

export class AgentConfigRepository {
  static async getRole(roleId: string) {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  static async getModel(providerId: string, modelId: string) {
    return prisma.model.findUnique({
      where: { providerId_modelId: { providerId, modelId } }
    });
  }

  static async createModel(modelDef: any) {
    return prisma.model.create({
      data: {
        modelId: modelDef.id,
        provider: { connect: { id: modelDef.providerId } },
        name: modelDef.name || modelDef.id,
        // Pack transient/spec fields into the specs JSON
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

  static async getModelConfig(modelId: string, roleId: string) {
    return prisma.modelConfig.findFirst({
      where: {
        modelId: modelId,
        roles: { some: { id: roleId } }
      }
    });
  }

  static async createModelConfig(data: { modelId: string, providerId: string, roleId: string, temperature: number, maxTokens: number }) {
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
}

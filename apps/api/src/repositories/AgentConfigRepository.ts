import { db } from "../db.js";

export class AgentConfigRepository {
  static async getRole(roleId: string) {
    return db.role.findUnique({ where: { id: roleId } });
  }

  static async getModel(providerId: string, modelId: string) {
    return db.model.findUnique({
      where: { providerId_modelId: { providerId, modelId } }
    });
  }

  static async createModel(modelDef: any) {
    return db.model.create({
      data: {
        modelId: modelDef.id,
        provider: { connect: { id: modelDef.providerId } },
        name: modelDef.name || modelDef.id,
        contextWindow: modelDef.contextWindow || 4096,
        costPer1k: modelDef.costPer1k || 0,
        isFree: modelDef.isFree || false,
        providerData: {}
      }
    });
  }

  static async getModelConfig(modelId: string, roleId: string) {
    return db.modelConfig.findFirst({
      where: {
        modelId: modelId,
        roles: { some: { id: roleId } }
      }
    });
  }

  static async createModelConfig(data: { modelId: string, providerId: string, roleId: string, temperature: number, maxTokens: number }) {
    return db.modelConfig.create({
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

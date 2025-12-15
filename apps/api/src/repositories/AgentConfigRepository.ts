import { prisma } from '../db.js';
import type { ModelDef } from '../interfaces/IAgentConfigRepository.js';
import type { Role, Model } from '@prisma/client';

export class AgentConfigRepository {
  static async getRole(roleId: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id: roleId } });
  }

  static async getEffectiveRole(roleId: string): Promise<Role | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;
    return role;
  }

  static async getModel(providerId: string, modelId: string): Promise<Model | null> {
    return prisma.model.findUnique({
      where: { providerId_modelId: { providerId, modelId } }
    });
  }

  static async createModel(modelDef: ModelDef): Promise<Model> {
    return prisma.model.create({
      data: {
        modelId: modelDef.id,
        provider: { connect: { id: modelDef.providerId } },
        name: modelDef.name || modelDef.id,
        // Pack transient/spec fields into the specs JSON
        costPer1k: modelDef.costPer1k ?? 0,
        isFree: modelDef.isFree ?? false,
        providerData: (modelDef.providerData ?? {}) as any,
        specs: {
            contextWindow: modelDef.contextWindow ?? 4096,
            hasVision: modelDef.hasVision ?? false,
            hasReasoning: modelDef.hasReasoning ?? false,
            hasCoding: modelDef.hasCoding ?? false,
            lastUpdated: new Date().toISOString()
        } as any
      }
    });
  }


}

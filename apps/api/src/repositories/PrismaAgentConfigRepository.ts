import { IAgentConfigRepository } from "../interfaces/IAgentConfigRepository.js";
import { prisma } from "../db.js";
import { Role, Model, Prisma } from "@prisma/client";
import type { ModelDef } from "../interfaces/IAgentConfigRepository.js";

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

  async createModel(modelDef: ModelDef): Promise<Model> {
    return prisma.model.create({
      data: {
        modelId: modelDef.id,
        provider: { connect: { id: modelDef.providerId } },
        name: modelDef.name || modelDef.id,
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



  async createRole(data: Prisma.RoleCreateInput): Promise<Role> {
      return prisma.role.create({ data });
  }
}

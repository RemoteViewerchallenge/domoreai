import { IProviderRepository } from "../interfaces/IProviderRepository.js";
import { prisma } from "../db.js";

export class ProviderRepository implements IProviderRepository {
  async findProviderConfigByLabel(label: string): Promise<any> {
    return prisma.providerConfig.findFirst({
      where: { label }
    });
  }

  async findProviderConfigById(id: string): Promise<any> {
    return prisma.providerConfig.findUnique({
      where: { id }
    });
  }

  async createProviderConfig(values: any): Promise<void> {
    // Drizzle's values might not match Prisma's exactly if types differ, but structurally should be close.
    // 'values' is likely { id, label, type, isEnabled, ... }
    await prisma.providerConfig.create({
      data: values
    });
  }

  async getEnabledProviderConfigs(): Promise<any[]> {
    return prisma.providerConfig.findMany({
      where: { isEnabled: true }
    });
  }

  async upsertModel(data: any): Promise<void> {
    // Already using Prisma, ensuring data structure compatibility
    await prisma.model.upsert(data);
  }
}

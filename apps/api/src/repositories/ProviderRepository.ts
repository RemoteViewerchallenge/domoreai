import { IProviderRepository } from "../interfaces/IProviderRepository.js";
import { db, prisma } from "../db.js";
import { providerConfigs } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class ProviderRepository implements IProviderRepository {
  async findProviderConfigByLabel(label: string): Promise<any> {
    return db.query.providerConfigs.findFirst({
      where: eq(providerConfigs.label, label)
    });
  }

  async findProviderConfigById(id: string): Promise<any> {
    return db.query.providerConfigs.findFirst({
      where: eq(providerConfigs.id, id)
    });
  }

  async createProviderConfig(values: any): Promise<void> {
    await db.insert(providerConfigs).values(values);
  }

  async getEnabledProviderConfigs(): Promise<any[]> {
    return db.select().from(providerConfigs).where(eq(providerConfigs.isEnabled, true));
  }

  async upsertModel(data: any): Promise<void> {
    await prisma.model.upsert(data);
  }
}

import { prisma } from '../db.js';

export interface SelectionCriteria {
  modelName?: string;
  groupId?: string;
  maxCost?: number;
  tableName?: string;
}

export interface SelectedModel {
  id: string;
  providerConfigId: string;
  onComplete?: (status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMIT', tokensIn: number, tokensOut: number, duration: number) => void;
}

export async function selectModel(criteria: SelectionCriteria): Promise<SelectedModel | null> {
  const models = await prisma.model.findMany({
    where: { isActive: true },
    select: { id: true, providerId: true, name: true, costPer1k: true }
  });

  if (models.length === 0) return null;

  // Simple selection: Prefer free models, then anything
  const free = models.find(m => m.costPer1k === 0);
  if (free) {
     return { id: free.id, providerConfigId: free.providerId };
  }
  
  const any = models[0];
  return { id: any.id, providerConfigId: any.providerId };
}

export async function selectCandidateModels(criteria: SelectionCriteria): Promise<any[]> {
    return [];
}

export async function loadModelCatalog(_paths: string[]): Promise<any[]> {
    return [];
}

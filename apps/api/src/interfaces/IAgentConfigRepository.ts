import { Role, Model, Prisma } from "@prisma/client";

// Definition of the model creation DTO used throughout the API
export interface ModelDef {
  id: string;
  providerId: string;
  name?: string;
  costPer1k?: number;
  isFree?: boolean;
  providerData?: Record<string, unknown>;
  contextWindow?: number;
  hasVision?: boolean;
  hasReasoning?: boolean;
  hasCoding?: boolean;
}

export interface IAgentConfigRepository {
    getRole(roleId: string): Promise<Role | null>;
    getEffectiveRole(roleId: string): Promise<Role | null>;
    getModel(providerId: string, modelId: string): Promise<Model | null>;
    createModel(modelDef: ModelDef): Promise<Model>;

    createRole(data: Prisma.RoleCreateInput): Promise<Role>;
}

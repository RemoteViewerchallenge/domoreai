import { Role, Model, ModelConfig } from "@prisma/client";

export interface IAgentConfigRepository {
    getRole(roleId: string): Promise<Role | null>;
    getEffectiveRole(roleId: string): Promise<Role | null>;
    getModel(providerId: string, modelId: string): Promise<Model | null>;
    createModel(modelDef: any): Promise<Model>;
    getModelConfig(modelId: string, roleId: string): Promise<ModelConfig | null>;
    createModelConfig(data: { modelId: string, providerId: string, roleId: string, temperature: number, maxTokens: number }): Promise<ModelConfig>;
    createRole(data: any): Promise<Role>;
}

import type { RawProviderOutput } from './modelManager.mocks.ts';
/**
 * The "Metadata Parsing" function.
 * This function is the solution to the "messy data" problem.
 * It uses the "rest" operator to catch all unknown fields.
 */
export declare function logUsage(data: RawProviderOutput): Promise<{
    id: string;
    createdAt: Date;
    modelConfigId: string;
    roleId: string;
    userId: string;
    cost: number;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    promptTokens: number | null;
    completionTokens: number | null;
} | undefined>;
/**
 * The "Brain" for model selection.
 * Finds the best, non-rate-limited model for a given role.
 */
export declare function getBestModel(roleId: string): Promise<{
    model: {
        provider: {
            name: string;
            id: string;
            createdAt: Date;
            providerType: string;
            baseURL: string;
            encryptedApiKey: string | null;
            requestsPerMinute: number | null;
        };
    } & {
        name: string;
        id: string;
        providerId: string;
        modelId: string;
        isFree: boolean;
        rateLimit: string | null;
        contextWindow: number | null;
        hasVision: boolean;
        hasReasoning: boolean;
        hasCoding: boolean;
        providerData: import("@prisma/client/runtime/library").JsonValue;
    };
} & {
    id: string;
    createdAt: Date;
    providerId: string;
    modelId: string;
    maxTokens: number | null;
    temperature: number | null;
}>;
//# sourceMappingURL=modelManager.service.d.ts.map
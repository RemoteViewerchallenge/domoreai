import type { RawProviderOutput } from './modelManager.mocks.ts';
/**
 * The "Metadata Parsing" function.
 * This function is the solution to the "messy data" problem.
 * It uses the "rest" operator to catch all unknown fields.
 */
export declare function logUsage(data: RawProviderOutput): Promise<{
    id: string;
    cost: number;
    createdAt: Date;
    modelConfigId: string;
    roleId: string;
    userId: string;
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
            id: string;
            name: string;
            baseURL: string;
            providerType: string;
            createdAt: Date;
            encryptedApiKey: string | null;
            requestsPerMinute: number | null;
        };
    } & {
        id: string;
        providerId: string;
        name: string;
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
    providerId: string;
    createdAt: Date;
    modelId: string;
    maxTokens: number | null;
    temperature: number | null;
}>;

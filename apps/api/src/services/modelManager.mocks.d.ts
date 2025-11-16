/**
 * Represents the raw, inconsistent data we get back from different providers.
 * This is the "messy" input our service must clean up.
 */
export declare const directProviderResponse: {
    modelConfigId: string;
    roleId: string;
    userId: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    cost: number;
};
export declare const freeProviderResponse: {
    modelConfigId: string;
    roleId: string;
    userId: string;
    usage: null;
    cost: number;
};
export declare const routerProviderResponse: {
    modelConfigId: string;
    roleId: string;
    userId: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
    };
    cost: number;
    router_metadata: {
        id: string;
        model_name: string;
        provider_name: string;
        latency_ms: number;
    };
};
export type RawProviderOutput = typeof directProviderResponse | typeof freeProviderResponse | typeof routerProviderResponse;

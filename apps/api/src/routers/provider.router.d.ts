export declare const providerRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    /**
     * Get all configured providers (except their API keys)
     */
    list: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("../trpc.js").Context;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: import("../trpc.js").Context;
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: object;
    }, {
        name: string;
        providerType: string;
        baseURL: string;
        id: string;
    }[]>;
    /**
     * Add a new provider configuration
     */
    add: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("../trpc.js").Context;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: import("../trpc.js").Context;
        _input_in: {
            name: string;
            providerType: string;
            baseURL: string;
            apiKey?: string | undefined;
        };
        _input_out: {
            name: string;
            providerType: string;
            baseURL: string;
            apiKey?: string | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: string;
        createdAt: Date;
        name: string;
        providerType: string;
        baseURL: string;
        encryptedApiKey: string | null;
    }>;
    /**
     * Step 1: Fetch and Normalize Models (The "Dumb Scrape")
     * Fetches models from the provider's API and upserts them into our DB.
     */
    fetchAndNormalizeModels: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: import("../trpc.js").Context;
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: import("../trpc.js").Context;
        _input_in: {
            providerId: string;
        };
        _input_out: {
            providerId: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        count: number;
    }>;
}>;

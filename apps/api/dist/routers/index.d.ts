export declare const appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: import("../trpc.js").Context;
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    git: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        log: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                vfsToken: string;
                count?: number | undefined;
            };
            _input_out: {
                vfsToken: string;
                count?: number | undefined;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, readonly (import("simple-git").DefaultLogFields & import("simple-git").ListLogLine)[]>;
        commit: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                message: string;
                vfsToken: string;
            };
            _input_out: {
                message: string;
                vfsToken: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            hash: string;
            summary: {
                changes: number;
                insertions: number;
                deletions: number;
            };
        }>;
    }>;
    vfs: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        getToken: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                workspaceId: string;
            };
            _input_out: {
                workspaceId: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            token: string;
        }>;
        listFiles: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                vfsToken: string;
                path?: string | undefined;
            };
            _input_out: {
                path: string;
                vfsToken: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            name: string;
            type: string;
        }[]>;
        readFile: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                path: string;
                vfsToken: string;
            };
            _input_out: {
                path: string;
                vfsToken: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, string>;
        writeFile: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: import("../trpc.js").Context;
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: import("../trpc.js").Context;
            _input_in: {
                path: string;
                vfsToken: string;
                content: string;
            };
            _input_out: {
                path: string;
                vfsToken: string;
                content: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            success: boolean;
        }>;
    }>;
    provider: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("../trpc.js").Context;
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
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
}>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map
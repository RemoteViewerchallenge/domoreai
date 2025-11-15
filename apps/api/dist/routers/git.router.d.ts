export declare const gitRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
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
//# sourceMappingURL=git.router.d.ts.map
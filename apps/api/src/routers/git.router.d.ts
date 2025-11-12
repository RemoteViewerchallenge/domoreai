export declare const gitRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    log: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            vfsToken: string;
            count?: number | undefined;
        };
        output: readonly (import("simple-git").DefaultLogFields & import("simple-git").ListLogLine)[];
        meta: object;
    }>;
    commit: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            vfsToken: string;
            message: string;
        };
        output: {
            hash: string;
            summary: {
                changes: number;
                insertions: number;
                deletions: number;
            };
        };
        meta: object;
    }>;
}>>;

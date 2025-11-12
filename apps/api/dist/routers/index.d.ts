export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    git: import("@trpc/server").TRPCBuiltRouter<{
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
    vfs: import("@trpc/server").TRPCBuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        getToken: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                token: any;
            };
            meta: object;
        }>;
        listFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                vfsToken: string;
            };
            output: import("./vfs.router.js").VfsFile[];
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map
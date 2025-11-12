export declare const trpc: import("@trpc/react-query").CreateTRPCReactBase<import("@trpc/server").TRPCBuiltRouter<{
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
            output: import("../../../api/dist/routers/vfs.router").VfsFile[];
            meta: object;
        }>;
    }>>;
}>>, unknown> & import("node_modules/@trpc/react-query/dist/getQueryKey.d-CruH3ncI.mjs").DecorateRouterRecord<{
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
            output: import("../../../api/dist/routers/vfs.router").VfsFile[];
            meta: object;
        }>;
    }>>;
}>>;

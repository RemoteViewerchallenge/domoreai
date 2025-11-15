export type VfsFile = {
    path: string;
    type: 'file' | 'dir';
};
export declare const vfsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
        output: VfsFile[];
        meta: object;
    }>;
}>>;

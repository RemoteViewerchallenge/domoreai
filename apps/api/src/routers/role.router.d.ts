export declare const roleRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: {
        db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
        session: null;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: typeof import("superjson").default;
}>, {
    /**
     * Get all roles from the database.
     */
    list: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                session: null;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: typeof import("superjson").default;
        }>;
        _ctx_out: {
            db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            session: null;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: object;
    }, {
        id: string;
        name: string;
        basePrompt: string;
        minContext: number | null;
        maxContext: number | null;
        needsVision: boolean;
        needsReasoning: boolean;
        needsCoding: boolean;
    }[]>;
    /**
     * Create a new role.
     */
    create: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                session: null;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: typeof import("superjson").default;
        }>;
        _meta: object;
        _ctx_out: {
            db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            session: null;
        };
        _input_in: {
            name: string;
            basePrompt: string;
            minContext?: number | undefined;
            maxContext?: number | undefined;
            needsVision?: boolean | undefined;
            needsReasoning?: boolean | undefined;
            needsCoding?: boolean | undefined;
        };
        _input_out: {
            name: string;
            basePrompt: string;
            needsVision: boolean;
            needsReasoning: boolean;
            needsCoding: boolean;
            minContext?: number | undefined;
            maxContext?: number | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: string;
        name: string;
        basePrompt: string;
        minContext: number | null;
        maxContext: number | null;
        needsVision: boolean;
        needsReasoning: boolean;
        needsCoding: boolean;
    }>;
    /**
     * Update an existing role by its ID.
     */
    update: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                session: null;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: typeof import("superjson").default;
        }>;
        _meta: object;
        _ctx_out: {
            db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            session: null;
        };
        _input_in: {
            id: string;
            name?: string | undefined;
            basePrompt?: string | undefined;
            minContext?: number | null | undefined;
            maxContext?: number | null | undefined;
            needsVision?: boolean | undefined;
            needsReasoning?: boolean | undefined;
            needsCoding?: boolean | undefined;
        };
        _input_out: {
            id: string;
            name?: string | undefined;
            basePrompt?: string | undefined;
            minContext?: number | null | undefined;
            maxContext?: number | null | undefined;
            needsVision?: boolean | undefined;
            needsReasoning?: boolean | undefined;
            needsCoding?: boolean | undefined;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: string;
        name: string;
        basePrompt: string;
        minContext: number | null;
        maxContext: number | null;
        needsVision: boolean;
        needsReasoning: boolean;
        needsCoding: boolean;
    }>;
    /**
     * Delete a role by its ID.
     */
    delete: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
                session: null;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: typeof import("superjson").default;
        }>;
        _meta: object;
        _ctx_out: {
            db: import("@prisma/client").PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
            session: null;
        };
        _input_in: {
            id: string;
        };
        _input_out: {
            id: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, {
        id: string;
        name: string;
        basePrompt: string;
        minContext: number | null;
        maxContext: number | null;
        needsVision: boolean;
        needsReasoning: boolean;
        needsCoding: boolean;
    }>;
}>;

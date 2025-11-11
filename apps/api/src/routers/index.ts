import { createTRPCRouter } from '../trpc.js';

/**
 * The main tRPC router for the application.
 * @type {ReturnType<typeof createTRPCRouter>}
 */
export const appRouter = createTRPCRouter({
});

/**
 * The type definition for the main tRPC router.
 * @type {typeof appRouter}
 */
export type AppRouter = typeof appRouter;

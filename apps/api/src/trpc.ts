import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { db } from './db.js';
import { vfsSessionService } from './services/vfsSession.service.js';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
export const createTRPCContext = (): Context => {
    // In a real app, you'd get the session from the request
    return {
        db,
        session: null as any,
        vfsSession: vfsSessionService,
        auth: undefined, // Explicitly include auth, even if undefined
    };
};

/**
 * 2. CONTEXT TYPE
 */
export interface Context {
    db: typeof db;
    session: any;
    vfsSession: typeof vfsSessionService;
    auth?: { userId: string };
}

/**
 * 3. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const t = initTRPC.context<Context>().create({ transformer: superjson, });
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(async ({ ctx, next }: { ctx: Context, next: any }) => {
  // This is a dummy middleware to force context inference
  return next({
    ctx: {
      ...ctx,
      // Ensure auth and vfsSession are present, even if undefined
      auth: ctx.auth,
      vfsSession: ctx.vfsSession,
    },
  });
});
export const protectedProcedure = t.procedure;

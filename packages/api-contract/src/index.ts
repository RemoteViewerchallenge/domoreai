// This file will be imported by *both* the api and ui.
// It must *only* contain types and shared procedures.
import { initTRPC } from '@trpc/server';
import { z } from 'zod'; // <-- We must import zod here

// 1. Initialize tRPC (this is safe to share)
const t = initTRPC.create();

// 2. Define shared procedures
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; //FIXME: Add auth check

// 3. Re-export Zod for all routers to use
export { z };

export const modelInputSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  name: z.string(),
  isFree: z.boolean(),
  contextWindow: z.number(),
  hasVision: z.boolean(),
  hasReasoning: z.boolean(),
  hasCoding: z.boolean(),
  providerData: z.any(),
});

// 4. Define the AppRouter *type*
// We will define it here, but it will be *implemented* in the api.

// --- THIS PART IS TEMPORARY ---
// For now, we'll use a simple placeholder to get the build passing.
// We will replace this in Phase 2.


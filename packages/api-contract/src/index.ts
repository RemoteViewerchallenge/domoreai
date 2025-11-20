import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// 1. Initialize tRPC
// Note: We don't define Context here to avoid circular deps with the DB
const t = initTRPC.create();

// 2. Export Reusable Parts
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;

// 3. Re-export Zod
export { z };

// 4. Shared Schemas (Single Source of Truth)
export const modelInputSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  name: z.string(),
  isFree: z.boolean(),
  contextWindow: z.number(),
  hasVision: z.boolean(),
  hasReasoning: z.boolean(),
  hasCoding: z.boolean(),
  providerData: z.record(z.unknown()), // ✅ Better than z.any()
});

export type ModelInput = z.infer<typeof modelInputSchema>;
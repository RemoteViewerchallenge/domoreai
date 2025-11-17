import { z } from 'zod';
import { appRouter } from './index.js';
export type AppRouter = typeof appRouter;

export const modelInputSchema = z.object({
  modelId: z.string(),
  name: z.string(),
  isFree: z.boolean().optional(),
  contextWindow: z.number().optional(),
  hasVision: z.boolean().optional(),
  hasReasoning: z.boolean().optional(),
  hasCoding: z.boolean().optional(),
  providerData: z.object({
    ModelPricing: z.record(z.string(), z.any()).optional(),
    ModelArchitecture: z.record(z.string(), z.any()).optional(),
  }),
  providerId: z.string(),
});

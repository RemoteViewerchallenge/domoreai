import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  basePrompt: z.string().min(1, 'Base prompt is required.'),
  minContext: z.number().int().optional(),
  maxContext: z.number().int().optional(),
  needsVision: z.boolean().default(false),
  needsReasoning: z.boolean().default(false),
  needsCoding: z.boolean().default(false),
  tools: z.array(z.string()).optional().default([]),
  defaultTemperature: z.number().min(0).max(2).optional().default(0.7),
  defaultMaxTokens: z.number().int().min(256).max(32000).optional().default(2048),
  defaultTopP: z.number().min(0).max(1).optional().default(1.0),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional().default(0.0),
  defaultPresencePenalty: z.number().min(-2).max(2).optional().default(0.0),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(['text', 'json_object']).optional(),
  terminalRestrictions: z.object({
    mode: z.enum(['whitelist', 'blacklist', 'unrestricted']),
    commands: z.array(z.string()),
  }).optional(),
});

const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required.').optional(),
  basePrompt: z.string().min(1, 'Base prompt is required.').optional(),
  minContext: z.number().int().optional().nullable(),
  maxContext: z.number().int().optional().nullable(),
  needsVision: z.boolean().optional(),
  needsReasoning: z.boolean().optional(),
  needsCoding: z.boolean().optional(),
  tools: z.array(z.string()).optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  defaultMaxTokens: z.number().int().min(256).max(32000).optional(),
  defaultTopP: z.number().min(0).max(1).optional(),
  defaultFrequencyPenalty: z.number().min(-2).max(2).optional(),
  defaultPresencePenalty: z.number().min(-2).max(2).optional(),
  defaultStop: z.array(z.string()).optional(),
  defaultSeed: z.number().int().optional(),
  defaultResponseFormat: z.enum(['text', 'json_object']).optional(),
  terminalRestrictions: z.object({
    mode: z.enum(['whitelist', 'blacklist', 'unrestricted']),
    commands: z.array(z.string()),
  }).optional(),
});

export const roleRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    // TODO: Implement role storage in JSON DB
    return [];
  }),

  create: publicProcedure
    .input(createRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement role creation
      throw new Error("Role creation not yet implemented");
    }),

  update: publicProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement role update
      throw new Error("Role update not yet implemented");
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement role deletion
      throw new Error("Role deletion not yet implemented");
    }),
});

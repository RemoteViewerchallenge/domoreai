import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { db } from '../db.js';

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
  list: publicProcedure.query(async () => {
    // Fetch all roles from the database
    const roles = await db.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    
    // Return roles, or a default role if none exist (prevents UI crash)
    return roles.length > 0 
      ? roles 
      : [
          {
            id: 'default',
            name: 'General Assistant',
            basePrompt: 'You are a helpful AI assistant.',
            minContext: null,
            maxContext: null,
            needsVision: false,
            needsReasoning: false,
            needsCoding: false,
            defaultTemperature: 0.7,
            defaultMaxTokens: 2048,
            defaultTopP: 1.0,
            defaultFrequencyPenalty: 0.0,
            defaultPresencePenalty: 0.0,
            defaultStop: null,
            defaultSeed: null,
            defaultResponseFormat: null,
            terminalRestrictions: null,
          },
        ];
  }),

  create: publicProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      // Create a new role in the database
      const role = await db.role.create({
        data: {
          name: input.name,
          basePrompt: input.basePrompt,
          minContext: input.minContext,
          maxContext: input.maxContext,
          needsVision: input.needsVision,
          needsReasoning: input.needsReasoning,
          needsCoding: input.needsCoding,
          defaultTemperature: input.defaultTemperature,
          defaultMaxTokens: input.defaultMaxTokens,
          defaultTopP: input.defaultTopP,
          defaultFrequencyPenalty: input.defaultFrequencyPenalty,
          defaultPresencePenalty: input.defaultPresencePenalty,
          defaultStop: input.defaultStop,
          defaultSeed: input.defaultSeed,
          defaultResponseFormat: input.defaultResponseFormat,
          terminalRestrictions: input.terminalRestrictions,
        },
      });
      return role;
    }),

  update: publicProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      
      // Update the role in the database
      const role = await db.role.update({
        where: { id },
        data,
      });
      return role;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Delete the role from the database
      await db.role.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});

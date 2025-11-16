import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

/**
 * Zod schema for creating a new Role.
 * Ensures that the name and basePrompt are provided.
 */
const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  basePrompt: z.string().min(1, 'Base prompt is required.'),
  minContext: z.number().int().optional(),
  maxContext: z.number().int().optional(),
  needsVision: z.boolean().default(false),
  needsReasoning: z.boolean().default(false),
  needsCoding: z.boolean().default(false),
});

/**
 * Zod schema for updating an existing Role.
 * All fields are optional, allowing for partial updates.
 */
const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required.').optional(),
  basePrompt: z.string().min(1, 'Base prompt is required.').optional(),
  minContext: z.number().int().optional().nullable(),
  maxContext: z.number().int().optional().nullable(),
  needsVision: z.boolean().optional(),
  needsReasoning: z.boolean().optional(),
  needsCoding: z.boolean().optional(),
});

export const roleRouter = createTRPCRouter({
  /**
   * Get all roles from the database.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }),

  /**
   * Create a new role.
   */
  create: publicProcedure
    .input(createRoleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.role.create({
        data: input,
      });
    }),

  /**
   * Update an existing role by its ID.
   */
  update: publicProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.role.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a role by its ID.
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.role.delete({ where: { id: input.id } });
    }),
});
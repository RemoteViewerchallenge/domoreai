import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

/**
 * Card Router - Manages card-specific configuration including custom buttons and role assignments
 */
export const cardRouter = createTRPCRouter({
  
  // Get card configuration
  getConfig: publicProcedure
    .input(z.object({ 
      cardId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const config = await ctx.prisma.cardConfig.findUnique({
          where: { cardId: input.cardId },
          include: {
            customButtons: true,
            componentRoles: true
          }
        });
        
        return config || {
          cardId: input.cardId,
          customButtons: [],
          componentRoles: []
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get card config',
        });
      }
    }),

  // Save custom button
  saveButton: publicProcedure
    .input(z.object({
      cardId: z.string(),
      buttonId: z.string().optional(),
      label: z.string(),
      action: z.enum(['command', 'url', 'agent']),
      actionData: z.string(),
      icon: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Ensure card config exists
        await ctx.prisma.cardConfig.upsert({
          where: { cardId: input.cardId },
          create: { cardId: input.cardId },
          update: {}
        });

        const button = await ctx.prisma.customButton.upsert({
          where: { 
            id: input.buttonId || `btn-${Date.now()}`
          },
          create: {
            id: input.buttonId || `btn-${Date.now()}`,
            cardId: input.cardId,
            label: input.label,
            action: input.action,
            actionData: input.actionData,
            icon: input.icon,
            // color: input.color,
          },
          update: {
            label: input.label,
            action: input.action,
            actionData: input.actionData,
            icon: input.icon,
            // color: input.color,
          }
        });

        return button;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save button',
        });
      }
    }),

  // Delete custom button
  deleteButton: publicProcedure
    .input(z.object({
      buttonId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.prisma.customButton.delete({
          where: { id: input.buttonId }
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete button',
        });
      }
    }),

  // Assign role to component
  assignComponentRole: publicProcedure
    .input(z.object({
      cardId: z.string(),
      component: z.enum(['terminal', 'fileSystem', 'monacoEditor', 'tiptapEditor', 'browser']),
      roleId: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Ensure card config exists
        await ctx.prisma.cardConfig.upsert({
          where: { cardId: input.cardId },
          create: { cardId: input.cardId },
          update: {}
        });

        if (input.roleId === null) {
          // Remove assignment
          await ctx.prisma.componentRole.deleteMany({
            where: {
              cardId: input.cardId,
              component: input.component
            }
          });
          return { success: true };
        }

        // Remove existing assignment first (simulation of upsert without unique index)
        await ctx.prisma.componentRole.deleteMany({
          where: {
            cardId: input.cardId,
            component: input.component
          }
        });

        const assignment = await ctx.prisma.componentRole.create({
          data: {
            cardId: input.cardId,
            component: input.component,
            roleId: input.roleId
          }
        });

        return assignment;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign role',
        });
      }
    }),
});
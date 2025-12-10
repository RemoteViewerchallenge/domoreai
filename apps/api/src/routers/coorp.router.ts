import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';

/**
 * COORP Router - handles CRUD operations for COORP nodes and edges
 */
export const coorpRouter = createTRPCRouter({
  // Node operations
  listNodes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.coorpNode.findMany({
      include: {
        sourceEdges: true,
        targetEdges: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }),

  getNode: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.coorpNode.findUnique({
        where: { id: input.id },
        include: {
          sourceEdges: true,
          targetEdges: true,
        },
      });
    }),

  createNode: publicProcedure
    .input(
      z.object({
        label: z.string(),
        x: z.number().default(0),
        y: z.number().default(0),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.coorpNode.create({
        data: {
          label: input.label,
          x: input.x,
          y: input.y,
          data: input.data || {},
        },
      });
    }),

  updateNode: publicProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.coorpNode.update({
        where: { id },
        data,
      });
    }),

  deleteNode: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.coorpNode.delete({
        where: { id: input.id },
      });
    }),

  // Edge operations
  listEdges: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.coorpEdge.findMany({
      include: {
        source: true,
        target: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }),

  createEdge: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
        label: z.string().optional(),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.coorpEdge.create({
        data: {
          sourceId: input.sourceId,
          targetId: input.targetId,
          label: input.label,
          data: input.data || {},
        },
      });
    }),

  deleteEdge: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.coorpEdge.delete({
        where: { id: input.id },
      });
    }),
});

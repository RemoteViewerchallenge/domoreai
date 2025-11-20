import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// ✅ Import strictly from local trpc.js to preserve Context types
import { createTRPCRouter, publicProcedure } from '../trpc.js';
// ✅ Import the service (and Type if needed)
import { vfsSessionService } from '../services/vfsSession.service.js';

export const vfsRouter = createTRPCRouter({
  // 1. Create Session
  createSession: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // ctx.vfsSession is now typed correctly!
      const session = await ctx.vfsSession.createSession(input.userId);
      return session;
    }),

  // 2. List Files
  listFiles: publicProcedure
    .input(z.object({ path: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Ensure we have a session (simplified check)
      // In a real app, use protectedProcedure to guarantee auth
      if (!ctx.auth?.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        const files = await ctx.vfsSession.listFiles(ctx.auth.userId, input.path || '/');
        return files;
      } catch (error) {
         throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'File system error',
        });
      }
    }),

  // 3. Read File
  readFile: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      try {
        const content = await ctx.vfsSession.readFile(ctx.auth.userId, input.path);
        return { content };
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: error instanceof Error ? error.message : 'File not found',
        });
      }
    }),

  // 4. Write File
  writeFile: publicProcedure
    .input(z.object({ path: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      try {
        await ctx.vfsSession.writeFile(ctx.auth.userId, input.path, input.content);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Write failed',
        });
      }
    }),
});
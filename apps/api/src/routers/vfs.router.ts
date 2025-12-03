import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { vfsSessionService } from '../services/vfsSession.service.js';

export const vfsRouter = createTRPCRouter({
  
  // 1. Navigation (Local & Remote)
  list: publicProcedure
    .input(z.object({ 
      cardId: z.string().optional(), 
      path: z.string().optional().default('.'), 
      provider: z.enum(['local', 'ssh']).default('local'),
      connectionId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
       try {
         const provider = await ctx.vfsSession.getProvider({
            cardId: input.cardId,
            provider: input.provider,
            connectionId: input.connectionId
         });
         return await provider.list(input.path);
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'VFS Error',
         });
       }
    }),

  // 2. Mutation: Create Directory
  mkdir: publicProcedure
    .input(z.object({ 
      path: z.string(), 
      cardId: z.string().optional(),
      provider: z.enum(['local', 'ssh']).default('local'),
      connectionId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
         const provider = await ctx.vfsSession.getProvider({
            cardId: input.cardId,
            provider: input.provider,
            connectionId: input.connectionId
         });
         await provider.mkdir(input.path);
         return { success: true };
      } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'VFS Error',
         });
      }
    }),

  // 3. Mutation: SSH Connection
  connectSsh: publicProcedure
    .input(z.object({ 
      host: z.string(), 
      username: z.string(), 
      privateKey: z.string().optional(),
      password: z.string().optional(),
      port: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
       try {
         const connectionId = await ctx.vfsSession.createSshConnection(input);
         return { connectionId };
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'SSH Connection Failed',
         });
       }
    }),

  // 4. File Transfer (Local <-> Remote)
  transferFile: publicProcedure
    .input(z.object({
      sourcePath: z.string(),
      destPath: z.string(),
      direction: z.enum(['upload', 'download']),
      connectionId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
       try {
         // Determine local and remote paths based on direction
         const localPath = input.direction === 'upload' ? input.sourcePath : input.destPath;
         const remotePath = input.direction === 'upload' ? input.destPath : input.sourcePath;
         
         await ctx.vfsSession.transferFile(input.connectionId, input.direction, localPath, remotePath);
         return { success: true };
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'Transfer Failed',
         });
       }
    }),

    // Basic Read
    read: publicProcedure
    .input(z.object({ 
      path: z.string(), 
      cardId: z.string().optional(),
      provider: z.enum(['local', 'ssh']).default('local'),
      connectionId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
       try {
         const provider = await ctx.vfsSession.getProvider({
            cardId: input.cardId,
            provider: input.provider,
            connectionId: input.connectionId
         });
         const content = await provider.read(input.path);
         return { content };
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'Read Failed',
         });
       }
    }),

    // Basic Write
    write: publicProcedure
    .input(z.object({ 
      path: z.string(), 
      content: z.string(),
      cardId: z.string().optional(),
      provider: z.enum(['local', 'ssh']).default('local'),
      connectionId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
       try {
         const provider = await ctx.vfsSession.getProvider({
            cardId: input.cardId,
            provider: input.provider,
            connectionId: input.connectionId
         });
         await provider.write(input.path, input.content);
         return { success: true };
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'Write Failed',
         });
       }
    }),
    
    // 5. Ingest Directory
    ingestDirectory: publicProcedure
    .input(z.object({ 
      path: z.string(), 
      cardId: z.string().optional(),
      provider: z.enum(['local', 'ssh']).default('local'),
      connectionId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
       try {
         // Currently only supporting local ingestion for simplicity, but we could expand
         // For now, we'll just use the path directly if it's local
         if (input.provider !== 'local') {
            throw new Error('Remote ingestion not yet supported');
         }
         
         // Import here to avoid circular deps if any, or just standard import
         const { ingestionAgent } = await import('../services/IngestionAgent.js');
         
         // Trigger ingestion in background? Or await? 
         // User probably wants to know when it starts, but maybe not wait for whole thing?
         // Let's await for now so we can catch immediate errors
         await ingestionAgent.ingestRepository(input.path);
         
         return { success: true };
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
           message: error instanceof Error ? error.message : 'Ingestion Failed',
         });
       }
    }),
});
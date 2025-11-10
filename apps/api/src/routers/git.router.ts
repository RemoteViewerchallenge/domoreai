import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { GitService } from '../services/git.service';
import { VfsSessionService } from '../services/vfsSession.service';

/**
 * This is the tRPC router for the GitService.
 * It exposes the gitLog and gitCommit methods to the client.
 */

// In your main context/DI setup:
const vfsSessionService = new VfsSessionService();
const gitService = new GitService(vfsSessionService);

export const gitRouter = createTRPCRouter({
  log: protectedProcedure
    .input(z.object({ vfsToken: z.string(), count: z.number().optional() }))
    .query(({ input }) => {
      return gitService.gitLog(input.vfsToken, input.count);
    }),
  commit: protectedProcedure
    .input(z.object({ vfsToken: z.string(), message: z.string() }))
    .mutation(({ input }) => {
      return gitService.gitCommit(input.vfsToken, input.message);
    }),
});

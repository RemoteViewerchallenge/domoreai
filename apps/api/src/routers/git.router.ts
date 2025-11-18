import { createTRPCRouter, protectedProcedure, z } from '@repo/api-contract';
import { GitService } from '../services/git.service.js';
import { vfsSessionService } from '../services/vfsSession.service.js';

const logInputSchema = z.object({ vfsToken: z.string(), count: z.number().optional() });
const commitInputSchema = z.object({ vfsToken: z.string(), message: z.string() });

// In your main context/DI setup:
const gitService = new GitService(vfsSessionService);

export const gitRouter = createTRPCRouter({
  log: protectedProcedure
    .input(logInputSchema)
    .query(({ input }) => {
      return gitService.gitLog(input.vfsToken, input.count);
    }),
  commit: protectedProcedure
    .input(commitInputSchema)
    .mutation(({ input }) => {
      return gitService.gitCommit(input.vfsToken, input.message);
    }),
});

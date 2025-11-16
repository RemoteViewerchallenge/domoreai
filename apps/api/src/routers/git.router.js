import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { GitService } from '../services/git.service.js';
// import { getVfsForWorkspace } from '../services/vfsService.js';
const logInputSchema = z.object({ vfsToken: z.string(), count: z.number().optional() });
const commitInputSchema = z.object({ vfsToken: z.string(), message: z.string() });
// In your main context/DI setup:
const gitService = new GitService();
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

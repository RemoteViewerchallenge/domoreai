import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";
import { GitService } from "../services/git.service.js";
import { VfsSessionService } from "../services/vfsSession.service.js";

const vfsSessionService = new VfsSessionService();

export const gitRouter = router({
  getRepo: protectedProcedure
    .input(z.object({ repoUrl: z.string(), vfsToken: z.string() }))
    .mutation(async ({ input }: { input: { repoUrl: string, vfsToken: string } }) => {
      const gitService = new GitService(vfsSessionService);
      // This is a placeholder for the actual clone operation
      // const repo = await gitService.clone(input.repoUrl, vfs);
      return { success: true };
    }),
  getBranches: protectedProcedure
    .input(z.object({ vfsToken: z.string() }))
    .query(async ({ input }: { input: { vfsToken: string } }) => {
      const gitService = new GitService(vfsSessionService);
      const branches = await gitService.gitLog(input.vfsToken);
      return branches;
  }),
  gitCommit: protectedProcedure
    .input(z.object({ vfsToken: z.string(), message: z.string() }))
    .mutation(async ({ input }: { input: { vfsToken: string, message: string } }) => {
      const gitService = new GitService(vfsSessionService);
      const commit = await gitService.gitCommit(input.vfsToken, input.message);
      return commit;
    }),
});

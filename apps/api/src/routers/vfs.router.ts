import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { VfsSessionService } from '../services/vfsSession.service';
import { TRPCError } from '@trpc/server';
import path from 'path';

export type VfsFile = {
  path: string;
  type: 'file' | 'dir';
};

// This assumes vfsSessionService is correctly instantiated in your context (ctx)
// If not, you must instantiate it: const vfsSessionService = new VfsSessionService();

export const vfsRouter = createTRPCRouter({
  getToken: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vfsRootPath = `user-${ctx.auth.userId}/${input.workspaceId}`;
      // FIX: Called the correct function
      const token = ctx.vfsSession.generateToken({
        userId: ctx.auth.userId,
        vfsRootPath: vfsRootPath,
      });
      return { token };
    }),

  getTree: protectedProcedure
    .input(z.object({ vfsToken: z.string() }))
    .query(async ({ ctx, input }): Promise<VfsFile[]> => {
      // FIX: Called the correct function
      const vfs = await ctx.vfsSession.getScopedVfs(input.vfsToken);
      if (!vfs) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid VFS Token' });
      }

      const readDirRecursive = async (dirPath: string): Promise<VfsFile[]> => {
        let entries: VfsFile[] = [];
        const fileNames = await vfs.readdir(dirPath);

        for (const name of fileNames) {
          const fullPath = path.join(dirPath, name.toString());
          const stat = await vfs.stat(fullPath);

          if (stat.isDirectory()) {
            entries.push({ path: fullPath, type: 'dir' });
            const subEntries = await readDirRecursive(fullPath);
            entries = entries.concat(subEntries);
          } else if (stat.isFile()) {
            entries.push({ path: fullPath, type: 'file' });
          }
        }
        return entries;
      };

      return await readDirRecursive('.');
    }),

  // Add other procedures (readFile, writeFile) here, using the same
  // pattern of calling `ctx.vfsSession.getScopedVfs(input.vfsToken)` first.
});

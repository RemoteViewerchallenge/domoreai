import { createTRPCRouter, publicProcedure, z } from '@repo/api-contract';
import { VfsSessionService, vfsSessionService } from '../services/vfsSession.service.js';
import { TRPCError } from '@trpc/server';
import path from 'path';

export type VfsFile = {
  path: string;
  type: 'file' | 'dir';
};

const getVfsOrThrow = (ctx: { vfsSession?: VfsSessionService }, token: string) => {
  if (!ctx.vfsSession) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'VFS service not available' });
  }
  const vfs = ctx.vfsSession.getScopedVfs(token);
  if (!vfs) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid VFS Token' });
  }
  return vfs;
};

export const vfsRouter = createTRPCRouter({
  /**
   * Generates a VFS token.
   * Assumes you have auth middleware setting ctx.auth
   */
  getToken: publicProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId || 'simulated-user';
      const vfsRootPath = `workspaces/${userId}/${input.workspaceId}`;

      if (!ctx.vfsSession) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'VFS service not available' });
      }
      const token = await ctx.vfsSession.generateToken(userId, vfsRootPath);
      return { token };
    }),

  /**
   * Gets the full file tree for a given VFS token.
   */
  getTree: publicProcedure
    .input(z.object({ vfsToken: z.string() }))
    .query(async ({ ctx, input }): Promise<VfsFile[]> => {
      const vfs = getVfsOrThrow(ctx, input.vfsToken);

      const readDirRecursive = async (dirPath: string): Promise<VfsFile[]> => {
        let entries: VfsFile[] = [];
        const fileNames = await vfs.promises.readdir(dirPath) as string[];

        for (const name of fileNames) {
          const fullPath = path.join(dirPath, name);
          // Use a try-catch block for safety, e.g., for broken symlinks
          try {
            const stat = await vfs.promises.stat(fullPath);
            if (stat.isDirectory()) {
              entries.push({ path: fullPath, type: 'dir' });
              const subEntries = await readDirRecursive(fullPath);
              entries = entries.concat(subEntries);
            } else if (stat.isFile()) {
              entries.push({ path: fullPath, type: 'file' });
            }
          } catch (e: any) {
             console.error(`Failed to stat file ${fullPath}: ${e.message}`);
          }
        }
        return entries;
      };

      return await readDirRecursive('.');
    }),

  /**
   * Reads the content of a single file.
   */
  readFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ ctx, input }) => {
      const vfs = getVfsOrThrow(ctx, input.vfsToken);
      try {
        const content = await vfs.promises.readFile(input.path, 'utf-8');
        return { content };
      } catch (e: any) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found.' });
      }
    }),

  /**
   * Writes content to a single file.
   */
  writeFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vfs = getVfsOrThrow(ctx, input.vfsToken);
      try {
        // Ensure directory exists
        const dir = path.dirname(input.path);
        await vfs.promises.mkdir(dir, { recursive: true });
        // Write the file
        await vfs.promises.writeFile(input.path, input.content, { encoding: 'utf-8' });
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
      }
    }),
    
  /**
   * NEW: Moves a file or directory.
   */
  moveFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), from: z.string(), to: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vfs = getVfsOrThrow(ctx, input.vfsToken);
      try {
        // Ensure destination directory exists
        const dir = path.dirname(input.to);
        await vfs.promises.mkdir(dir, { recursive: true });
        // Use vfs.rename (which is the memfs equivalent of move)
        await vfs.promises.rename(input.from, input.to);
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
      }
    }),

  /**
   * NEW: Copies a file or directory.
   */
  copyFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), from: z.string(), to: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vfs = getVfsOrThrow(ctx, input.vfsToken);
      try {
        // Ensure destination directory exists
        const dir = path.dirname(input.to);
        await vfs.promises.mkdir(dir, { recursive: true });
        // Use vfs.copyFile
        await vfs.promises.copyFile(input.from, input.to);
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
      }
    }),
});

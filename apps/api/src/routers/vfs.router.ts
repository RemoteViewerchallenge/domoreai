import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { vfsSessionService } from '../services/vfsSession.service.js';
import { resolve, join } from 'path';
import type { Dirent } from 'fs';

// This function will get the vfsRootPath from a token.
// In a real app, this would involve token validation and DB lookup.
const getVfsRootFromToken = (token: string): string => {
  // For now, we'll use the token directly as the root path.
  // This simulates different users/workspaces having different root dirs.
  return `/${token}`;
};

// Helper to sanitize paths and prevent directory traversal
const getScopedPath = (vfsRoot: string, userPath: string): string => {
  const resolvedPath = resolve(vfsRoot, userPath);
  if (!resolvedPath.startsWith(vfsRoot)) {
    throw new Error('Access Denied: Invalid path');
  }
  return resolvedPath;
};

export const vfsRouter = createTRPCRouter({
  getTree: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string().default('/') }))
    .query(async ({ input }) => {
      const vfsRoot = getVfsRootFromToken(input.vfsToken);
      const fs = vfsSessionService.getFs();
      const safePath = getScopedPath(vfsRoot, input.path);

      const entries = (await fs.promises.readdir(safePath, { withFileTypes: true })) as Dirent[];

      return entries.map((entry: Dirent) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));
    }),

  readFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ input }) => {
      const vfsRoot = getVfsRootFromToken(input.vfsToken);
      const fs = vfsSessionService.getFs();
      const safePath = getScopedPath(vfsRoot, input.path);
      return (await fs.promises.readFile(safePath, 'utf-8')) as string;
    }),

  writeFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string(), content: z.string() }))
    .mutation(async ({ input }) => {
      const vfsRoot = getVfsRootFromToken(input.vfsToken);
      const fs = vfsSessionService.getFs();
      const safePath = getScopedPath(vfsRoot, input.path);
      await fs.promises.writeFile(safePath, input.content);
      return { success: true };
    }),

  moveFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), from: z.string(), to: z.string() }))
    .mutation(async ({ input }) => {
      const vfsRoot = getVfsRootFromToken(input.vfsToken);
      const fs = vfsSessionService.getFs();
      const fromPath = getScopedPath(vfsRoot, input.from);
      const toPath = getScopedPath(vfsRoot, input.to);
      await fs.promises.rename(fromPath, toPath);
      return { success: true };
    }),

  copyFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), from: z.string(), to: z.string() }))
    .mutation(async ({ input }) => {
      const vfsRoot = getVfsRootFromToken(input.vfsToken);
      const fs = vfsSessionService.getFs();
      const fromPath = getScopedPath(vfsRoot, input.from);
      const toPath = getScopedPath(vfsRoot, input.to);
      await fs.promises.copyFile(fromPath, toPath);
      return { success: true };
    }),
});

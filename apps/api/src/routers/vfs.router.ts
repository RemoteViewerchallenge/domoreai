import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { vfsSessionService } from '../services/vfsSession.service.js';
import { resolve } from 'path';
import type { Dirent } from 'fs';

// Helper to sanitize paths and prevent directory traversal
const getSanitizedPath = (userPath: string): string => {
  const root = '/'; // The root of our virtual volume
  const resolvedPath = resolve(root, userPath);

  // Security Check: Ensure path doesn't escape the root
  if (!resolvedPath.startsWith(root)) {
    throw new Error('Access Denied: Invalid path');
  }
  return resolvedPath;
};

export const vfsRouter = createTRPCRouter({
  getToken: publicProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(({ input }) => {
      // This creates a short-lived, secure token for the VFS.
      const token = vfsSessionService.createSession(input.workspaceId);
      return { token };
    }),

  /**
   * List files and directories
   */
  listFiles: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ input }) => {
      const workspaceFs = vfsSessionService.getScopedVfs(input.vfsToken);
      if (!workspaceFs) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired VFS token' });

      const safePath = getSanitizedPath(input.path);

      const entries = (await workspaceFs.readdir(safePath, { withFileTypes: true })) as Dirent[];

      // Map to the format your VfsViewer component expects
      return entries.map((entry: Dirent) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));
    }),

  /**
   * Read the content of a file
   */
  readFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ input }) => {
      const workspaceFs = vfsSessionService.getScopedVfs(input.vfsToken);
      if (!workspaceFs) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired VFS token' });

      const safePath = getSanitizedPath(input.path);

      const content = await workspaceFs.readFile(safePath, 'utf-8');
      return content as string;
    }),

  /**
   * Write content to a file
   */
  writeFile: publicProcedure
    .input(z.object({
      vfsToken: z.string(),
      path: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const workspaceFs = vfsSessionService.getScopedVfs(input.vfsToken);
      if (!workspaceFs) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired VFS token' });

      const safePath = getSanitizedPath(input.path);

      await workspaceFs.writeFile(safePath, input.content);
      return { success: true };
    }),

  // Add other procedures as needed (mkdir, rm, rename, etc.)
  // ...
});
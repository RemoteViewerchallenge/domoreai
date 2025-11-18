import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { vfsSessionService } from '../services/vfsSession.service.js';
import { resolve, join } from 'path';
import type { Dirent } from 'fs';

// Helper to get the root path for a given workspace
const getWorkspaceRoot = (workspaceId: string): string => {
  // A real implementation would have a more robust mapping.
  // For now, we'll use a simple convention.
  return join('/', `workspaces/${workspaceId}`);
};


// Helper to sanitize paths and prevent directory traversal
const getSanitizedPath = (workspaceRoot: string, userPath: string): string => {
  const resolvedPath = resolve(workspaceRoot, userPath);

  // Security Check: Ensure path doesn't escape the workspace root
  if (!resolvedPath.startsWith(workspaceRoot)) {
    throw new Error('Access Denied: Invalid path');
  }
  return resolvedPath;
};

export const vfsRouter = createTRPCRouter({
  // Note: getToken is now just a placeholder and doesn't create a real session.
  // This can be adapted for real auth later.
  getToken: publicProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(({ input }) => {
      // In a real app, you'd generate a JWT or session token here.
      // For now, we'll just pass the workspaceId back as a "token".
      return { token: input.workspaceId };
    }),

  /**
   * List files and directories
   */
  listFiles: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ input }) => {
      const workspaceFs = vfsSessionService.getFs();
      const workspaceRoot = getWorkspaceRoot(input.vfsToken); // vfsToken is workspaceId
      const safePath = getSanitizedPath(workspaceRoot, input.path);

      try {
        const entries = (await workspaceFs.promises.readdir(safePath, { withFileTypes: true })) as Dirent[];
        return entries.map((entry: Dirent) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
        }));
      } catch (error) {
        // Create the directory if it doesn't exist to provide a better UX
        await workspaceFs.promises.mkdir(workspaceRoot, { recursive: true });
        return [];
      }
    }),

  /**
   * Read the content of a file
   */
  readFile: publicProcedure
    .input(z.object({ vfsToken: z.string(), path: z.string() }))
    .query(async ({ input }) => {
      const workspaceFs = vfsSessionService.getFs();
      const workspaceRoot = getWorkspaceRoot(input.vfsToken);
      const safePath = getSanitizedPath(workspaceRoot, input.path);

      const content = await workspaceFs.promises.readFile(safePath, 'utf-8');
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
      const workspaceFs = vfsSessionService.getFs();
      const workspaceRoot = getWorkspaceRoot(input.vfsToken);
      const safePath = getSanitizedPath(workspaceRoot, input.path);

      await workspaceFs.promises.writeFile(safePath, input.content);
      return { success: true };
    }),
});

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
  getTree: publicProcedure.query(async () => {
    const fs = vfsSessionService.getFs();
    const projectA = await fs.promises.readdir('/project-a', { withFileTypes: true });
    const projectB = await fs.promises.readdir('/project-b', { withFileTypes: true });

    const mapDirentToTree = (dirent: Dirent, path: string): { name: string; children: any[] | undefined } => ({
      name: dirent.name,
      children: dirent.isDirectory()
        ? fs.readdirSync(`${path}/${dirent.name}`, { withFileTypes: true }).map((d: any) => mapDirentToTree(d, `${path}/${dirent.name}`))
        : undefined,
    });

    return [
      {
        name: 'project-a',
        children: (projectA as Dirent[]).map((dirent: Dirent) => mapDirentToTree(dirent, '/project-a')),
      },
      {
        name: 'project-b',
        children: (projectB as Dirent[]).map((dirent: Dirent) => mapDirentToTree(dirent, '/project-b')),
      },
    ];
  }),
  moveFile: publicProcedure
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const fs = vfsSessionService.getFs();
      await fs.promises.rename(input.from, input.to);
      return { success: true };
    }),
});

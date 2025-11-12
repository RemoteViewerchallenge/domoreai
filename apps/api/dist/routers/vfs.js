import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
const vfsPath = path.join(process.cwd(), 'src/mockData/vfs.json');
export const vfsRouter = createTRPCRouter({
    getTree: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
        const data = await fs.readFile(vfsPath, 'utf-8');
        const vfs = JSON.parse(data);
        // In a real implementation, you would use input.workspaceId to fetch the correct tree
        return vfs;
    }),
});

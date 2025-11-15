import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc.js';
import { VfsSessionService } from '../services/vfsSession.service.js';
import { TRPCError } from '@trpc/server';
import path from 'path';
export const vfsRouter = createTRPCRouter({
    getToken: protectedProcedure
        .input(z.object({ workspaceId: z.string() }))
        .mutation(async ({ ctx, input }) => {
        // Use the real VfsSessionService from the context
        const vfsRootPath = `user-${ctx.auth.userId}/${input.workspaceId}`;
        const token = ctx.vfsSession.generateToken({
            userId: ctx.auth.userId,
            vfsRootPath: vfsRootPath,
        });
        return { token };
    }),
    listFiles: protectedProcedure
        .input(z.object({ vfsToken: z.string() }))
        .query(async ({ ctx, input }) => {
        const vfs = await ctx.vfsSession.getScopedVfs(input.vfsToken);
        if (!vfs) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid VFS Token' });
        }
        // THIS IS THE FIX: A recursive function to read and stat files.
        const readDirRecursive = async (dirPath) => {
            let entries = [];
            const fileNames = await vfs.readdir(dirPath);
            for (const name of fileNames) {
                const fullPath = path.join(dirPath, name);
                const stat = await vfs.stat(fullPath);
                if (stat.type === 'folder') {
                    entries.push({ path: fullPath, type: 'dir' });
                    // Recurse
                    const subEntries = await readDirRecursive(fullPath);
                    entries = entries.concat(subEntries);
                }
                else if (stat.type === 'file') {
                    entries.push({ path: fullPath, type: 'file' });
                }
            }
            return entries;
        };
        return await readDirRecursive('.');
    }),
});

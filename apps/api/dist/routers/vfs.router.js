import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { getVfsForWorkspace } from '../services/vfsService.js';
import { resolve } from 'path';
// DUMMY: Replace this with your actual token/auth logic
// This function will convert a VFS token into a workspaceId.
// For the 'Agent Orchestration IDE', the workspaceId is the key.
const getWorkspaceIdFromToken = (token) => {
    // In your real app, you'd validate this token
    // For now, we assume the token IS the workspaceId.
    return token;
};
// Helper to sanitize paths and prevent directory traversal
const getSanitizedPath = (workspaceFs, userPath) => {
    const root = '/'; // The root of our virtual volume
    const resolvedPath = resolve(root, userPath);
    // Security Check: Ensure path doesn't escape the root
    if (!resolvedPath.startsWith(root)) {
        throw new Error('Access Denied: Invalid path');
    }
    return resolvedPath;
};
export const vfsRouter = createTRPCRouter({
    // This procedure is just for the UI.
    // The 'token' is the workspaceId from the URL.
    getToken: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .mutation(({ input }) => {
        // In a real app, you'd generate a secure, short-lived token.
        // For us, we just confirm the workspaceId is the "token"
        // and ensure the VFS is initialized.
        getVfsForWorkspace(input.workspaceId); // This ensures the VFS is loaded
        return { token: input.workspaceId };
    }),
    /**
     * List files and directories
     */
    listFiles: publicProcedure
        .input(z.object({ vfsToken: z.string(), path: z.string().default('/') }))
        .query(async ({ input }) => {
        const workspaceId = getWorkspaceIdFromToken(input.vfsToken);
        const workspaceFs = getVfsForWorkspace(workspaceId);
        const safePath = getSanitizedPath(workspaceFs, input.path);
        const entries = (await workspaceFs.readdir(safePath, { withFileTypes: true }));
        // Map to the format your VfsViewer component expects
        return entries.map((entry) => ({
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
        const workspaceId = getWorkspaceIdFromToken(input.vfsToken);
        const workspaceFs = getVfsForWorkspace(workspaceId);
        const safePath = getSanitizedPath(workspaceFs, input.path);
        const content = await workspaceFs.readFile(safePath, 'utf-8');
        return content;
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
        const workspaceId = getWorkspaceIdFromToken(input.vfsToken);
        const workspaceFs = getVfsForWorkspace(workspaceId);
        const safePath = getSanitizedPath(workspaceFs, input.path);
        await workspaceFs.writeFile(safePath, input.content);
        return { success: true };
    }),
    // Add other procedures as needed (mkdir, rm, rename, etc.)
    // ...
});

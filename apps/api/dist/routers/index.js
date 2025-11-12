import { createTRPCRouter } from '../trpc.js';
import { workspaceRouter } from './workspace.js';
import { agentRoleRouter } from './agentRole.js';
import { vfsRouter } from './vfs.js';
/**
 * The main tRPC router for the application.
 * @type {ReturnType<typeof createTRPCRouter>}
 */
export const appRouter = createTRPCRouter({
    workspace: workspaceRouter,
    agentRole: agentRoleRouter,
    vfs: vfsRouter,
});

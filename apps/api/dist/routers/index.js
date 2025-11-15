import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { vfsRouter } from './vfs.router.js';
import { providerRouter } from './provider.router.js';
export const appRouter = createTRPCRouter({
    git: gitRouter,
    vfs: vfsRouter,
    provider: providerRouter,
});

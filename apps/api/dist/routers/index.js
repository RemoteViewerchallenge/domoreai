import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
export const appRouter = createTRPCRouter({
    git: gitRouter,
});

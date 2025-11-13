import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { vfsRouter } from './vfs.router.js';
import { contextRouter } from './context.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  vfs: vfsRouter,
  context: contextRouter,
});

export type AppRouter = typeof appRouter;

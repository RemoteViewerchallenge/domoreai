import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { vfsRouter } from './vfs.router.js';
import { lootboxRouter } from './lootbox.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  vfs: vfsRouter,
  lootbox: lootboxRouter,
});

export type AppRouter = typeof appRouter;

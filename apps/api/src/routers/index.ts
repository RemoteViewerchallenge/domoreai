import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { modelRouter } from './model.router.js';
import { lootboxRouter } from './lootbox.router.js';
import { dataRefinementRouter } from './dataRefinement.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  lootbox: lootboxRouter,
  dataRefinement: dataRefinementRouter,
});

export type AppRouter = typeof appRouter;
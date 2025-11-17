import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.ts';
import { lootboxRouter } from './lootbox.router.js';
import { modelRouter } from './model.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  lootbox: lootboxRouter,
  model: modelRouter,
});

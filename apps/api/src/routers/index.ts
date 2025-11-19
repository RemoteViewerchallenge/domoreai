import { createTRPCRouter } from '@repo/api-contract';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { modelRouter } from './model.router.js'; // Existing 
import { lootboxRouter } from './lootbox.router.js'; // New import

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  lootbox: lootboxRouter, // New router
});

export type AppRouter = typeof appRouter;
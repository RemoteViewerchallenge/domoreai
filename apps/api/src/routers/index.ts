import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { lootboxRouter } from './lootbox.router.js';
import { modelRouter } from './model.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  lootbox: lootboxRouter,
  model: modelRouter,
});

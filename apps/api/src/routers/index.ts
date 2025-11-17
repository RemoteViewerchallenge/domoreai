import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { lootboxRouter } from './lootbox.router.js';
import { modelRouter } from './model.router.js';
import { agentRouter } from './agent.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  agent: agentRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  lootbox: lootboxRouter,
  model: modelRouter,
});

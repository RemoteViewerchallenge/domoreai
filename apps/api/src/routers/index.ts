import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { vfsRouter } from './vfs.router.js';
import { externalRouter } from './external.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  vfs: vfsRouter,
  external: externalRouter,
});
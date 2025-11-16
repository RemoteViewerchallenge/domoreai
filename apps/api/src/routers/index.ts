import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  vfs: vfsRouter,
  providers: providerRouter,
  role: roleRouter,
});
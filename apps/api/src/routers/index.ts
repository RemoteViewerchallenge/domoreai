import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { modelRouter } from './model.router.js';
import { dataRefinementRouter } from './dataRefinement.router.js';
import { apiExplorerRouter } from './apiExplorer.router.js';
import { agentRouter } from './agent.router.js';
import { orchestratorRouter } from './orchestrator.router.js';
import { usageRouter } from './usage.router.js';

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  dataRefinement: dataRefinementRouter,
  apiExplorer: apiExplorerRouter,
  agent: agentRouter,
  orchestrator: orchestratorRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
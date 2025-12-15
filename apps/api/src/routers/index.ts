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
import { orchestrationManagementRouter } from './orchestrationManagement.router.js';
import { usageRouter } from './usage.router.js';
import { browserRouter } from './browser.router.js';
import { projectRouter } from './project.router.js';
import { contextRouter } from './context.router.js';
import { workspaceRouter } from './workspace.router.js';
import { codeGraphRouter } from './codeGraph.router.js';
import { volcanoRouter } from './volcano.router.js';
import { ingestionRouter } from './ingestion.router.js';

export const appRouter = createTRPCRouter({
  ingestion: ingestionRouter,
  project: projectRouter,
  codeGraph: codeGraphRouter,
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  model: modelRouter,
  dataRefinement: dataRefinementRouter,
  apiExplorer: apiExplorerRouter,
  agent: agentRouter,
  context: contextRouter,
  orchestrator: orchestratorRouter,
  orchestrationManagement: orchestrationManagementRouter,
  usage: usageRouter,
  browser: browserRouter,
  workspace: workspaceRouter,
  volcano: volcanoRouter,
});

export type AppRouter = typeof appRouter;
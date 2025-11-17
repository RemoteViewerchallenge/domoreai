import { createTRPCRouter } from '../trpc.js';
import { gitRouter } from './git.router.js';
import { providerRouter } from './providers.router.js';
import { roleRouter } from './role.router.js';
import { externalRouter } from './external.router.js';
import { vfsRouter } from './vfs.router.js';
import { lootboxRouter } from './lootbox.router.js'; // Existing
import { modelRouter } from './model.router.js'; // Existing
import { monacoLspRouter } from './monaco-lsp.router.js'; // From first merge
import { typescriptLspRouter } from './typescript-lsp.router.js'; // From second merge

export const appRouter = createTRPCRouter({
  git: gitRouter,
  providers: providerRouter,
  role: roleRouter,
  external: externalRouter,
  vfs: vfsRouter,
  lootbox: lootboxRouter,
  model: modelRouter,
  monacoLsp: monacoLspRouter,
  typescriptLsp: typescriptLspRouter,
});

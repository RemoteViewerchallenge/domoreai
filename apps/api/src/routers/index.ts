import { router } from "../trpc.js";
import { providersRouter } from "./providers.router.js";
import { roleRouter } from "./role.router.js";
import { vfsRouter } from "./vfs.router.js";
import { gitRouter } from "./git.router.js";

export const appRouter = router({
  providers: providersRouter,
  role: roleRouter,
  vfs: vfsRouter,
  git: gitRouter,
});

export type AppRouter = typeof appRouter;

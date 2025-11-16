import { createTRPCRouter } from './trpc';
import { taskRouter } from './routers/task';
import { contextRouter } from './routers/context';
import { lootboxRouter } from './routers/lootbox';

export const appRouter = createTRPCRouter({
  task: taskRouter,
  context: contextRouter,
  lootbox: lootboxRouter,
});

export type AppRouter = typeof appRouter;

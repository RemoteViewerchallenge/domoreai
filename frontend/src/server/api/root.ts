import { createTRPCRouter } from './trpc';
import { taskRouter } from './routers/task';
import { contextRouter } from './routers/context';

export const appRouter = createTRPCRouter({
  task: taskRouter,
  context: contextRouter,
});

export type AppRouter = typeof appRouter;

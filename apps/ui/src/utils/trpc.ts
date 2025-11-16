import { createTRPCReact, type inferReactQueryProcedureOptions } from '@trpc/react-query';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';

// 1. Import the AppRouter type from your 'api' package
// (Adjust this import path to match your monorepo structure)
import type { AppRouter } from 'api/src/routers/types';

/**
 * This is the tRPC client for your React app.
 */
export const trpc = createTRPCReact<AppRouter>();

export type ReactQueryProcedureOptions = inferReactQueryProcedureOptions<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

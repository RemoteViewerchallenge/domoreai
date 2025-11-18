import { createTRPCReact, type inferReactQueryProcedureOptions } from '@trpc/react-query';

import type { AppRouter } from '@repo/api-contract';

/**
 * This is the tRPC client for your React app.
 */
export const trpc = createTRPCReact<AppRouter>();

export type ReactQueryProcedureOptions = inferReactQueryProcedureOptions<AppRouter>;
export type RouterInputs = any;
export type RouterOutputs = any;

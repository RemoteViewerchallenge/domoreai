import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'api';

/**
 * The typed tRPC client for the React application.
 * This is used to make type-safe API calls to the tRPC server.
 */
export const trpc = createTRPCReact<AppRouter>();

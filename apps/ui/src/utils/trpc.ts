import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'api';

// Create the typed tRPC client
export const trpc = createTRPCReact<AppRouter>();

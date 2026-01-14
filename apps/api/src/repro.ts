
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './routers/index.js';
import fetch from 'node-fetch';

const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
            fetch: fetch as any,
        }),
    ],
});

async function main() {
    console.log('Attempting to fetch roles via TRPC...');
    try {
        const roles = await trpc.role.list.query();
        console.log(`Successfully fetched ${roles.length} roles.`);
        console.log('First role:', roles[0]);
    } catch (error) {
        console.error('Failed to fetch roles:', error);
    }
}

main();

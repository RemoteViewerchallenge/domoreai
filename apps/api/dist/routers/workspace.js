import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { promises as fs } from 'fs';
import path from 'path';
const workspacesPath = path.join(process.cwd(), 'src/mockData/workspaces.json');
export const workspaceRouter = createTRPCRouter({
    getAll: publicProcedure.query(async () => {
        const data = await fs.readFile(workspacesPath, 'utf-8');
        const workspaces = JSON.parse(data);
        return workspaces;
    }),
});

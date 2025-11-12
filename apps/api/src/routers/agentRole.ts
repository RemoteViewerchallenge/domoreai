import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { promises as fs } from 'fs';
import path from 'path';

const agentRolesPath = path.join(process.cwd(), 'src/mockData/agentRoles.json');

export const agentRoleRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const data = await fs.readFile(agentRolesPath, 'utf-8');
    const agentRoles = JSON.parse(data);
    return agentRoles;
  }),
});

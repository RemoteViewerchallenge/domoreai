import { createTRPCRouter, publicProcedure } from '../trpc';
import path from 'path';
import fs from 'fs';

export const lootboxRouter = createTRPCRouter({
  getModels: publicProcedure.query(() => {
    console.log("SIMULATION: UI fetching mock model registry...");
    const modelsPath = path.join(process.cwd(), 'apps/api/src/mockData/models.json');
    const data = fs.readFileSync(modelsPath, 'utf-8');
    return JSON.parse(data);
  }),
});

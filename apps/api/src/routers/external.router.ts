import { createTRPCRouter, publicProcedure, z } from '@repo/api-contract';
import axios from 'axios';

export const externalRouter = createTRPCRouter({
  getOpenRouterRaw: publicProcedure.query(async () => {
    const response = await axios.get('https://openrouter.ai/api/v1/models');
    return response.data;
  }),
});

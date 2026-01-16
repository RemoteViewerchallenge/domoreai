import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc.js';
import { prisma } from '../db.js';
import { RegistrySyncService } from '../services/RegistrySyncService.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { Surveyor } from '../services/Surveyor.js';

export const modelRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return prisma.model.findMany({
      where: { isActive: true },
      include: {
        provider: true,
        capabilities: true,
        chatModel: true,
        embeddingModel: true,
        visionModel: true,
        audioModel: true,
        imageModel: true,
        complianceModel: true,
        rewardModel: true
      },
      orderBy: { lastSeenAt: 'desc' }
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.model.findUnique({
        where: { id: input.id },
        include: {
           provider: true,
           capabilities: true,
           chatModel: true,
           embeddingModel: true,
           visionModel: true,
           audioModel: true,
           imageModel: true,
           complianceModel: true,
           rewardModel: true
        }
      });
    }),
    
  sync: protectedProcedure.mutation(async () => {
      await ProviderManager.initialize();
      await RegistrySyncService.syncModels(ProviderManager.getProviders(), ProviderManager.getProviderMetadata());
      return { success: true };
  }),

  runDoctor: protectedProcedure
    .input(z.object({ force: z.boolean().optional() }).optional())
    .mutation(async () => {
        await Surveyor.surveyAll();
        return { success: true };
    })
});

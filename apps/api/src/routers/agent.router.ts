
import { z } from 'zod';
import { t, procedure } from '../trpc';
import { prisma } from '../db';
import { modelManager } from '../services/modelManager';
import { lootbox } from '../services/lootbox';
import { volcano } from '@repo/volcano-sdk';
import { observable } from '@trpc/server/observable';
import { t, procedure } from '../trpc';
import { z } from 'zod';
import { prisma } from '../db';

export const agentRouter = t.router({
  runTask: procedure
    .input(
      z.object({
        prompt: z.string(),
        activeRoleId: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      const { prompt, activeRoleId } = input;

      const role = await prisma.role.findUnique({
        where: { id: activeRoleId },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      const model = await modelManager.getBestModel(role.id);
      const tools = await lootbox.getTools(role.id);

      return observable((emit) => {
        const stream = volcano.run({ model, tools, prompt });

        stream.on('data', (data) => {
          emit.next(data);
        });

        stream.on('end', () => {
          emit.complete();
        });

        return () => {
          stream.destroy();
        };
      });
    }),
});

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { browserService } from '../services/browser.service.js';

export const browserRouter = createTRPCRouter({
  navigate: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      url: z.string().url() 
    }))
    .mutation(async ({ input }) => {
      return await browserService.navigate(input.sessionId, input.url);
    }),

  click: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      x: z.number(),
      y: z.number()
    }))
    .mutation(async ({ input }) => {
      return await browserService.click(input.sessionId, input.x, input.y);
    }),

  scroll: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      deltaY: z.number()
    }))
    .mutation(async ({ input }) => {
      return await browserService.scroll(input.sessionId, input.deltaY);
    }),

  type: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      text: z.string()
    }))
    .mutation(async ({ input }) => {
      return await browserService.type(input.sessionId, input.text);
    }),

  pressKey: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      key: z.string()
    }))
    .mutation(async ({ input }) => {
      return await browserService.pressKey(input.sessionId, input.key as any);
    }),

  goBack: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      return await browserService.goBack(input.sessionId);
    }),

  goForward: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      return await browserService.goForward(input.sessionId);
    }),

  closeSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      await browserService.closeSession(input.sessionId);
      return { success: true };
    }),
});

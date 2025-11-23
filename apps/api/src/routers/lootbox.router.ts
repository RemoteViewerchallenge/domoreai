import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { McpOrchestrator } from '../services/McpOrchestrator.js';

const orchestrator = new McpOrchestrator();

export const lootboxRouter = createTRPCRouter({
  getTools: publicProcedure
    .input(z.object({ registryUrl: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const registryUrl = input.registryUrl || 'http://localhost:3000/v1/tools';
        
        // Native tools built into the system
        const nativeTools = [
          {
            id: 'native:terminal',
            name: 'Terminal',
            description: 'Execute shell commands (with restrictions)',
            serverName: 'native',
          },
          {
            id: 'native:filesystem',
            name: 'File System',
            description: 'Read and write files in the sandbox',
            serverName: 'native',
          },
          {
            id: 'native:browser',
            name: 'Web Scraper',
            description: 'Fetch and parse web pages',
            serverName: 'native',
          },
        ];

        // Try to fetch from registry
        try {
          const response = await fetch(registryUrl);
          if (!response.ok) {
            // If registry unavailable, return only native tools
            return nativeTools;
          }
          const registryTools = await response.json();
          // Combine native and registry tools
          return [...nativeTools, ...registryTools];
        } catch (error) {
          // If fetch fails, return only native tools
          console.warn('Registry unavailable, using native tools only');
          return nativeTools;
        }
      } catch (error) {
        console.error('Error fetching tools:', error);
        throw new Error('Failed to fetch tools');
      }
    }),

  // Keep executeTool for backward compatibility or if needed, but redirect to orchestrator
  executeTool: publicProcedure
    .input(z.object({ 
      toolName: z.string(), 
      args: z.any(),
      clientId: z.string().optional() 
    }))
    .mutation(async ({ input }) => {
      return orchestrator.executeTool(input.toolName, input.args, input.clientId);
    }),

  // Keep management endpoints if needed, or remove them. 
  // The user prompt didn't explicitly ask to remove them, but the new orchestrator handles spawning differently.
  // I'll keep them wired to the new orchestrator methods for now.
  spawnServer: publicProcedure
    .input(z.object({ id: z.string(), command: z.string(), args: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return orchestrator.spawnServer(input.id, input.command, input.args);
    }),

  connectServer: publicProcedure
    .input(z.object({ id: z.string(), url: z.string() }))
    .mutation(async ({ input }) => {
      return orchestrator.connectServer(input.id, input.url);
    }),
});

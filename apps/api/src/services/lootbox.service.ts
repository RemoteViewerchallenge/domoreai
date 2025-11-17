import axios from 'axios';
import { TRPCError } from '@trpc/server';

export class LootboxService {
  // FIX: We need two URLs, one for the Registry and one for the Proxy
  private readonly registryUrl = process.env.REGISTRY_URL || 'http://localhost:3001'; // Default to 3001
  private readonly proxyUrl = process.env.PROXY_URL || 'http://localhost:3002'; // Default to 3002

  constructor() {
    if (!process.env.REGISTRY_URL || !process.env.PROXY_URL) {
      console.warn('--- [LOOTBOX WARNING] ---');
      console.warn('REGISTRY_URL or PROXY_URL not set in .env');
      console.warn(`Defaulting to ${this.registryUrl} and ${this.proxyUrl}`);
      console.warn('-------------------------');
    }
  }

  async getTools() {
    try {
      // Fetches all available tools/namespaces from the standalone Registry Server
      const response = await axios.get(`${this.registryUrl}/namespaces`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching tools from Registry:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not fetch tools from the registry.',
      });
    }
  }

  async executeTool(toolName: string, args: any) {
    try {
      // Sends an execution request to the standalone Proxy Server
      const response = await axios.post(`${this.proxyUrl}/execute`, { toolName, args });
      return response.data;
    } catch (error: any) {
      console.error('Error executing tool via Proxy:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not execute tool.',
      });
    }
  }
}

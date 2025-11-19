import type { LLMCompletionRequest } from '@repo/common';
import axios from 'axios';
import { getProviderById } from './db/index.js';
import { checkRateLimit, incrementRateLimit } from './rateLimiter.js';
import { countTokens } from './tokenizer.js';
import { llmOpenAI } from '@repo/volcano-sdk';
import { LLMAdapter } from './llm-adapters.js';

async function rateLimitPreCheck(providerId: string, modelId: string) {
    const provider = await getProviderById(providerId);
    if (!provider) {
        throw new Error('Provider not found');
    }
 
    // @ts-ignore
    const model = provider.models.find(m => m.id === modelId); // TODO: Fix type
    if (!model) {
        throw new Error('Model not found');
    }
 
    // @ts-ignore
    if (!model.is_enabled) {
        throw new Error('Model is not enabled');
    }
 
    // @ts-ignore
    const rateLimitCheck = await checkRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd });
    if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
    }

    return model;
}

export class MCPAdapter implements LLMAdapter {
    public readonly providerName = 'mcp';
    public readonly configSchema = {
      apiKey: { type: 'string', required: true, description: 'Your MCP API Key' },
      baseURL: { type: 'string', required: false, description: 'Custom base URL for MCP-compatible APIs' },
    };
  
    async generateCompletion(request: LLMCompletionRequest): Promise<string> {
      const model = await rateLimitPreCheck(request.providerId, request.modelId);
  
      if (!request.config?.apiKey) {
        throw new Error('MCP API Key is required.');
      }
      const mcp = llmOpenAI({
        model: request.config?.model || 'gpt-3.5-turbo',
        apiKey: request.config.apiKey,
        baseURL: request.config.baseURL,
      });
      const completion = await mcp.gen(request.prompt);
      const tokenCount = countTokens(completion);
  
      await incrementRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd }, tokenCount);
  
      return completion;
    }
  
    async getModels(config: { apiKey?: string; baseURL?: string }): Promise<any[]> {
      if (!config.apiKey) {
        throw new Error('API Key is required to fetch models.');
      }
      const url = config.baseURL ? `${config.baseURL}/models` : 'https://api.openai.com/v1/models';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    }
  }

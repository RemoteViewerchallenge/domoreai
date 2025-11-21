import axios from 'axios';
import { z } from 'zod';

// ✅ FIX: Define a shared interface for Model data
export interface LLMModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  // Allow other properties without triggering 'any' warnings
  [key: string]: unknown; 
}

export interface LLMAdapter {
  providerName: string;
  configSchema: z.ZodObject<any>;
  getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]>;
  getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown>;
}

export class OpenAIAdapter implements LLMAdapter {
  providerName: string = 'openai';
  configSchema = z.object({
    apiKey: z.string().min(1),
    baseURL: z.string().url().optional(),
  });
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    if (!config.apiKey) return [];
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return (response.data as { data: LLMModel[] }).data || [];
    } catch (error) {
      console.error('OpenAI fetch failed:', error);
      return [];
    }
  }
  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    if (!config.apiKey) return {};
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return response.data;
    } catch (error) {
      console.error('OpenAI raw fetch failed:', error);
      return {};
    }
  }
}

export class MistralAdapter implements LLMAdapter {
  providerName: string = 'mistral';
  configSchema = z.object({
    apiKey: z.string().min(1),
    baseURL: z.string().url().optional(),
  });
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    if (!config.apiKey) return [];
    try {
      const response = await axios.get('https://api.mistral.ai/v1/models', {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return (response.data as { data: LLMModel[] }).data || [];
    } catch (error) {
      console.error('Mistral fetch failed:', error);
      return [];
    }
  }
  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    if (!config.apiKey) return {};
    try {
      const response = await axios.get('https://api.mistral.ai/v1/models', {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return response.data;
    } catch (error) {
      console.error('Mistral raw fetch failed:', error);
      return {};
    }
  }
}

export class LlamaAdapter implements LLMAdapter {
  providerName: string = 'llama';
  configSchema = z.object({
    apiKey: z.string().min(1).optional(),
    baseURL: z.string().url().optional(),
  });
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    return []; 
  }
  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    return {};
  }
}

export class VertexStudioAdapter implements LLMAdapter {
    providerName: string = 'vertex-studio';
    configSchema = z.object({
      apiKey: z.string().min(1).optional(),
      baseURL: z.string().url().optional(),
    });
    async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
        return [];
    }
    async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
        return {};
    }
}
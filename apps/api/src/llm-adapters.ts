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
    const baseUrl = config.baseURL || 'https://api.openai.com/v1';
    try {
      const response = await axios.get(`${baseUrl}/models`, {
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
    const baseUrl = config.baseURL || 'https://api.openai.com/v1';
    try {
      const response = await axios.get(`${baseUrl}/models`, {
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
    const baseUrl = config.baseURL || 'https://api.mistral.ai/v1';
    try {
      const response = await axios.get(`${baseUrl}/models`, {
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
    const baseUrl = config.baseURL || 'https://api.mistral.ai/v1';
    try {
      const response = await axios.get(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return response.data;
    } catch (error) {
      console.error('Mistral raw fetch failed:', error);
      return {};
    }
  }
}

export class OllamaAdapter implements LLMAdapter {
  providerName: string = 'ollama';
  configSchema = z.object({
    baseURL: z.string().url().default('http://localhost:11434'),
    apiKey: z.string().optional(), // Ollama usually doesn't need a key, but keep for consistency
  });

  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    const baseUrl = config.baseURL || 'http://localhost:11434';
    try {
      // Ollama's list endpoint is /api/tags
      const response = await axios.get(`${baseUrl}/api/tags`);
      const models = response.data?.models || [];
      
      return models.map((m: any) => ({
        id: m.name,
        object: 'model',
        created: new Date(m.modified_at).getTime(),
        owned_by: 'library',
        ...m
      }));
    } catch (error) {
      console.error('Ollama fetch failed:', error);
      return [];
    }
  }

  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    const baseUrl = config.baseURL || 'http://localhost:11434';
    try {
      const response = await axios.get(`${baseUrl}/api/tags`);
      return response.data;
    } catch (error) {
      console.error('Ollama raw fetch failed:', error);
      return {};
    }
  }
}

// Deprecate LlamaAdapter in favor of OllamaAdapter for now, or alias it
export class LlamaAdapter extends OllamaAdapter {
  providerName: string = 'llama';
}

export class VertexStudioAdapter implements LLMAdapter {
  providerName: string = 'vertex-studio';
  configSchema = z.object({
    apiKey: z.string().min(1).optional(),
    baseURL: z.string().url().optional(),
  });

  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    if (!config.apiKey) {
      console.warn('VertexStudioAdapter: No API key provided.');
      return [];
    }
    // Google AI Studio (Gemini) API structure
    // Base URL usually: https://generativelanguage.googleapis.com/v1beta
    const baseUrl = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    
    console.log(`VertexStudioAdapter: Fetching models from ${baseUrl}/models`);

    try {
      const response = await axios.get(`${baseUrl}/models?key=${config.apiKey}`);
      console.log('VertexStudioAdapter: Response status:', response.status);
      console.log('VertexStudioAdapter: Response data keys:', Object.keys(response.data));
      
      const models = response.data?.models || [];
      console.log(`VertexStudioAdapter: Found ${models.length} models.`);
      
      return models.map((m: any) => ({
        id: m.name.replace('models/', ''), // Google returns 'models/gemini-pro'
        object: 'model',
        created: Date.now(), // Google doesn't return created timestamp in list
        owned_by: 'google',
        ...m
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Vertex/Gemini fetch failed:', error.response?.data || error.message);
      } else {
        console.error('Vertex/Gemini fetch failed:', error);
      }
      return [];
    }
  }

  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    if (!config.apiKey) return {};
    const baseUrl = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    try {
      const response = await axios.get(`${baseUrl}/models?key=${config.apiKey}`);
      return response.data;
    } catch (error) {
      console.error('Vertex/Gemini raw fetch failed:', error);
      return {};
    }
  }
}

export class AnthropicAdapter implements LLMAdapter {
  providerName: string = 'anthropic';
  configSchema = z.object({
    apiKey: z.string().min(1),
    baseURL: z.string().url().default('https://api.anthropic.com/v1'),
  });

  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    if (!config.apiKey) return [];
    const baseUrl = config.baseURL || 'https://api.anthropic.com/v1';
    try {
      // Anthropic recently added a models endpoint
      const response = await axios.get(`${baseUrl}/models`, {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      // Response shape: { data: [ { id: "claude-3-opus-20240229", ... } ] }
      return (response.data.data || []).map((m: any) => ({
        id: m.id,
        object: 'model',
        created: m.created_at || Date.now(),
        owned_by: 'anthropic',
        ...m
      }));
    } catch (error) {
      console.error('Anthropic fetch failed:', error);
      return [];
    }
  }

  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    if (!config.apiKey) return {};
    const baseUrl = config.baseURL || 'https://api.anthropic.com/v1';
    try {
      const response = await axios.get(`${baseUrl}/models`, {
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Anthropic raw fetch failed:', error);
      return {};
    }
  }
}

export class AzureAIAdapter implements LLMAdapter {
  providerName: string = 'azure';
  configSchema = z.object({
    apiKey: z.string().min(1),
    baseURL: z.string().url(), // e.g. https://my-resource.openai.azure.com/
  });

  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    if (!config.apiKey || !config.baseURL) return [];
    try {
      // Azure lists "deployments" which act as models
      // URL format: https://{your-resource-name}.openai.azure.com/openai/deployments?api-version=2023-05-15
      // We assume baseURL is the root resource URL
      const url = new URL('/openai/deployments', config.baseURL).toString();
      const response = await axios.get(url, {
        params: { 'api-version': '2023-05-15' },
        headers: { 'api-key': config.apiKey },
      });

      return (response.data.data || []).map((d: any) => ({
        id: d.id,
        object: 'model',
        created: d.created_at || Date.now(),
        owned_by: 'azure',
        ...d
      }));
    } catch (error) {
      console.error('Azure AI fetch failed:', error);
      return [];
    }
  }

  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    if (!config.apiKey || !config.baseURL) return {};
    try {
      const url = new URL('/openai/deployments', config.baseURL).toString();
      const response = await axios.get(url, {
        params: { 'api-version': '2023-05-15' },
        headers: { 'api-key': config.apiKey },
      });
      return response.data;
    } catch (error) {
      console.error('Azure AI raw fetch failed:', error);
      return {};
    }
  }
}

export class BedrockAdapter implements LLMAdapter {
  providerName: string = 'bedrock';
  configSchema = z.object({
    apiKey: z.string().optional(), // Access Key ID
    baseURL: z.string().optional(), // Region?
  });

  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<LLMModel[]> {
    console.warn('BedrockAdapter: AWS SigV4 signing not implemented in this lightweight adapter.');
    return [];
  }

  async getRawModels(config: { apiKey?: string; baseURL?: string }): Promise<unknown> {
    console.warn('BedrockAdapter: AWS SigV4 signing not implemented in this lightweight adapter.');
    return { error: 'Not implemented: Requires AWS SDK' };
  }
}
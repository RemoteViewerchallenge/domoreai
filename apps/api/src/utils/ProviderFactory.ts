// @ts-ignore
import { OpenAI } from 'openai';

export interface LLMModel {
  id: string;
  [key: string]: any;
}

export interface CompletionRequest {
  modelId: string;
  messages: any[];
  temperature?: number;
  max_tokens?: number;
}

export interface BaseLLMProvider {
  id: string;
  getModels(): Promise<LLMModel[]>;
  generateCompletion(request: CompletionRequest): Promise<string>;
}

export class ProviderFactory {
  static createProvider(type: string, config: { id: string; apiKey: string; baseURL?: string }): BaseLLMProvider {
    switch (type.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'azure':
      case 'azure-openai':
         return new OpenAIProvider(config);
      default:
        throw new Error(`Provider type '${type}' is not supported in the new SDK migration yet.`);
    }
  }
}

class OpenAIProvider implements BaseLLMProvider {
  id: string;
  private client: OpenAI;

  constructor(config: { id: string; apiKey: string; baseURL?: string }) {
    this.id = config.id;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async getModels(): Promise<LLMModel[]> {
    try {
        const list = await this.client.models.list();
        return list.data.map((m: any) => ({ id: m.id, ...m }));
    } catch (e) {
        console.error("Failed to fetch OpenAI models", e);
        return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: request.modelId,
      messages: request.messages as any,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    });
    return response.choices[0]?.message?.content || '';
  }
}

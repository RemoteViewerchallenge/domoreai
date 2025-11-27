// @ts-ignore
import { OpenAI } from 'openai';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';
import { UsageCollector } from '../services/UsageCollector.js';

export class OpenAIProvider implements BaseLLMProvider {
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
    // Validate model ID is provided
    if (!request.modelId || request.modelId.trim() === '') {
      throw new Error(`OpenAIProvider: modelId is required but got: "${request.modelId}"`);
    }

    console.log(`[OpenAIProvider] Calling API with model: "${request.modelId}"`);
    
    const response = await this.client.chat.completions.create({
      model: request.modelId,
      messages: request.messages as any,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    }).asResponse();

    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Update dynamic limits
    await UsageCollector.updateDynamicLimits(this.id, headers);
    
    const json = await response.json();
    const content = json.choices[0]?.message?.content || '';
    
    if (!content) {
      console.warn('[OpenAIProvider] Empty response from model:', json);
    }
    
    return content;
  }
}

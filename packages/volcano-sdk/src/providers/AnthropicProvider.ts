import { BaseLLMProvider, LLMModel, CompletionRequest } from '../types.js';
import fetch from 'node-fetch';

export class AnthropicProvider extends BaseLLMProvider {
  providerType = 'anthropic';

  async getModels(): Promise<LLMModel[]> {
    const baseUrl = this.config.baseURL || 'https://api.anthropic.com/v1';
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        throw new Error(`Anthropic fetch failed: ${response.statusText}`);
      }

      const data = await response.json() as { data: any[] };
      return (data.data || []).map((m: any) => ({
        id: m.id,
        providerId: this.id,
        object: 'model',
        created: m.created_at || Date.now(),
        owned_by: 'anthropic',
        capabilities: ['chat'],
      }));
    } catch (error) {
      console.error('Anthropic fetch failed:', error);
      return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const baseUrl = this.config.baseURL || 'https://api.anthropic.com/v1';
    
    const systemMessage = request.messages.find((m: any) => m.role === 'system');
    const messages = request.messages.filter((m: any) => m.role !== 'system');

    const body: any = {
      model: request.modelId,
      messages: messages,
      max_tokens: request.max_tokens || 1024,
      temperature: request.temperature,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic completion failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;
    return data.content[0]?.text || '';
  }
}

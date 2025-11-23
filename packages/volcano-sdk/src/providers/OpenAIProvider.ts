import { BaseLLMProvider, LLMModel, CompletionRequest } from '../types.js';
import fetch from 'node-fetch';

export class OpenAIProvider extends BaseLLMProvider {
  providerType = 'openai';

  async getModels(): Promise<LLMModel[]> {
    const baseUrl = this.config.baseURL || 'https://api.openai.com/v1';
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI fetch failed: ${response.statusText}`);
      }

      const data = await response.json() as { data: any[] };
      return (data.data || []).map((m: any) => ({
        id: m.id,
        providerId: this.id,
        object: 'model',
        created: m.created,
        owned_by: m.owned_by,
        capabilities: ['chat'], // simplified
      }));
    } catch (error) {
      console.error('OpenAI fetch failed:', error);
      return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const baseUrl = this.config.baseURL || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI completion failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;
    return data.choices[0]?.message?.content || '';
  }
}

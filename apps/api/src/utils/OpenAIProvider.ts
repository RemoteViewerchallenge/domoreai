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
        return list.data.map((m: any) => {
            // OpenRouter specific: Check pricing
            let isFree = false;
            if (m.pricing) {
                const prompt = parseFloat(m.pricing.prompt);
                const completion = parseFloat(m.pricing.completion);
                if (prompt === 0 && completion === 0) {
                    isFree = true;
                }
            }
            return { id: m.id, providerId: this.id, isFree, ...m };
        });
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
    
    try {
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
    } catch (error: any) {
      // FIX: Handle Google models on OpenRouter rejecting system prompts
      const errorMessage = error.message || error.error?.message || String(error);
      if (errorMessage.includes("Developer instruction is not enabled")) {
        console.warn(`[OpenAIProvider] Model rejected system prompt. Retrying with merged prompt...`);
        
        // Merge system prompt into user message
        const mergedMessages = this.mergeSystemPrompt(request.messages);
        
        const response = await this.client.chat.completions.create({
          model: request.modelId,
          messages: mergedMessages as any,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        }).asResponse();
        
        const json = await response.json();
        return json.choices[0]?.message?.content || '';
      }
      throw error;
    }
  }

  private mergeSystemPrompt(messages: any[]): any[] {
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length === 0) return messages;

    const systemPrompt = systemMessages.map(m => m.content).join('\n');
    const newMessages: any[] = [];
    let isFirstUserMessage = true;

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      
      if (isFirstUserMessage && msg.role === 'user') {
        newMessages.push({
          role: 'user',
          content: `${systemPrompt}\n\n${msg.content}`
        });
        isFirstUserMessage = false;
      } else {
        newMessages.push(msg);
        if (msg.role === 'user') isFirstUserMessage = false;
      }
    }
    return newMessages;
  }
}

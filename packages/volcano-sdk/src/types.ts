export interface LLMModel {
  id: string;
  providerId: string; // references the specific config instance (e.g. "openai-personal" vs "openai-team")
  object: string;
  created: number;
  owned_by: string;
  capabilities?: string[]; // e.g. ['chat', 'vision']
}

export interface CompletionRequest {
  modelId: string;
  messages: any[]; // Use a standard type like OpenAI.ChatCompletionMessageParam
  temperature?: number;
  max_tokens?: number;
}

// Abstract Base Class for all providers
export abstract class BaseLLMProvider {
  abstract providerType: string; // 'openai', 'anthropic', 'generic-openai'

  constructor(public id: string, protected config: { apiKey: string; baseURL?: string; organization?: string }) {}

  abstract getModels(): Promise<LLMModel[]>;
  abstract generateCompletion(request: CompletionRequest): Promise<string>;
}

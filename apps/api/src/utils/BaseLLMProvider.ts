export interface LLMModel {
  id: string;
  name?: string;
  provider?: string;
  providerId?: string;
  providerConfigId?: string;
  isFree?: boolean;
  costPer1k?: number;
  limitRequestRate?: number;
  limitWindow?: number;
  capabilities?: string[];
  specs?: {
    contextWindow?: number;
    hasVision?: boolean;
    hasReasoning?: boolean;
    hasCoding?: boolean;
  };
  [key: string]: unknown;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  modelId: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

export interface BaseLLMProvider {
  id: string;
  getModels(): Promise<LLMModel[]>;
  generateCompletion(request: CompletionRequest): Promise<string>;
}

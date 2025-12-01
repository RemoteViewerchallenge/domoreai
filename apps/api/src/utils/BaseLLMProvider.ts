export interface LLMModel {
  id: string;
  [key: string]: any;
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

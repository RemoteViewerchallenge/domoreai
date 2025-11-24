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

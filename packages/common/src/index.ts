export interface LLMProvider {
  id: string;
  name: string;
  displayName: string;
  models: string[];
  configSchema: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
}

export interface LLMCompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  config?: { [key: string]: any };
}
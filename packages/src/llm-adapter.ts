export interface LLMCompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  config?: Record<string, any>; // Added for dynamic configuration
}

export interface LLMProvider {
  id: string; // Unique ID for the configured provider instance
  displayName: string; // User-defined name for the provider instance
  name: string; // The type of provider (e.g., 'openai', 'mistral')
  models: string[];
  configSchema?: Record<string, any>; // Optional schema for UI to generate config fields
}

export interface LLMAdapter {
  providerName: string;
  models: string[];
  generateCompletion(request: LLMCompletionRequest): Promise<string>;
}

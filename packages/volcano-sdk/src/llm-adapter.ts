import fetch from 'node-fetch';

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

// Placeholder functions for now
export const llmOpenAI = (config: any) => ({
  gen: (prompt: string) => Promise.resolve(`OpenAI completion for: ${prompt}`),
  listModels: () => Promise.resolve([]),
});

export const llmMistral = (config: any) => ({
  gen: (prompt: string) => Promise.resolve(`Mistral completion for: ${prompt}`),
  listModels: () => Promise.resolve([]),
});

export const llmLlama = (config: any) => ({
  gen: (prompt: string) => Promise.resolve(`Llama completion for: ${prompt}`),
  listModels: () => Promise.resolve([]),
});

export const llmVertexStudio = (config: any) => ({
  gen: (prompt: string) => Promise.resolve(`Vertex Studio completion for: ${prompt}`),
  listModels: () => Promise.resolve([]),
});

export const llmLootbox = (config: any) => ({
  gen: async (prompt: string) => {
    // TODO: Replace with the actual lootbox API endpoint
    const response = await fetch('https://mcp.ai/api/lootbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    return response.json();
  },
  listModels: () => Promise.resolve([]),
});

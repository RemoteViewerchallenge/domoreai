import { BaseLLMProvider } from './BaseLLMProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { GoogleGenAIProvider } from './GoogleGenAIProvider.js';
import { OllamaProvider } from './OllamaProvider.js';

export * from './BaseLLMProvider.js';


export class ProviderFactory {
  
  static createProvider(type: string, config: any): BaseLLMProvider {
    console.log(`[ProviderFactory] Initializing: ${type} (${config.baseURL || 'default url'})`);

    switch (type) {
      // --- GROUP 1: NATIVE PROVIDERS ---
      case 'anthropic':
        return new AnthropicProvider(config);
        
      case 'google': // Gemini Developer API (AI Studio)
      case 'vertex': // Google Vertex AI (Enterprise)
      case 'vertex-studio': // Legacy handling
        return new GoogleGenAIProvider(config);

      // --- GROUP 2: OPENAI COMPATIBLE (The "Universal" Group) ---
      // The UI sends these specific names, but they all speak "OpenAI"
      case 'openai':
      case 'openrouter':
      case 'mistral':
      case 'groq':
      case 'deepseek':
      case 'generic-openai': // For custom endpoints
        return new OpenAIProvider({
          ...config,
          // 1. Trust the Base URL from the Database (which came from UI)
          // 2. Fallback to defaults ONLY if DB is empty
          baseURL: config.baseURL || this.getDefaultBaseURL(type)
        });

      case 'ollama':
        if (!config.baseURL) throw new Error('Ollama requires a baseURL accessible from the API runtime.');
        return new OllamaProvider(config);

      default:
        throw new Error(`Provider type '${type}' is not supported yet.`);
    }
  }

  // Helper to keep the switch clean
  private static getDefaultBaseURL(type: string): string | undefined {
    switch (type) {
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'mistral':    return 'https://api.mistral.ai/v1';
      case 'groq':       return 'https://api.groq.com/openai/v1';
      default:           return undefined; // Let SDK default to api.openai.com
    }
  }
}

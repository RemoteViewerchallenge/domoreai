import { BaseLLMProvider } from './types.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { GenericOpenAIProvider } from './providers/GenericOpenAIProvider.js';

export class ProviderFactory {
  static createProvider(type: string, config: { id: string; apiKey: string; baseURL?: string; organization?: string }): BaseLLMProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config.id, config);
      case 'anthropic':
        return new AnthropicProvider(config.id, config);
      case 'generic-openai':
        if (!config.baseURL) {
          throw new Error('Generic OpenAI provider requires a baseURL');
        }
        return new GenericOpenAIProvider(config.id, config as { id: string; apiKey: string; baseURL: string; organization?: string });
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

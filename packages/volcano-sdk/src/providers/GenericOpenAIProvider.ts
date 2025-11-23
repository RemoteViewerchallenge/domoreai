import { OpenAIProvider } from './OpenAIProvider.js';

export class GenericOpenAIProvider extends OpenAIProvider {
  providerType = 'generic-openai';

  constructor(id: string, config: { apiKey: string; baseURL: string; organization?: string }) {
    // Enforce baseURL for generic provider
    super(id, config);
  }
}

import axios from 'axios';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';

/**
 * OllamaProvider - Minimal provider for local Ollama servers.
 * Notes:
 * - Uses Ollama native endpoints: /api/tags and /api/generate
 * - Expects baseURL like http://<host>:11434/
 */
export class OllamaProvider implements BaseLLMProvider {
  id: string;
  private baseURL: string;

  constructor(config: { id?: string; apiKey?: string; baseURL: string }) {
    this.id = config.id || 'ollama';
    this.baseURL = config.baseURL.endsWith('/') ? config.baseURL : config.baseURL + '/';
  }

  // no-op for now
  setUsageCollector(_collector: any) {}

  async getModels(): Promise<LLMModel[]> {
    try {
      const response = await axios.get(this.baseURL + 'api/tags');
      const models = response.data?.models || [];
      return models.map((m: any) => ({
        id: m.name,
        name: (m.name || '').replace(':latest', ''),
        family: m.details?.family,
        parameter_size: m.details?.parameter_size,
        isFree: true,
      }));
    } catch (e: any) {
      const msg = e?.message || 'unknown error';
      throw new Error(`Ollama connection failed at ${this.baseURL}. Ensure Ollama is running and reachable. Error: ${msg}`);
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const userMessage = request.messages?.[request.messages.length - 1]?.content || '';
    const resp = await axios.post(this.baseURL + 'api/generate', {
      model: request.modelId,
      prompt: userMessage,
      options: {
        temperature: request.temperature,
        num_ctx: request.max_tokens,
      },
      stream: false,
    });
    // Non-streaming response has { response: string, done: boolean }
    return resp.data?.response || '';
  }
}

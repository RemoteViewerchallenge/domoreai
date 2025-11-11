import { LLMCompletionRequest } from '@repo/common';
import { llmOpenAI, llmMistral, llmLlama, llmVertexStudio } from 'volcano-sdk';
import axios from 'axios';

/**
 * @interface LLMAdapter
 * @description Defines the contract for an LLM provider adapter, including methods for generating completions and fetching models.
 */
export interface LLMAdapter {
  /**
   * @property {string} providerName - The unique name of the provider (e.g., 'openai', 'mistral').
   */
  readonly providerName: string;
  /**
   * @property {object} configSchema - An object defining the configuration fields required by the adapter.
   */
  readonly configSchema: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  /**
   * Generates a text completion based on a given request.
   * @param {LLMCompletionRequest} request - The completion request details.
   * @returns {Promise<string>} A promise that resolves to the generated text completion.
   */
  generateCompletion(request: LLMCompletionRequest): Promise<string>;
  /**
   * Fetches the list of available models from the provider.
   * @param {object} config - The configuration object containing credentials like API keys or base URLs.
   * @returns {Promise<any[]>} A promise that resolves to an array of available models.
   */
  getModels(config: {
    apiKey?: string;
    baseURL?: string;
    projectId?: string;
    location?: string;
  }): Promise<any[]>;
}

/**
 * @class OpenAIAdapter
 * @implements {LLMAdapter}
 * @description Adapter for OpenAI and OpenAI-compatible APIs (e.g., OpenRouter, Together AI).
 */
export class OpenAIAdapter implements LLMAdapter {
  public readonly providerName = 'openai';
  public readonly configSchema = {
    apiKey: { type: 'string', required: true, description: 'Your OpenAI API Key' },
    baseURL: { type: 'string', required: false, description: 'Custom base URL for OpenAI-compatible APIs' },
  };

  /**
   * Generates a completion using the OpenAI API.
   * @param {LLMCompletionRequest} request - The completion request.
   * @returns {Promise<string>} The generated completion text.
   * @throws {Error} If the API key is missing.
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<string> {
    if (!request.config?.apiKey) {
      throw new Error('OpenAI API Key is required.');
    }
    const openai = llmOpenAI({
      model: request.config?.model || 'gpt-3.5-turbo',
      apiKey: request.config.apiKey,
      baseURL: request.config.baseURL,
    });
    const completion = await openai.gen(request.prompt);
    return completion;
  }

  /**
   * Fetches available models from the OpenAI or a compatible API.
   * @param {object} config - Configuration containing the API key and optional base URL.
   * @returns {Promise<any[]>} A list of model objects.
   * @throws {Error} If the API key is missing.
   */
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<any[]> {
    if (!config.apiKey) {
      throw new Error('API Key is required to fetch models.');
    }
    const url = config.baseURL ? `${config.baseURL}/models` : 'https://api.openai.com/v1/models';
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    // Handle different response structures for OpenAI-compatible APIs
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return []; // Return empty array if format is unexpected
  }
}

/**
 * @class MistralAdapter
 * @implements {LLMAdapter}
 * @description Adapter for the Mistral API.
 */
export class MistralAdapter implements LLMAdapter {
  public readonly providerName = 'mistral';
  public readonly configSchema = {
    apiKey: { type: 'string', required: true, description: 'Your Mistral API Key' },
    baseURL: { type: 'string', required: false, description: 'Custom base URL for Mistral API' },
  };

  /**
   * Generates a completion using the Mistral API.
   * @param {LLMCompletionRequest} request - The completion request.
   * @returns {Promise<string>} The generated completion text.
   * @throws {Error} If the API key is missing.
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<string> {
    if (!request.config?.apiKey) {
      throw new Error('Mistral API Key is required.');
    }
    const mistral = llmMistral({
      model: request.config?.model,
      apiKey: request.config.apiKey,
      baseURL: request.config.baseURL,
    });

    const completion = await mistral.gen(request.prompt);
    return completion;
  }

  /**
   * Fetches available models from the Mistral API.
   * @param {object} config - Configuration containing the API key and optional base URL.
   * @returns {Promise<any[]>} A list of model objects.
   * @throws {Error} If the API key is missing.
   */
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<any[]> {
    if (!config.apiKey) {
      throw new Error('API Key is required to fetch models.');
    }
    const url = config.baseURL ? `${config.baseURL}/models` : 'https://api.mistral.ai/v1/models';
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    return response.data.data;
  }
}

/**
 * @class LlamaAdapter
 * @implements {LLMAdapter}
 * @description Adapter for Llama models, often used with local servers like Ollama.
 */
export class LlamaAdapter implements LLMAdapter {
  public readonly providerName = 'llama';
  public readonly configSchema = {
    apiKey: { type: 'string', required: false, description: 'Your Llama API Key (optional)' },
    baseURL: { type: 'string', required: true, description: 'Base URL for Llama API (e.g., Ollama endpoint)' },
  };

  /**
   * Generates a completion using a Llama-compatible API.
   * @param {LLMCompletionRequest} request - The completion request.
   * @returns {Promise<string>} The generated completion text.
   * @throws {Error} If the base URL is missing.
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<string> {
    if (!request.config?.baseURL) {
      throw new Error('Llama API Base URL is required.');
    }
    const llama = llmLlama({
      model: request.config?.model,
      apiKey: request.config.apiKey, // Can be optional for local Ollama
      baseURL: request.config.baseURL,
    });

    const completion = await llama.gen(request.prompt);
    return completion;
  }

  /**
   * Fetches available models from a Llama-compatible API (e.g., Ollama).
   * @param {object} config - Configuration containing the base URL.
   * @returns {Promise<any[]>} A list of model objects.
   * @throws {Error} If the base URL is missing.
   */
  async getModels(config: { apiKey?: string; baseURL?: string }): Promise<any[]> {
    if (!config.baseURL) {
      throw new Error('Base URL is required to fetch local models.');
    }
    // This assumes an Ollama-compatible `/api/tags` endpoint
    const url = `${config.baseURL}/api/tags`;
    const response = await axios.get(url);
    return response.data.models;
  }
}

/**
 * @class VertexStudioAdapter
 * @implements {LLMAdapter}
 * @description Adapter for Google's Vertex AI / Google AI Studio models.
 */
export class VertexStudioAdapter implements LLMAdapter {
  public readonly providerName = 'vertex-studio';
  public readonly configSchema = {
    apiKey: {
      type: 'string',
      required: true,
      description: 'Your Google AI Studio API Key. Get one from Google AI Studio under "Get API key".'
    },
  };

  /**
   * Generates a completion using the Google AI Studio API.
   * @param {LLMCompletionRequest} request - The completion request.
   * @returns {Promise<string>} The generated completion text.
   * @throws {Error} If the API key is missing.
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<string> {
    if (!request.config?.apiKey) {
      throw new Error('Google Cloud API Key is required for Vertex AI Studio.');
    }
    const vertexStudio = llmVertexStudio({
      model: request.config?.model,
      apiKey: request.config.apiKey,
      baseURL: request.config.baseURL,
    });

    const completion = await vertexStudio.gen(request.prompt);
    return completion;
  }

  /**
   * Fetches available models from the Google AI Studio API.
   * @param {object} config - Configuration containing the API key.
   * @returns {Promise<any[]>} A list of model objects.
   * @throws {Error} If the API key is missing.
   */
  async getModels(config: {
    apiKey?: string;
  }): Promise<any[]> {
    if (!config.apiKey) {
      throw new Error('API Key is required to fetch Google AI Studio models.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
    const response = await axios.get(url);

    // The API returns an object with a "models" array property
    return response.data.models || [];
  }
}

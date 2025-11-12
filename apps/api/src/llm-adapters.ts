import { LLMCompletionRequest } from '@repo/common';
import { llmOpenAI, llmMistral, llmLlama, llmVertexStudio } from 'volcano-sdk';
import axios from 'axios';

/**
 * Defines the interface for a Large Language Model (LLM) adapter.
 * Each adapter is responsible for communicating with a specific LLM provider,
 * handling API requests for model listings and completions.
 */
export interface LLMAdapter {
  /**
   * The unique name of the provider (e.g., 'openai', 'mistral').
   * @type {string}
   */
  readonly providerName: string;
  /**
   * A schema defining the configuration options for this provider.
   * This is used to validate and describe the required credentials and settings.
   * @type {object}
   */
  readonly configSchema: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  /**
   * Generates a text completion based on a given prompt and configuration.
   * @param {LLMCompletionRequest} request - The completion request object.
   * @returns {Promise<string>} The generated text completion.
   */
  generateCompletion(request: LLMCompletionRequest): Promise<string>;
  /**
   * Fetches the list of available models from the provider's API.
   * @param {object} config - The configuration object containing API credentials.
   * @returns {Promise<any[]>} A promise that resolves to an array of model objects.
   */
  getModels(config: {
    apiKey?: string;
    baseURL?: string;
    projectId?: string;
    location?: string;
  }): Promise<any[]>;
}

/**
 * An adapter for OpenAI and OpenAI-compatible APIs.
 * It handles model discovery and completion generation for services like OpenAI, OpenRouter, and TogetherAI.
 */
export class OpenAIAdapter implements LLMAdapter {
  public readonly providerName = 'openai';
  public readonly configSchema = {
    apiKey: { type: 'string', required: true, description: 'Your OpenAI API Key' },
    baseURL: { type: 'string', required: false, description: 'Custom base URL for OpenAI-compatible APIs' },
  };

  /**
   * Generates a completion using the OpenAI API.
   * @param {LLMCompletionRequest} request - The completion request details.
   * @returns {Promise<string>} The completed text.
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
   * Fetches available models from an OpenAI-compatible API.
   * It handles different response structures from various providers.
   * @param {object} config - The configuration containing the API key and optional base URL.
   * @param {string} [config.apiKey] - The API key for authentication.
   * @param {string} [config.baseURL] - The base URL of the API endpoint.
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
    // Return the raw data array
    // Handle different response structures for OpenAI-compatible APIs
    // Standard OpenAI and OpenRouter return { "data": [...] }
    // TogetherAI and others might return [...] directly.
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
 * An adapter for the Mistral API.
 */
export class MistralAdapter implements LLMAdapter {
  public readonly providerName = 'mistral';
  public readonly configSchema = {
    apiKey: { type: 'string', required: true, description: 'Your Mistral API Key' },
    baseURL: { type: 'string', required: false, description: 'Custom base URL for Mistral API' },
  };

  /**
   * Generates a completion using the Mistral API.
   * @param {LLMCompletionRequest} request - The completion request details.
   * @returns {Promise<string>} The completed text.
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
   * @param {object} config - The configuration containing the API key and optional base URL.
   * @param {string} [config.apiKey] - The API key for authentication.
   * @param {string} [config.baseURL] - The base URL of the API endpoint.
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
 * An adapter for Llama-based models, typically served via local endpoints like Ollama.
 */
export class LlamaAdapter implements LLMAdapter {
  public readonly providerName = 'llama';
  public readonly configSchema = {
    apiKey: { type: 'string', required: false, description: 'Your Llama API Key (optional)' },
    baseURL: { type: 'string', required: true, description: 'Base URL for Llama API (e.g., Ollama endpoint)' },
  };

  /**
   * Generates a completion using a Llama-compatible API.
   * @param {LLMCompletionRequest} request - The completion request details.
   * @returns {Promise<string>} The completed text.
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
   * It assumes an endpoint that lists installed models.
   * @param {object} config - The configuration containing the base URL.
   * @param {string} [config.baseURL] - The base URL of the local API endpoint.
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
 * An adapter for Google's Vertex AI Studio API.
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
   * Generates a completion using the Vertex AI Studio API.
   * @param {LLMCompletionRequest} request - The completion request details.
   * @returns {Promise<string>} The completed text.
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
   * @param {object} config - The configuration containing the API key.
   * @param {string} [config.apiKey] - The API key for authentication.
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

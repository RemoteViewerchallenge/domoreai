import axios from 'axios';
import { getProviderById } from './db/index.js';
import { checkRateLimit, incrementRateLimit } from './rateLimiter.js';
import { countTokens } from './tokenizer.js';
import { llmOpenAI, llmMistral, llmLlama, llmVertexStudio } from '@repo/volcano-sdk';
async function rateLimitPreCheck(providerId, modelId) {
    const provider = await getProviderById(providerId);
    if (!provider) {
        throw new Error('Provider not found');
    }
    // @ts-ignore
    const model = provider.models.find(m => m.id === modelId); // TODO: Fix type
    if (!model) {
        throw new Error('Model not found');
    }
    // @ts-ignore
    if (!model.is_enabled) {
        throw new Error('Model is not enabled');
    }
    // @ts-ignore
    const rateLimitCheck = await checkRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd });
    if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
    }
    return model;
}
/**
 * An adapter for OpenAI and OpenAI-compatible APIs.
 * It handles model discovery and completion generation for services like OpenAI, OpenRouter, and TogetherAI.
 */
export class OpenAIAdapter {
    providerName = 'openai';
    configSchema = {
        apiKey: { type: 'string', required: true, description: 'Your OpenAI API Key' },
        baseURL: { type: 'string', required: false, description: 'Custom base URL for OpenAI-compatible APIs' },
    };
    /**
     * Generates a completion using the OpenAI API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the API key is missing.
     */
    async generateCompletion(request) {
        const model = await rateLimitPreCheck(request.providerId, request.modelId);
        if (!request.config?.apiKey) {
            throw new Error('OpenAI API Key is required.');
        }
        const openai = llmOpenAI({
            model: request.config?.model || 'gpt-3.5-turbo',
            apiKey: request.config.apiKey,
            baseURL: request.config.baseURL,
        });
        const completion = await openai.gen(request.prompt);
        const tokenCount = countTokens(completion);
        await incrementRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd }, tokenCount);
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
    async getModels(config) {
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
export class MistralAdapter {
    providerName = 'mistral';
    configSchema = {
        apiKey: { type: 'string', required: true, description: 'Your Mistral API Key' },
        baseURL: { type: 'string', required: false, description: 'Custom base URL for Mistral API' },
    };
    /**
     * Generates a completion using the Mistral API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the API key is missing.
     */
    async generateCompletion(request) {
        const model = await rateLimitPreCheck(request.providerId, request.modelId);
        if (!request.config?.apiKey) {
            throw new Error('Mistral API Key is required.');
        }
        const mistral = llmMistral({
            model: request.config?.model,
            apiKey: request.config.apiKey,
            baseURL: request.config.baseURL,
        });
        const completion = await mistral.gen(request.prompt);
        const tokenCount = countTokens(completion);
        await incrementRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd }, tokenCount);
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
    async getModels(config) {
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
export class LlamaAdapter {
    providerName = 'llama';
    configSchema = {
        apiKey: { type: 'string', required: false, description: 'Your Llama API Key (optional)' },
        baseURL: { type: 'string', required: true, description: 'Base URL for Llama API (e.g., Ollama endpoint)' },
    };
    /**
     * Generates a completion using a Llama-compatible API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the base URL is missing.
     */
    async generateCompletion(request) {
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
    async getModels(config) {
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
export class VertexStudioAdapter {
    providerName = 'vertex-studio';
    configSchema = {
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
    async generateCompletion(request) {
        const model = await rateLimitPreCheck(request.providerId, request.modelId);
        if (!request.config?.apiKey) {
            throw new Error('Google Cloud API Key is required for Vertex AI Studio.');
        }
        const vertexStudio = llmVertexStudio({
            model: request.config?.model,
            apiKey: request.config.apiKey,
            baseURL: request.config.baseURL,
        });
        const completion = await vertexStudio.gen(request.prompt);
        const tokenCount = countTokens(completion);
        await incrementRateLimit(model.id, { rpm: model.rpm, tpm: model.tpm, rpd: model.rpd }, tokenCount);
        return completion;
    }
    /**
     * Fetches available models from the Google AI Studio API.
     * @param {object} config - The configuration containing the API key.
     * @param {string} [config.apiKey] - The API key for authentication.
     * @returns {Promise<any[]>} A list of model objects.
     * @throws {Error} If the API key is missing.
     */
    async getModels(config) {
        if (!config.apiKey) {
            throw new Error('API Key is required to fetch Google AI Studio models.');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
        const response = await axios.get(url);
        // The API returns an object with a "models" array property
        return response.data.models || [];
    }
}

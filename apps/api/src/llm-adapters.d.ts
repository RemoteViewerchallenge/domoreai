import type { LLMCompletionRequest } from '@repo/common';
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
export declare class OpenAIAdapter implements LLMAdapter {
    readonly providerName = "openai";
    readonly configSchema: {
        apiKey: {
            type: string;
            required: boolean;
            description: string;
        };
        baseURL: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    /**
     * Generates a completion using the OpenAI API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the API key is missing.
     */
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    /**
     * Fetches available models from an OpenAI-compatible API.
     * It handles different response structures from various providers.
     * @param {object} config - The configuration containing the API key and optional base URL.
     * @param {string} [config.apiKey] - The API key for authentication.
     * @param {string} [config.baseURL] - The base URL of the API endpoint.
     * @returns {Promise<any[]>} A list of model objects.
     * @throws {Error} If the API key is missing.
     */
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
/**
 * An adapter for the Mistral API.
 */
export declare class MistralAdapter implements LLMAdapter {
    readonly providerName = "mistral";
    readonly configSchema: {
        apiKey: {
            type: string;
            required: boolean;
            description: string;
        };
        baseURL: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    /**
     * Generates a completion using the Mistral API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the API key is missing.
     */
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    /**
     * Fetches available models from the Mistral API.
     * @param {object} config - The configuration containing the API key and optional base URL.
     * @param {string} [config.apiKey] - The API key for authentication.
     * @param {string} [config.baseURL] - The base URL of the API endpoint.
     * @returns {Promise<any[]>} A list of model objects.
     * @throws {Error} If the API key is missing.
     */
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
/**
 * An adapter for Llama-based models, typically served via local endpoints like Ollama.
 */
export declare class LlamaAdapter implements LLMAdapter {
    readonly providerName = "llama";
    readonly configSchema: {
        apiKey: {
            type: string;
            required: boolean;
            description: string;
        };
        baseURL: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    /**
     * Generates a completion using a Llama-compatible API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the base URL is missing.
     */
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    /**
     * Fetches available models from a Llama-compatible API (e.g., Ollama).
     * It assumes an endpoint that lists installed models.
     * @param {object} config - The configuration containing the base URL.
     * @param {string} [config.baseURL] - The base URL of the local API endpoint.
     * @returns {Promise<any[]>} A list of model objects.
     * @throws {Error} If the base URL is missing.
     */
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
/**
 * An adapter for Google's Vertex AI Studio API.
 */
export declare class VertexStudioAdapter implements LLMAdapter {
    readonly providerName = "vertex-studio";
    readonly configSchema: {
        apiKey: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    /**
     * Generates a completion using the Vertex AI Studio API.
     * @param {LLMCompletionRequest} request - The completion request details.
     * @returns {Promise<string>} The completed text.
     * @throws {Error} If the API key is missing.
     */
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    /**
     * Fetches available models from the Google AI Studio API.
     * @param {object} config - The configuration containing the API key.
     * @param {string} [config.apiKey] - The API key for authentication.
     * @returns {Promise<any[]>} A list of model objects.
     * @throws {Error} If the API key is missing.
     */
    getModels(config: {
        apiKey?: string;
    }): Promise<any[]>;
}

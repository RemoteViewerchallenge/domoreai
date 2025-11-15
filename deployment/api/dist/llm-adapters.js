import { llmOpenAI, llmMistral, llmLlama, llmVertexStudio } from 'volcano-sdk';
import axios from 'axios';
export class OpenAIAdapter {
    providerName = 'openai';
    configSchema = {
        apiKey: { type: 'string', required: true, description: 'Your OpenAI API Key' },
        baseURL: { type: 'string', required: false, description: 'Custom base URL for OpenAI-compatible APIs' },
    };
    async generateCompletion(request) {
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
export class MistralAdapter {
    providerName = 'mistral';
    configSchema = {
        apiKey: { type: 'string', required: true, description: 'Your Mistral API Key' },
        baseURL: { type: 'string', required: false, description: 'Custom base URL for Mistral API' },
    };
    async generateCompletion(request) {
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
export class LlamaAdapter {
    providerName = 'llama';
    configSchema = {
        apiKey: { type: 'string', required: false, description: 'Your Llama API Key (optional)' },
        baseURL: { type: 'string', required: true, description: 'Base URL for Llama API (e.g., Ollama endpoint)' },
    };
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
export class VertexStudioAdapter {
    providerName = 'vertex-studio';
    configSchema = {
        apiKey: {
            type: 'string',
            required: true,
            description: 'Your Google AI Studio API Key. Get one from Google AI Studio under "Get API key".'
        },
    };
    async generateCompletion(request) {
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

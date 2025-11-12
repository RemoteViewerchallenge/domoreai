import { LLMCompletionRequest } from '@repo/common';
export interface LLMAdapter {
    readonly providerName: string;
    readonly configSchema: {
        [key: string]: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
        projectId?: string;
        location?: string;
    }): Promise<any[]>;
}
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
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
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
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
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
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    getModels(config: {
        apiKey?: string;
        baseURL?: string;
    }): Promise<any[]>;
}
export declare class VertexStudioAdapter implements LLMAdapter {
    readonly providerName = "vertex-studio";
    readonly configSchema: {
        apiKey: {
            type: string;
            required: boolean;
            description: string;
        };
    };
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
    getModels(config: {
        apiKey?: string;
    }): Promise<any[]>;
}
//# sourceMappingURL=llm-adapters.d.ts.map
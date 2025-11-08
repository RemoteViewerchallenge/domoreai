export interface LLMCompletionRequest {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    config?: Record<string, any>;
}
export interface LLMProvider {
    id: string;
    displayName: string;
    name: string;
    models: string[];
    configSchema?: Record<string, any>;
}
export interface LLMAdapter {
    providerName: string;
    models: string[];
    generateCompletion(request: LLMCompletionRequest): Promise<string>;
}

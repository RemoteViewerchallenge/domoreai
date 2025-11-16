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
export declare const llmOpenAI: (config: any) => {
    gen: (prompt: string) => Promise<string>;
    listModels: () => Promise<never[]>;
};
export declare const llmMistral: (config: any) => {
    gen: (prompt: string) => Promise<string>;
    listModels: () => Promise<never[]>;
};
export declare const llmLlama: (config: any) => {
    gen: (prompt: string) => Promise<string>;
    listModels: () => Promise<never[]>;
};
export declare const llmVertexStudio: (config: any) => {
    gen: (prompt: string) => Promise<string>;
    listModels: () => Promise<never[]>;
};

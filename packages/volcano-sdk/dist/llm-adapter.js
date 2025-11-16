"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmVertexStudio = exports.llmLlama = exports.llmMistral = exports.llmOpenAI = void 0;
// Placeholder functions for now
const llmOpenAI = (config) => ({
    gen: (prompt) => Promise.resolve(`OpenAI completion for: ${prompt}`),
    listModels: () => Promise.resolve([]),
});
exports.llmOpenAI = llmOpenAI;
const llmMistral = (config) => ({
    gen: (prompt) => Promise.resolve(`Mistral completion for: ${prompt}`),
    listModels: () => Promise.resolve([]),
});
exports.llmMistral = llmMistral;
const llmLlama = (config) => ({
    gen: (prompt) => Promise.resolve(`Llama completion for: ${prompt}`),
    listModels: () => Promise.resolve([]),
});
exports.llmLlama = llmLlama;
const llmVertexStudio = (config) => ({
    gen: (prompt) => Promise.resolve(`Vertex Studio completion for: ${prompt}`),
    listModels: () => Promise.resolve([]),
});
exports.llmVertexStudio = llmVertexStudio;

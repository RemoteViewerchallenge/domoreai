Codebase Documentation: Multi-Provider LLM Gateway
This document provides a comprehensive overview of the Multi-Provider LLM Gateway project. It details the project's philosophy, architecture, core components, and API structure, highlighting the integration of the volcano-sdk for building a resilient, multi-agent AI foundation.

1. Project Philosophy & Overview
This project is a typesafe monorepo designed to create a resilient, multi-provider, and eventually multi-agent, AI gateway. The system consists of:

A Backend API (apps/api): A Node.js/Express service that acts as a gateway to various Large Language Models (LLMs). It leverages the volcano-sdk to manage and interact with different providers like OpenAI, Mistral, and Google Vertex AI.
A Frontend UI (apps/ui): A React/TypeScript single-page application that allows operators to configure and manage the LLM providers used by the backend.
The core philosophy, as outlined in code_rules.md, is Exhaustive Fallbacks. This "try, fallback, exhaust" pattern ensures high availability by attempting to complete a task using all available free resources before failing, making it superior to a simple retry mechanism in a multi-provider environment.

2. System Architecture & Technology Stack
The project is a monorepo containing distinct applications and shared packages.

Backend (apps/api):

Framework: Node.js with Express.
Core SDK: volcano-sdk is used to abstract interactions with different LLM providers. It handles the low-level API calls for text generation (gen) and model discovery.
Provider Abstraction: The backend uses an adapter pattern (llm-adapters.ts) where each provider (OpenAI, Mistral, etc.) has its own adapter class implementing a common LLMAdapter interface. This makes the system modular and easy to extend with new providers.
Database: PostgreSQL (inferred from the pg dependency) is likely used for persisting provider configurations and other state.
Dependencies: axios, cors, dotenv.
Frontend (apps/ui):

Framework: React with TypeScript.
HTTP Client: axios is used for all API communication with the backend.
State Management: Local component state managed via React Hooks (useState, useEffect).
Shared Packages (packages/common):

Contains shared TypeScript interfaces like LLMProvider and LLMCompletionRequest, ensuring type safety and consistency between the frontend and backend.
3. Backend Deep Dive (apps/api)
The backend is the heart of the system, orchestrating LLM requests.

llm-adapters.ts
This file is central to the multi-provider strategy. It defines a standard LLMAdapter interface that each provider-specific class must implement:

typescript
// Simplified from apps/api/src/llm-adapters.ts
export interface LLMAdapter {
  readonly providerName: string;
  readonly configSchema: { /* ... */ };
  generateCompletion(request: LLMCompletionRequest): Promise<string>;
  getModels(config: { /* ... */ }): Promise<any[]>;
}
Implementations: OpenAIAdapter, MistralAdapter, LlamaAdapter, and VertexStudioAdapter are concrete implementations.
volcano-sdk Integration: Each adapter's generateCompletion method uses a corresponding function from volcano-sdk (e.g., llmOpenAI, llmMistral). This significantly simplifies the logic required to call different LLM APIs.
Model Discovery: The getModels method in each adapter fetches the available models for that provider, a crucial feature for the dynamic frontend UI. The OpenAIAdapter shows sophisticated handling for different API response structures from OpenAI-compatible services.
4. Frontend Deep Dive (apps/ui)
The UI provides a simple yet effective interface for managing the backend's LLM configurations. See the previous documentation for a detailed component breakdown. Its primary responsibilities are creating, reading, and deleting provider configurations via REST API calls.

5. API Endpoints (Inferred)
The UI interacts with the backend over a set of RESTful endpoints, which are served by the Express application in apps/api.

GET /llm/configurations: Fetches all saved LLM provider configurations.
POST /llm/configurations: Creates a new LLM provider configuration.
DELETE /llm/configurations/:id: Deletes a specific provider configuration.
GET /llm/provider-types: Fetches the list of supported provider types (e.g., "openai", "mistral") that the backend can handle, likely sourced from the available adapters in llm-adapters.ts.

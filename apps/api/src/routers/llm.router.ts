import { Router, type Request, type Response, type NextFunction } from 'express';
import { LlamaAdapter, MistralAdapter, OpenAIAdapter, VertexStudioAdapter } from '../llm-adapters.js';
import { createProvider, getAllProviders, getProviderById, saveModelsForProvider, updateModel } from '../db/index.js';
import type { LLMProvider } from '@repo/common';
import type { Provider } from '../types.js';

/**
 * A higher-order function to wrap async route handlers and catch errors,
 * passing them to Express's global error handler.
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const llmRouter: Router = Router();

const adapters = {
  openai: new OpenAIAdapter(),
  mistral: new MistralAdapter(),
  llama: new LlamaAdapter(),
  'vertex-studio': new VertexStudioAdapter(),
};

const availableLLMProviderTypes: Omit<LLMProvider, 'id' | 'models' | 'displayName'>[] = Object.values(adapters).map(
  (adapter) => ({
    name: adapter.providerName,
    configSchema: adapter.configSchema,
  }),
);

// Returns the types of providers available (templates)
llmRouter.get('/provider-types', (_req, res) => {
  res.json(availableLLMProviderTypes);
});

// Returns user-defined configurations
llmRouter.get('/configurations', asyncHandler(async (_req, res) => {
  const providers = await getAllProviders();
  res.json(providers.map((p: Provider) => ({
    id: p.id,
    displayName: p.name,
    providerType: p.providerType,
    config: { apiKey: p.apiKey, baseURL: p.baseUrl },
    models: p.models || [],
    isHealthy: p.isHealthy,
    lastCheckedAt: p.lastCheckedAt,
  })));
}));

// Adds a new user-defined configuration
llmRouter.post('/configurations', asyncHandler(async (req, res) => {
  const { displayName, providerType, config } = req.body;

  if (!displayName || !providerType || !config) {
    return res.status(400).json({ error: 'Missing displayName, providerType, or config' });
  }

  const adapter = adapters[providerType as keyof typeof adapters];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown provider type: ${providerType}` });
  }

  const newProvider = await createProvider({
    name: displayName,
    baseUrl: config.baseURL,
    providerType: providerType,
    models: [],
    apiKey: config.apiKey,
    isHealthy: true,
    lastCheckedAt: new Date(),
  });

  let models = [];
  try {
    models = await adapter.getModels(config);
  } catch (modelError: any) {
    console.error(`Failed to fetch models for ${providerType}:`, modelError.response?.data || modelError.message);
    throw new Error(`Could not fetch models from provider. Please check your credentials. (Reason: ${modelError.message})`);
  }

  await saveModelsForProvider(newProvider.id, providerType, models);
  const finalProvider = await getProviderById(newProvider.id);

  res.status(201).json({
    id: finalProvider!.id,
    displayName: finalProvider!.name,
    providerType: providerType,
    config: { apiKey: finalProvider!.apiKey, baseURL: finalProvider!.baseUrl },
    models: finalProvider!.models || [],
    isHealthy: finalProvider!.isHealthy,
    lastCheckedAt: finalProvider!.lastCheckedAt,
  });
}));

// Triggers an update for a provider's models
llmRouter.post('/configurations/:id/update-models', async (req, res) => {
  // ... implementation ...
});

llmRouter.put('/models/:modelId', async (req, res) => {
  // ... implementation ...
});

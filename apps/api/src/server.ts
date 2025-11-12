import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import {
  OpenAIAdapter,
  MistralAdapter,
  LlamaAdapter,
  VertexStudioAdapter,
  LLMAdapter,
} from './llm-adapters.js';
import {
  initializeDatabase,
  createProvider,
  getAllProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
  saveModelsForProvider,
} from './db/index.js';

const app = express();
const port = 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({}); // no context

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const adapters: Record<string, LLMAdapter> = {
  'openai': new OpenAIAdapter(),
  'mistral': new MistralAdapter(),
  'llama': new LlamaAdapter(),
  'vertex-studio': new VertexStudioAdapter(),
};

// Endpoint to get all provider configurations
app.get('/llm/configurations', async (req, res) => {
  try {
    const providers = await getAllProviders();
    const formattedProviders = providers.map((p: any) => ({
      id: p.id,
      displayName: p.name,
      providerType: p.providerType,
      config: { apiKey: p.apiKey, baseURL: p.baseUrl },
      models: p.models || [],
      isHealthy: p.isHealthy,
      lastCheckedAt: p.lastCheckedAt,
    }));
    res.json(formattedProviders);
  } catch (error: any) {
    console.error('Error getting providers:', error.message);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Endpoint to get all available provider types
app.get('/llm/provider-types', (req, res) => {
  const providerTypes = Object.keys(adapters).map((key) => ({
    id: key,
    displayName: key.charAt(0).toUpperCase() + key.slice(1), // Simple display name
  }));
  res.json(providerTypes);
});

// Endpoint to create a new provider configuration
app.post('/llm/configurations', async (req, res) => {
  try {
    const { displayName, providerType, config } = req.body;
    const newProvider = await createProvider({
      name: displayName,
      providerType,
      apiKey: config.apiKey,
      baseUrl: config.baseURL,
      isHealthy: false, // Default value
      lastCheckedAt: null, // Default value
      models: [], // Default value
    });

    // Correctly fetch models and then save them
    (async () => {
      try {
        const adapter = adapters[providerType];
        if (adapter) {
          const models = await adapter.getModels({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
          });
          await saveModelsForProvider(newProvider.id, providerType, models);
        }
      } catch (error) {
        console.error(`Failed to fetch and save models for new provider ${newProvider.id}:`, (error as Error).message);
      }
    })();

    res.status(201).json(newProvider);
  } catch (error: any) {
    console.error('Error creating provider:', error.message);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// Endpoint to get a single provider by ID
app.get('/llm/configurations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await getProviderById(id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const formattedProvider = {
      id: provider.id,
      displayName: provider.name,
      providerType: provider.providerType,
      config: { apiKey: provider.apiKey, baseURL: provider.baseUrl },
      models: provider.models || [],
    };
    res.json(formattedProvider);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get provider' });
  }
});

// Endpoint to update a provider configuration
app.put('/llm/configurations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, config } = req.body;
    const updates: any = {};
    if (displayName) {
      updates.name = displayName;
    }
    if (config) {
      if (config.apiKey) updates.apiKey = config.apiKey;
      if (config.baseURL) updates.baseUrl = config.baseURL;
    }

    const updatedProvider = await updateProvider(id, updates);
    res.json(updatedProvider);
  } catch (error: any) {
    console.error(`Error updating provider ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// Endpoint to get raw models data from a provider for debugging
app.get('/llm/configurations/:id/debug-models', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await getProviderById(id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const adapter = adapters[provider.providerType];
    if (!adapter) {
      return res.status(400).json({
        error: `Adapter for provider type '${provider.providerType}' not found`,
      });
    }

    const config = {
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    };

    const models = await adapter.getModels(config);
    res.json(models);
  } catch (error: any) {
    console.error(`Error getting raw models for provider ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Failed to get raw models list', details: error.message });
  }
});
// ... (other REST endpoints would go here)

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`🟢 API server listening at http://localhost:${port}`);
    });
  })
  .catch(console.error);
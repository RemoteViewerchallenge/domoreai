import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIAdapter, MistralAdapter, LlamaAdapter, VertexStudioAdapter } from './llm-adapters.js';
import { initializeDatabase, createProvider, getAllProviders, getProviderById, updateProvider, deleteProvider, saveModelsForProvider, updateModel } from './db/index.js';
import type { LLMProvider } from '@repo/common';
import { Provider } from './types.js';
import { checkProviderHealth } from './utils/healthCheck.js';

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Define available LLM provider types and their schemas (these are the templates)
const adapters = {
  openai: new OpenAIAdapter(),
  mistral: new MistralAdapter(),
  llama: new LlamaAdapter(),
  'vertex-studio': new VertexStudioAdapter(),
};

const availableLLMProviderTypes = Object.values(adapters).map(adapter => ({
  name: adapter.providerName,
  configSchema: adapter.configSchema,
  models: [], // This is now just a placeholder; actual models are in the DB.
}));

app.get('/', (req, res) => {
  res.send('Hello from the API!');
});

// Returns the types of providers available (templates)
app.get('/llm/provider-types', (req, res) => {
  res.json(availableLLMProviderTypes);
});

// Returns user-defined configurations
app.get('/llm/configurations', async (req, res) => {
  try {
    const providers = await getAllProviders();
    res.json(providers.map((p: Provider) => {
      return {
        id: p.id,
        displayName: p.name,
        providerType: p.providerType,
        config: { apiKey: p.apiKey, baseURL: p.baseUrl },
        models: p.models || [], // Directly return the models from the JSONB column
        isHealthy: p.isHealthy,
        lastCheckedAt: p.lastCheckedAt,
      };
    }));
  } catch (error) {
    console.error('Error fetching configurations:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Adds a new user-defined configuration
app.post('/llm/configurations', async (req, res) => {
  const { displayName, providerType, config } = req.body;

  // Basic validation
  if (!displayName || !providerType || !config) {
    return res.status(400).json({ error: 'Missing displayName, providerType, or config' });
  }

  const adapter = adapters[providerType as keyof typeof adapters];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown provider type: ${providerType}` });
  }

  try {
    // 1. Create the provider entry in the database
    const newProvider = await createProvider({
      name: displayName,
      baseUrl: config.baseURL, // This will be undefined for vertex-studio, which is now OK
      providerType: providerType,
      models: [], // Initialize with empty models array
      apiKey: config.apiKey,
      isHealthy: true, // We can add a health check later if needed
      lastCheckedAt: new Date(),
    });

    // 2. Fetch the models from the provider's API, with detailed error logging
    let models = [];
    try {
      models = await adapter.getModels(config);
    } catch (modelError: any) {
      // If fetching models fails, we should not create the provider.
      // Instead, we re-throw the error with more context.
      console.error(`Failed to fetch models for ${providerType}:`, modelError.response?.data || modelError.message);
      throw new Error(`Could not fetch models from provider. Please check your credentials. (Reason: ${modelError.message})`);
    }

    // 3. Save the returned models directly into the new JSONB column
  await saveModelsForProvider(newProvider.id, providerType, models);

    // 4. Fetch the complete provider data to return to the client
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
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('Error creating provider:', errorMessage);
    res.status(500).json({ error: `Failed to create provider: ${errorMessage}` });
  }
});

// Triggers an update for a provider's models
app.post('/llm/configurations/:id/update-models', async (req, res) => {
  const { id } = req.params;
  try {
    const provider = await getProviderById(id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const adapter = adapters[provider.providerType as keyof typeof adapters];
    if (!adapter) {
      return res.status(400).json({ error: `Unknown provider type: ${provider.providerType}` });
    }

    const models = await adapter.getModels({ apiKey: provider.apiKey, baseURL: provider.baseUrl });
  await saveModelsForProvider(provider.id, provider.providerType, models);

    res.status(200).json({ message: `Successfully updated models for ${provider.name}. Found ${models.length} models.` });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`Error updating models for provider ${id}:`, errorMessage);
    res.status(500).json({ error: `Failed to update models: ${errorMessage}` });
  }
});

app.put('/llm/models/:modelId', async (req, res) => {
    const { modelId } = req.params;
    const { providerType, ...updates } = req.body;

    if (!providerType) {
        return res.status(400).json({ error: 'Missing providerType' });
    }

    try {
        await updateModel(modelId, providerType, updates);
        res.status(200).json({ message: 'Model updated successfully' });
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`Error updating model ${modelId}:`, errorMessage);
        res.status(500).json({ error: `Failed to update model: ${errorMessage}` });
    }
});

// Deletes a user-defined configuration
app.delete('/llm/configurations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteProvider(id);
    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting provider:', (error as Error).message);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

app.post('/llm/complete', async (req, res) => {
  const { configurationId, model, modelId, prompt, maxTokens, temperature } = req.body;

  if (!configurationId || !model || !modelId || !prompt) {
    return res.status(400).json({ error: 'Missing configurationId, model, modelId, or prompt' });
  }

  try {
    const configuredProvider = await getProviderById(configurationId);
    if (!configuredProvider) {
      return res.status(404).json({ error: 'Configured provider not found' });
    }

    const adapter = adapters[configuredProvider.providerType as keyof typeof adapters];

    if (!adapter) {
      return res.status(400).json({ error: `Unsupported provider type: ${configuredProvider.name}` });
    }

    const completion = await adapter.generateCompletion({ providerId: configurationId, modelId, prompt, maxTokens, temperature, config: { apiKey: configuredProvider.apiKey, baseURL: configuredProvider.baseUrl, model: model } });
    res.json({ completion, model, provider: configuredProvider.name, id: configuredProvider.id });
  } catch (error: any) {
    console.error('Error generating completion:', error);
    res.status(500).json({ error: error.message || 'Failed to generate completion' });
  }
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
  });
}).catch((error: Error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

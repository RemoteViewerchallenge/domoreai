import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { vfsSessionService } from './services/vfsSession.service.js';
import { OpenAIAdapter, MistralAdapter, LlamaAdapter, VertexStudioAdapter, LLMAdapter } from './llm-adapters.js';
import { initializeDatabase, createProvider, getAllProviders, getProviderById, updateProvider, deleteProvider, saveModelsForProvider } from './db/index.js';
import type { LLMProvider } from '@repo/common';
import { Provider } from './types.js';
export type { AppRouter } from './routers/index.js';

const app = express();
const port = 4000;
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const adapters: { [key: string]: LLMAdapter } = {
    'openai': new OpenAIAdapter(),
    'mistral': new MistralAdapter(),
    'llama': new LlamaAdapter(),
    'vertex-studio': new VertexStudioAdapter(),
};


// Endpoint to get all provider configurations
app.get('/llm/configurations', async (req: Request, res: Response) => {
    try {
        const providers = await getAllProviders();
        const formattedProviders = providers.map(p => ({
            id: p.id,
            displayName: p.name,
            providerType: p.providerType,
            config: { apiKey: p.apiKey, baseURL: p.baseUrl },
            models: p.models || [],
            isHealthy: p.isHealthy,
            lastCheckedAt: p.lastCheckedAt,
        }));
        res.json(formattedProviders);
    } catch (error) {
        console.error('Error getting providers:', (error as Error).message);
        res.status(500).json({ error: 'Failed to get providers' });
    }
});

app.post('/llm/configurations', async (req: Request, res: Response) => {
    const { providerType, name, config } = req.body;

    if (!providerType || !name || !config) {
        return res.status(400).json({ error: 'Missing providerType, name, or config' });
    }

    const adapter = adapters[providerType as keyof typeof adapters];
    if (!adapter) {
        return res.status(400).json({ error: `Unknown provider type: ${providerType}` });
    }

    try {
        const models = await adapter.getModels(config);

        const newProvider = await createProvider({
            name,
            providerType,
            apiKey: config.apiKey,
            baseUrl: config.baseURL,
            models: models,
            isHealthy: true,
            lastCheckedAt: new Date(),
        });

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
    } catch (error: any) {
        const errorMessage = (error as Error).message;
        console.error(`Failed to create provider for ${providerType}:`, error.response?.data || error.message);
        res.status(500).json({ error: `Could not create provider. Please check your credentials. (Reason: ${errorMessage})` });
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
  const { configurationId, model, prompt, maxTokens, temperature } = req.body;

  if (!configurationId || !model || !prompt) {
    return res.status(400).json({ error: 'Missing configurationId, model, or prompt' });
  }

  try {
    const configuredProvider = await getProviderById(configurationId);
    if (!configuredProvider) {
      return res.status(404).json({ error: 'Configured provider not found' });
    }
    const adapter = adapters[configuredProvider.providerType as keyof typeof adapters];
    const completion = await adapter.generateCompletion({ prompt, maxTokens, temperature, config: { apiKey: configuredProvider.apiKey, baseURL: configuredProvider.baseUrl, model: model } });
    res.json({ completion, model, provider: configuredProvider.name, id: configuredProvider.id });
  } catch (error: any) {
    console.error('Error generating completion:', error);
    res.status(500).json({ error: error.message || 'Failed to generate completion' });
  }
});

// Endpoint to update a provider configuration
app.put('/llm/configurations/:id', async (req: Request, res: Response) => {
    try {
        const updatedProvider = await updateProvider(req.params.id, req.body);
        if (updatedProvider) {
            res.json(updatedProvider);
        } else {
            res.status(404).json({ message: 'Provider not found.' });
        }
    } catch (error) {
        console.error(`Failed to update provider ${req.params.id}:`, error);
        res.status(500).json({ message: 'Failed to update provider configuration.' });
    }
});

// Endpoint to get a VFS token for a given workspace
app.post('/workspaces/:workspaceId/vfs-token', (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Missing workspaceId' });
    }
    const token = vfsSessionService.createSession(workspaceId);
    res.json({ token });
});

initializeDatabase().then(() => {
    new WebSocketService(server);
    server.listen(port, () => {
        console.log(`API server listening at http://localhost:${port}`);
    });
}).catch(console.error);

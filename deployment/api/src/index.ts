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

/**
 * A map of provider types to their corresponding adapter instances.
 * This allows for dynamic handling of different LLM providers.
 * @type {{ [key: string]: LLMAdapter }}
 */
const adapters: { [key: string]: LLMAdapter } = {
    'openai': new OpenAIAdapter(),
    'mistral': new MistralAdapter(),
    'llama': new LlamaAdapter(),
    'vertex-studio': new VertexStudioAdapter(),
};


/**
 * @route GET /llm/configurations
 * @description Fetches all LLM provider configurations, including their models and health status.
 * @returns {Response<LLMProvider[]>} A JSON array of provider objects.
 * @throws {500} If there is an error fetching the providers from the database.
 */
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

/**
 * @route POST /llm/configurations
 * @description Creates a new LLM provider configuration. It validates the provider type,
 * fetches models from the provider's API, and saves the new configuration to the database.
 * @param {object} req.body - The request body.
 * @param {string} req.body.providerType - The type of the provider (e.g., 'openai', 'mistral').
 * @param {string} req.body.name - A display name for the provider configuration.
 * @param {object} req.body.config - The configuration object, including API key and base URL.
 * @returns {Response<LLMProvider>} The newly created provider object.
 * @throws {400} If the provider type is unknown or required fields are missing.
 * @throws {500} If there is an error fetching models or saving the provider.
 */
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

/**
 * @route POST /llm/configurations/:id/update-models
 * @description Triggers a manual update of the model list for a specific provider.
 * It fetches the latest models from the provider's API and saves them to the database.
 * @param {object} req.params - The URL parameters.
 * @param {string} req.params.id - The ID of the provider configuration to update.
 * @returns {Response<{ message: string }>} A success message with the number of models found.
 * @throws {404} If the provider is not found.
 * @throws {400} If the provider type is unknown.
 * @throws {500} If there is an error fetching or saving the models.
 */
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

/**
 * @route DELETE /llm/configurations/:id
 * @description Deletes a provider configuration from the database.
 * @param {object} req.params - The URL parameters.
 * @param {string} req.params.id - The ID of the provider configuration to delete.
 * @returns {Response<void>} A 204 No Content response on successful deletion.
 * @throws {500} If there is an error deleting the provider.
 */
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

/**
 * @route POST /llm/complete
 * @description Generates a completion from a specified model using a given provider configuration.
 * @param {object} req.body - The request body.
 * @param {string} req.body.configurationId - The ID of the provider configuration to use.
 * @param {string} req.body.model - The model to use for the completion.
 * @param {string} req.body.prompt - The prompt to send to the model.
 * @param {number} [req.body.maxTokens] - The maximum number of tokens to generate.
 * @param {number} [req.body.temperature] - The temperature for the completion.
 * @returns {Response<{ completion: any, model: string, provider: string, id: string }>} The completion response.
 * @throws {400} If required fields are missing.
 * @throws {404} If the provider configuration is not found.
 * @throws {500} If there is an error generating the completion.
 */
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

/**
 * @route PUT /llm/configurations/:id
 * @description Updates an existing provider configuration.
 * @param {object} req.params - The URL parameters.
 * @param {string} req.params.id - The ID of the provider configuration to update.
 * @param {object} req.body - The provider fields to update.
 * @returns {Response<Provider>} The updated provider object.
 * @throws {404} If the provider is not found.
 * @throws {500} If there is an error updating the provider.
 */
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

/**
 * @route POST /workspaces/:workspaceId/vfs-token
 * @description Creates a virtual file system (VFS) session token for a given workspace.
 * This token can be used to authenticate subsequent VFS operations.
 * @param {object} req.params - The URL parameters.
 * @param {string} req.params.workspaceId - The ID of the workspace to create a session for.
 * @returns {Response<{ token: string }>} A JSON object containing the VFS session token.
 * @throws {400} If the workspaceId is missing.
 */
app.post('/workspaces/:workspaceId/vfs-token', (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Missing workspaceId' });
    }
    const token = vfsSessionService.createSession(workspaceId);
    res.json({ token });
});

/**
 * Initializes the database and starts the Express server.
 * This function ensures that the database is ready before the server starts accepting requests.
 * It also initializes the WebSocket service.
 */
initializeDatabase().then(() => {
    new WebSocketService(server);
    server.listen(port, () => {
        console.log(`API server listening at http://localhost:${port}`);
    });
}).catch(console.error);

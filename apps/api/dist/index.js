import express from 'express';
import cors from 'cors';
import { OpenAIAdapter, MistralAdapter, LlamaAdapter, VertexStudioAdapter } from './llm-adapters.js';
import { initializeDatabase, createProvider, getAllProviders, getProviderById, updateProvider, deleteProvider, saveModelsForProvider } from './db/index.js';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
/**
 * The Express application instance.
 * @type {express.Application}
 */
const app = express();
/**
 * The port the server listens on.
 * @type {number}
 */
const port = 4000;
app.use(cors());
app.use(express.json());
app.use('/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
}));
/**
 * A map of available LLM adapters, keyed by provider type.
 * @type {Object.<string, LLMAdapter>}
 */
const adapters = {
    'openai': new OpenAIAdapter(),
    'mistral': new MistralAdapter(),
    'llama': new LlamaAdapter(),
    'vertex-studio': new VertexStudioAdapter(),
};
/**
 * @route GET /llm/configurations
 * @description Endpoint to get all provider configurations.
 * @returns {Response} - A JSON response containing the list of providers.
 */
app.get('/llm/configurations', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error getting providers:', error.message);
        res.status(500).json({ error: 'Failed to get providers' });
    }
});
/**
 * @route POST /llm/configurations
 * @description Endpoint to create a new provider configuration.
 * @param {Request} req - The request object, containing the provider configuration in the body.
 * @returns {Response} - A JSON response containing the newly created provider.
 */
app.post('/llm/configurations', async (req, res) => {
    const { providerType, name, config } = req.body;
    if (!providerType || !name || !config) {
        return res.status(400).json({ error: 'Missing providerType, name, or config' });
    }
    const adapter = adapters[providerType];
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
            id: finalProvider.id,
            displayName: finalProvider.name,
            providerType: providerType,
            config: { apiKey: finalProvider.apiKey, baseURL: finalProvider.baseUrl },
            models: finalProvider.models || [],
            isHealthy: finalProvider.isHealthy,
            lastCheckedAt: finalProvider.lastCheckedAt,
        });
    }
    catch (error) {
        const errorMessage = error.message;
        console.error(`Failed to create provider for ${providerType}:`, error.response?.data || error.message);
        res.status(500).json({ error: `Could not create provider. Please check your credentials. (Reason: ${errorMessage})` });
    }
});
/**
 * @route POST /llm/configurations/:id/update-models
 * @description Triggers an update for a provider's models.
 * @param {Request} req - The request object, containing the provider ID in the params.
 * @returns {Response} - A JSON response indicating the result of the update.
 */
app.post('/llm/configurations/:id/update-models', async (req, res) => {
    const { id } = req.params;
    try {
        const provider = await getProviderById(id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        const adapter = adapters[provider.providerType];
        if (!adapter) {
            return res.status(400).json({ error: `Unknown provider type: ${provider.providerType}` });
        }
        const models = await adapter.getModels({ apiKey: provider.apiKey, baseURL: provider.baseUrl });
        await saveModelsForProvider(provider.id, provider.providerType, models);
        res.status(200).json({ message: `Successfully updated models for ${provider.name}. Found ${models.length} models.` });
    }
    catch (error) {
        const errorMessage = error.message;
        console.error(`Error updating models for provider ${id}:`, errorMessage);
        res.status(500).json({ error: `Failed to update models: ${errorMessage}` });
    }
});
/**
 * @route DELETE /llm/configurations/:id
 * @description Deletes a user-defined configuration.
 * @param {Request} req - The request object, containing the provider ID in the params.
 * @returns {Response} - A 204 No Content response on success.
 */
app.delete('/llm/configurations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteProvider(id);
        res.status(204).send(); // No Content
    }
    catch (error) {
        console.error('Error deleting provider:', error.message);
        res.status(500).json({ error: 'Failed to delete provider' });
    }
});
/**
 * @route POST /llm/complete
 * @description Generates a completion from a specific provider and model.
 * @param {Request} req - The request object, containing the configuration ID, model, prompt, and other parameters in the body.
 * @returns {Response} - A JSON response containing the generated completion.
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
        const adapter = adapters[configuredProvider.providerType];
        const completion = await adapter.generateCompletion({ prompt, maxTokens, temperature, config: { apiKey: configuredProvider.apiKey, baseURL: configuredProvider.baseUrl, model: model } });
        res.json({ completion, model, provider: configuredProvider.name, id: configuredProvider.id });
    }
    catch (error) {
        console.error('Error generating completion:', error);
        res.status(500).json({ error: error.message || 'Failed to generate completion' });
    }
});
/**
 * @route PUT /llm/configurations/:id
 * @description Endpoint to update a provider configuration.
 * @param {Request} req - The request object, containing the provider ID in the params and the updated configuration in the body.
 * @returns {Response} - A JSON response containing the updated provider.
 */
app.put('/llm/configurations/:id', async (req, res) => {
    try {
        const updatedProvider = await updateProvider(req.params.id, req.body);
        if (updatedProvider) {
            res.json(updatedProvider);
        }
        else {
            res.status(404).json({ message: 'Provider not found.' });
        }
    }
    catch (error) {
        console.error(`Failed to update provider ${req.params.id}:`, error);
        res.status(500).json({ message: 'Failed to update provider configuration.' });
    }
});
/**
 * Initializes the database and starts the Express server.
 */
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`API server listening at http://localhost:${port}`);
    });
}).catch(console.error);

<<<<<<< HEAD
import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createTRPCContext as createContext } from './trpc.js';
import { db } from './db.js';
import { LlamaAdapter, MistralAdapter, OpenAIAdapter, VertexStudioAdapter } from './llm-adapters.js';
import { createProvider, getAllProviders, getProviderById, saveModelsForProvider, updateModel } from './db/index.js';
/**
 * Initializes and starts the application server.
 */
async function startServer() {
    const app = express();
    const server = http.createServer(app);
    const port = 4000;
    // Apply essential middlewares
    // Add request logging
    app.use(morgan('dev'));
    app.use(cors({
        origin: 'http://localhost:5173',
    }));
    app.use(express.json());
    // Setup tRPC endpoint
    app.use('/trpc', createExpressMiddleware({
        router: appRouter,
        createContext,
        onError({ path, error }) {
            console.error(`tRPC Error on '${path}':`, error);
        },
    }));
    // Initialize WebSocket service
    const wsService = new WebSocketService(server);
    const adapters = {
        openai: new OpenAIAdapter(),
        mistral: new MistralAdapter(),
        llama: new LlamaAdapter(),
        'vertex-studio': new VertexStudioAdapter(),
    };
    const availableLLMProviderTypes = Object.values(adapters).map((adapter) => ({
        name: adapter.providerName,
        configSchema: adapter.configSchema,
    }));
    // Returns the types of providers available (templates)
    app.get('/llm/provider-types', (_req, res) => {
        res.json(availableLLMProviderTypes);
    });
    // Returns user-defined configurations
    app.get('/llm/configurations', async (_req, res) => {
        try {
            const providers = await getAllProviders();
            res.json(providers.map((p) => {
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
        }
        catch (error) {
            console.error('Error fetching configurations:', error.message);
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
        const adapter = adapters[providerType];
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
            }
            catch (modelError) {
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
    app.put('/llm/models/:modelId', async (req, res) => {
        const { modelId } = req.params;
        const { providerType, ...updates } = req.body;
        if (!providerType) {
            return res.status(400).json({ error: 'Missing providerType' });
        }
        try {
            await updateModel(modelId, providerType, updates);
            res.status(200).json({ message: 'Model updated successfully' });
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`Error updating model ${modelId}:`, errorMessage);
            res.status(500).json({ error: `Failed to update model: ${errorMessage}` });
        }
    });
    server.listen(port, () => {
        console.log(`API server listening at http://localhost:${port}`);
    });
    const gracefulShutdown = (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            console.log('HTTP server closed.');
            wsService.close(); // Assuming WebSocketService has a .close() method
            await db.$disconnect();
            console.log('Database connection closed.');
            process.exit(0);
        });
    };
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
startServer();
//# sourceMappingURL=index.js.map
=======
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { vfsSessionService } from './services/vfsSession.service.js';
import { OpenAIAdapter, MistralAdapter, LlamaAdapter, VertexStudioAdapter } from './llm-adapters.js';
import { initializeDatabase, createProvider, getAllProviders, getProviderById, updateProvider, deleteProvider, saveModelsForProvider } from './db/index.js';
const app = express();
const port = 4000;
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
const adapters = {
    'openai': new OpenAIAdapter(),
    'mistral': new MistralAdapter(),
    'llama': new LlamaAdapter(),
    'vertex-studio': new VertexStudioAdapter(),
};
// Endpoint to get all provider configurations
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
// Triggers an update for a provider's models
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
// Deletes a user-defined configuration
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
// Endpoint to update a provider configuration
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
>>>>>>> integration/ide-layout

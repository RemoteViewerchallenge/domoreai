import { Router } from 'express';
import { z } from 'zod';
import { ProviderManager } from '../services/ProviderManager.js';
import { db } from '../db.js';
import { encrypt } from '../utils/encryption.js';

export const llmRouter: Router = Router();

// Get all aggregated models
llmRouter.get('/models', async (req, res) => {
  try {
    const models = await ProviderManager.getAllModels();
    res.json({ data: models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Chat completion
llmRouter.post('/chat/completions', async (req, res) => {
  try {
    // 1. Validate Input
    const schema = z.object({
      providerId: z.string(),
      model: z.string(),
      messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string()
      })),
      temperature: z.number().optional().default(0.7),
      max_tokens: z.number().optional().default(1000)
    });

    const input = schema.parse(req.body);

    // 2. Get SDK Provider
    const provider = ProviderManager.getProvider(input.providerId);
    if (!provider) {
      return res.status(404).json({ 
        error: 'Provider_Not_Found', 
        message: `The provider '${input.providerId}' is not active.` 
      });
    }

    // 3. Execute via SDK
    // This abstraction allows the provider to handle retries/rate-limits internally
    const content = await provider.generateCompletion({
      modelId: input.model,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.max_tokens
    });

    // 4. Standardized Response
    res.json({
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: input.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }],
    });

  } catch (error: any) {
    console.error('Completion Request Failed:', error);
    
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation_Error', details: error.errors });
    }

    res.status(500).json({ 
      error: 'Internal_Server_Error', 
      message: error.message || 'An unexpected error occurred during generation.' 
    });
  }
});

// Manage Providers (CRUD)
llmRouter.get('/configurations', async (req, res) => {
  try {
    const configs = await db.providerConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Don't return the full API key
    const safeConfigs = configs.map((c: any) => ({
      ...c,
      apiKey: '********' 
    }));
    res.json(safeConfigs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

llmRouter.post('/configurations', async (req, res) => {
  const { label, type, apiKey, baseURL } = req.body;
  
  if (!label || !type || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const encryptedKey = encrypt(apiKey);
    const config = await db.providerConfig.create({
      data: {
        label,
        type,
        apiKey: encryptedKey,
        baseURL,
        isEnabled: true
      }
    });
    
    // Re-initialize ProviderManager to pick up new provider
    await ProviderManager.initialize();
    
    res.json({ ...config, apiKey: '********' });
  } catch (error: any) {
    console.error('Failed to create provider config:', error);
    res.status(500).json({ error: error.message });
  }
});

llmRouter.delete('/configurations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.providerConfig.delete({ where: { id } });
    await ProviderManager.initialize();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

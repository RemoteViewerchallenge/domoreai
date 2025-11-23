import { Router } from 'express';
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
  const { providerId, model, messages, temperature, max_tokens } = req.body;
  
  if (!providerId) {
    return res.status(400).json({ error: 'providerId is required' });
  }

  const provider = ProviderManager.getProvider(providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  try {
    const result = await provider.generateCompletion({
      modelId: model,
      messages,
      temperature,
      max_tokens
    });
    // Return OpenAI-compatible response format
    res.json({
      id: 'chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: result },
        finish_reason: 'stop'
      }]
    });
  } catch (error: any) {
    console.error('Completion failed:', error);
    res.status(500).json({ error: error.message });
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

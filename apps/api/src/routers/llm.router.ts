import { Router } from 'express';
import { z } from 'zod';
import { ProviderManager } from '../services/ProviderManager.js';
import { db } from '../db.js';
import { providerConfigs } from '../db/schema.js';
import { encrypt } from '../utils/encryption.js';
import { selectCandidateModels } from '../lib/modelSelector.js';
import { UsageCollector } from '../services/UsageCollector.js';
import { eq, desc } from 'drizzle-orm';

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

    // 2. Get Candidates
    const candidates = await selectCandidateModels({
        model: input.model,
        // Optional: Add other criteria here if passed in request
    });

    if (candidates.length === 0) {
        return res.status(404).json({ error: 'No_Models_Found', message: 'No models available matching criteria.' });
    }

    let lastError = null;

    // 3. Cascading Fallback Loop
    for (const model of candidates) {
        // a. Check Rate Limit (Pre-flight)
        const allowed = await UsageCollector.checkAndIncrementRateLimit(
            model.providerConfigId, 
            model.limitRequestRate || 1000, // Default to high limit if not set
            model.limitWindow || 60
        );

        if (!allowed) {
            console.warn(`Rate limit exceeded for ${model.name} (${model.provider}), trying next...`);
            continue;
        }

        try {
            const provider = ProviderManager.getProvider(model.providerConfigId);
            if (!provider) {
                console.warn(`Provider ${model.provider} not active, skipping.`);
                continue;
            }

            const start = Date.now();
            // b. Execute Request
            const result = await provider.generateCompletion({
                modelId: model.id,
                messages: input.messages,
                temperature: input.temperature,
                max_tokens: input.max_tokens
            });
            
            // Handle new return signature (object with headers) or legacy string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content = typeof result === 'string' ? result : (result as any).content;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const headers = typeof result === 'object' ? (result as any).headers : {};

            // Update Dynamic Limits (Smart Rate Limiting)
            if (headers && Object.keys(headers).length > 0) {
                await UsageCollector.updateDynamicLimits(model.providerConfigId, headers);
            }

            const duration = Date.now() - start;

            // Estimate tokens (rough approximation: 4 chars = 1 token)
            const promptText = input.messages.map(m => m.content).join(' ');
            const tokensIn = Math.ceil(promptText.length / 4);
            const tokensOut = Math.ceil(content.length / 4);

            // c. Log Success (Post-flight)
            UsageCollector.logRequest({
                modelId: model.id,
                providerConfigId: model.providerConfigId,
                tokensIn,
                tokensOut,
                status: 'SUCCESS',
                durationMs: duration
            });

            // d. Return Response
            return res.json({
                id: `chatcmpl-${crypto.randomUUID()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model.name, // Return the ACTUAL model used
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content },
                    finish_reason: 'stop'
                }],
            });

        } catch (error: any) {
            console.error(`Failed with ${model.name}:`, error.message);
            lastError = error;
            
            // Log Failure
            UsageCollector.logRequest({
                modelId: model.id,
                providerConfigId: model.providerConfigId,
                tokensIn: 0,
                tokensOut: 0,
                status: 'FAILURE',
                durationMs: 0
            });
            
            // Continue to next candidate
        }
    }

    // 4. All Failed
    res.status(500).json({ 
      error: 'All_Providers_Failed', 
      message: lastError?.message || 'No available providers could fulfill the request.' 
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
    const configs = await db.select().from(providerConfigs).orderBy(desc(providerConfigs.createdAt));
    
    // Don't return the full API key
    const safeConfigs = configs.map((c) => ({
      ...c,
      apiKey: '********' 
    }));
    res.json(safeConfigs);
  } catch (error) {
    console.error('Failed to fetch configurations:', error);
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
    const [config] = await db.insert(providerConfigs).values({
        label,
        type,
        apiKey: encryptedKey,
        baseURL,
        isEnabled: true
    }).returning();
    
    // Re-initialize ProviderManager to pick up new provider
    await ProviderManager.initialize();
    await ProviderManager.syncModelsToRegistry();
    
    res.json({ ...config, apiKey: '********' });
  } catch (error: any) {
    console.error('Failed to create provider config:', error);
    res.status(500).json({ error: error.message });
  }
});

llmRouter.delete('/configurations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(providerConfigs).where(eq(providerConfigs.id, id));
    await ProviderManager.initialize();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

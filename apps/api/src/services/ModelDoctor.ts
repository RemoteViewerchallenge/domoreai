import { z } from 'zod';
import { db } from '../db.js';
import { modelRegistry, providerConfigs, modelCapabilities } from '../db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import { createVolcanoAgent } from './AgentFactory.js';
import { webScraperTool } from '../tools/webScraper.js';
// cspell:ignore uuidv
import { v4 as uuidv4 } from 'uuid';

interface Agent {
  generate: (prompt: string) => Promise<string>;
}

interface ModelRecord {
  id: string;
  modelId: string;
  providerId: string;
  modelName: string | null;
  isFree: boolean | null;
  isActive: boolean | null;
  source: string | null;
  costPer1k: number | null;
  capabilityTags: string[] | null;
  providerData: unknown;
  aiData: unknown;
  specs: unknown;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  updatedAt: Date | null;
}

interface ProviderConfig {
  id: string;
  type: string;
}

interface InferenceResult {
  confidence: 'high' | 'low';
  data: Record<string, unknown> | null;
}

export interface ModelCapabilitiesInferred {
  contextWindow: number;
  maxOutput: number;
  hasVision: boolean;
  hasTTS: boolean;
  hasAudioInput?: boolean;
  hasAudioOutput?: boolean;
  hasImageGen: boolean;
  isMultimodal: boolean;
  supportsFunctionCalling: boolean;
  supportsJsonMode: boolean;
}

export class ModelDoctor {
  // Single-step validation: takes a JSON and attempts to "heal" it into a valid schema
  public async heal<T>(data: Record<string, unknown>, schema: z.ZodSchema<T>, modelId: string): Promise<T | Record<string, unknown>> {
    console.log(`[ModelDoctor] Healing data for ${modelId}...`);
    // Placeholder for actual validation logic
    await Promise.resolve(); // satisfy async

    const validation = schema.safeParse(data);

    if (validation.success) {
      return validation.data;
    }

    // 1. FAST PATH: If data is usable but imperfect, return it with metadata
    // This ensures the application KEEPS RUNNING.
    console.warn(`[ModelDoctor] Schema mismatch. Returning raw data for UI.`);
    
    // Attach a hidden field so the UI knows it's "dirty" data
    return {
      ...data,
      _metadata: {
        status: 'needs_repair',
        errors: validation.error.issues,
        timestamp: Date.now()
      }
    };
  }

  // Bulk Operation: iterate all models and diagnose
  async healModels(forceResearch = false) {
    const allModels = await db.query.modelRegistry.findMany();
    const stats = { inferred: 0, researched: 0, failed: 0, skipped: 0 };

    const analyst = await this.createAnalyst();

    for (const model of allModels) {
      const result = await this.diagnoseModel(model, analyst, forceResearch);
      if (result) {
        stats[result]++;
      } else {
        stats.skipped++;
      }
    }

    return stats;
  }

  // Single Operation: diagnose a single model by modelId
  async healModel(modelId: string) {
    const model = await db.query.modelRegistry.findFirst({
      where: eq(modelRegistry.modelId, modelId)
    });

    if (!model) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    const analyst = await this.createAnalyst();
    const result = await this.diagnoseModel(model, analyst, true); // force check for single target

    return { success: true, status: result || 'skipped', modelId };
  }

  // --- Shared Logic ---

  private async createAnalyst() {
    return await createVolcanoAgent({
        roleId: 'analyst',
        modelId: null, // System picks default
        isLocked: false,
        temperature: 0.1,
        maxTokens: 1000
    });
  }

  private async diagnoseModel(model: ModelRecord, agent: Agent, forceResearch: boolean): Promise<'inferred' | 'researched' | 'failed' | null> {
      const specs = (model.specs as Record<string, unknown> | null) || {};

      // Skip if already healthy and not forced
      if (!forceResearch && typeof specs.contextWindow === 'number' && specs.contextWindow > 0) {
        return null;
      }

      console.log(`[ModelDoctor] 🩺 Diagnosing: ${model.modelId}...`);

      // Get provider info for better URL guessing
      const provider = await db.query.providerConfigs.findFirst({
        where: eq(providerConfigs.id, model.providerId)
      }) as ProviderConfig | undefined;

      // 1. Inference
      const providerData = (model.providerData as Record<string, unknown> | null) || {};
      const inference = await this.inferSpecs(agent, model.modelId, providerData);
      if (inference.confidence === 'high' && inference.data) {
        console.log(`[ModelDoctor] 🧠 Inferred:`, inference.data);
        await this.saveKnowledge(model, inference.data, 'inference');
        return 'inferred';
      }

      // 2. Research
      console.log(`[ModelDoctor] 📉 Inference unsure. Dispatching Research Scraper...`);
      const research = await this.researchSpecs(agent, model, provider?.type);

      if (research) {
        console.log(`[ModelDoctor] 🔬 Research Found:`, research);
        await this.saveKnowledge(model, research, 'research');
        return 'researched';
      } else {
        console.warn(`[ModelDoctor] ❌ Diagnosis failed for ${model.modelId}`);
        return 'failed';
      }
  }

  private async inferSpecs(agent: Agent, modelId: string, rawData: Record<string, unknown>): Promise<InferenceResult> {
    const prompt = `
      Analyze this AI Model ID: "${modelId}"
      Raw Data: ${JSON.stringify(rawData).substring(0, 300)}

      Based on your internal knowledge:
      1. What is the context window (in tokens)?
      2. What is the parameter count (e.g. 7B)?
      
      If the ID contains hints (like "128k" or "32k"), use them.
      Return JSON ONLY: { "contextWindow": number | null, "parameters": string | null, "confidence": "high" | "low" }
    `;
    try {
      const res = await agent.generate(prompt);
      const json = JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || "{}") as Record<string, unknown>;
      const confidence = (json.confidence === 'high' || json.confidence === 'low') ? json.confidence : 'low';
      if (json.contextWindow) return { confidence, data: json };
    } catch {
      // Inference failed, return low confidence
    }
    return { confidence: 'low', data: null };
  }

  // Run this periodically (Cron / Startup)
  async healCapabilities() {
    console.log("[ModelDoctor] 🩺 Starting capabilities healing pass...");
    
    // Find models with MISSING critical data (Nulls or defaults needing verification)
    const unknownModels = await db.select({
      id: modelRegistry.id,
      modelId: modelRegistry.modelId,
      providerId: modelRegistry.providerId
    })
    .from(modelRegistry)
    .leftJoin(modelCapabilities, eq(modelRegistry.id, modelCapabilities.modelId))
    .where(isNull(modelCapabilities.hasVision)); // Using vision as the canary for uninitialized caps

    let healedCount = 0;
    for (const m of unknownModels) {
      console.log(`[ModelDoctor] Diagnosing ${m.modelId}...`);
      
      const inferred = this.inferCapabilitiesFromName(m.modelId);
      
      const newId: string = uuidv4() as string;
      const capabilityValues = {
        id: newId,
        modelId: m.id,
        ...inferred,
        updatedAt: new Date(),
      };
      
      await db.insert(modelCapabilities)
        .values(capabilityValues)
        .onConflictDoUpdate({
          target: [modelCapabilities.modelId],
          set: {
            ...inferred,
            updatedAt: new Date(),
          }
        });
      
      healedCount++;
      console.log(`[ModelDoctor] Healed ${m.modelId}:`, inferred);
    }

    return { healed: healedCount };
  }

  private inferCapabilitiesFromName(id: string): ModelCapabilitiesInferred {
    const lower = id.toLowerCase();
    
    // Heuristic: If it has "128k" in the name, it's probably 128k context
    let contextWindow = 4096;
    if (lower.includes('128k')) contextWindow = 128000;
    else if (lower.includes('32k')) contextWindow = 32000;
    else if (lower.includes('1m') || lower.includes('1280k')) contextWindow = 1000000;
    else if (lower.includes('gpt-4')) contextWindow = 8192;
    if (lower.includes('preview')) contextWindow = Math.max(contextWindow, 128000); // Most previews are high context

    const hasVision = lower.includes('vision') || lower.includes('vl') || lower.includes('gpt-4-v') || lower.includes('claude-3');
    const hasTTS = lower.includes('tts') || lower.includes('speech') || lower.includes('audio');
    const hasImageGen = lower.includes('dall-e') || lower.includes('midjourney') || lower.includes('flux');
    
    return {
      contextWindow,
      maxOutput: lower.includes('turbo') ? 4096 : 2048,
      hasVision: !!hasVision,
      hasTTS: !!hasTTS,
      hasImageGen: !!hasImageGen,
      isMultimodal: !!(hasVision || hasTTS || hasImageGen || lower.includes('multi')),
      supportsFunctionCalling: lower.includes('gpt') || lower.includes('claude-3') || lower.includes('gemini') || lower.includes('llama-3'),
      supportsJsonMode: lower.includes('gpt') || lower.includes('gemini') || lower.includes('mistral'),
    };
  }

  private async researchSpecs(agent: Agent, model: ModelRecord, providerType?: string): Promise<Record<string, unknown> | null> {
    const raw = (model.providerData as Record<string, unknown> | null) || {};
    const docUrl = (raw.documentation_url as string | undefined) || (raw.description_url as string | undefined) || this.guessUrl(model.modelId, providerType);

    if (!docUrl) return null;

    try {
      const page = await webScraperTool.handler({ url: docUrl });
      if (!page.success) return null;

      const markdown = typeof page.markdown === 'string' ? page.markdown : String(page.markdown || '');
      const prompt = `
        Read this documentation text for model "${model.modelId}":
        ---
        ${markdown.substring(0, 8000)}
        ---
        Extract: "contextWindow" (number) and "parameters" (string).
        Return JSON ONLY.
      `;
      const res = await agent.generate(prompt);
      return JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || "null") as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async saveKnowledge(model: ModelRecord, data: Record<string, unknown>, source: string) {
    console.log(`[ModelDoctor] 💊 Healing ${model.modelId} with knowledge...`);

    // 1. Update Persistent JSON (Layer 2)
    const currentAiData = (model.aiData as Record<string, unknown>) || {};
    await db.update(modelRegistry)
      .set({ 
        aiData: { ...currentAiData, ...data, source, lastUpdated: new Date() } 
      })
      .where(eq(modelRegistry.id, model.id));

    // 2. Update Capability Index (Layer 3 - The New Table)
    // We use "onConflictDoUpdate" (upsert)
    const contextWindow = 'contextWindow' in data ? Number(data.contextWindow) : 4096;
    const hasVision = 'hasVision' in data ? !!data.hasVision : false;
    const hasAudioInput = 'hasAudio' in data ? !!data.hasAudio : false;

    const caps = {
      contextWindow: contextWindow || 4096,
      hasVision,
      hasAudioInput,
      updatedAt: new Date()
    };

    const newId: string = uuidv4() as string;
    const capabilityValues = {
      id: newId,
      modelId: model.id,
      ...caps
    };
    
    await db.insert(modelCapabilities)
      .values(capabilityValues)
      .onConflictDoUpdate({
        target: modelCapabilities.modelId,
        set: caps
      });
      
    console.log(`[ModelDoctor] ✅ Capability Index Updated.`);
  }

  private guessUrl(id: string, providerType?: string): string | null {
    const lowerId = id.toLowerCase();
    if (providerType === 'groq') return 'https://console.groq.com/docs/models';
    if (lowerId.includes('gpt')) return 'https://platform.openai.com/docs/models';
    if (lowerId.includes('claude')) return 'https://docs.anthropic.com/claude/docs/models-overview';
    if (lowerId.includes('gemini')) return 'https://ai.google.dev/models/gemini';
    if (lowerId.includes('llama') || lowerId.includes('mistral')) return 'https://openrouter.ai/docs/models';
    return null;
  }
}

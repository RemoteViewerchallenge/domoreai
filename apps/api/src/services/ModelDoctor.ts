import { z } from 'zod';
import { db } from '../db.js';
import { modelRegistry, providerConfigs } from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';
import { createVolcanoAgent } from './AgentFactory.js';
import { webScraperTool } from '../tools/webScraper.js';

export class ModelDoctor {
  public async heal<T>(data: any, schema: z.ZodSchema<T>, model: string): Promise<T | any> {
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

    // 2. BACKGROUND PATH (Optional): Queue this for repair later using Ollama
    // this.queueForBackgroundRepair(data, schema);
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

  private async diagnoseModel(model: any, agent: any, forceResearch: boolean): Promise<'inferred' | 'researched' | 'failed' | null> {
      const specs = (model.specs) || {};

      // Skip if already healthy and not forced
      if (!forceResearch && specs.contextWindow && specs.contextWindow > 0) {
        return null;
      }

      console.log(`[ModelDoctor] 🩺 Diagnosing: ${model.modelId}...`);

      // 1. Inference
      const inference = await this.inferSpecs(agent, model.modelId, model.providerData);
      if (inference.confidence === 'high') {
        console.log(`[ModelDoctor] 🧠 Inferred:`, inference.data);
        await this.saveKnowledge(model, inference.data, 'inference');
        return 'inferred';
      }

      // 2. Research
      console.log(`[ModelDoctor] 📉 Inference unsure. Dispatching Research Scraper...`);
      const research = await this.researchSpecs(agent, model);

      if (research) {
        console.log(`[ModelDoctor] 🔬 Research Found:`, research);
        await this.saveKnowledge(model, research, 'research');
        return 'researched';
      } else {
        console.warn(`[ModelDoctor] ❌ Diagnosis failed for ${model.modelId}`);
        return 'failed';
      }
  }

  private async inferSpecs(agent: any, modelId: string, rawData: any) {
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
      const json = JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || "{}");
      if (json.contextWindow) return { confidence: json.confidence || 'low', data: json };
    } catch (e) {}
    return { confidence: 'low', data: null };
  }

  private async researchSpecs(agent: any, model: any) {
    const raw = model.providerData || {};
    const url = raw.documentation_url || raw.description_url || this.guessUrl(model.modelId);

    if (!url) return null;

    try {
      const page = await webScraperTool.handler({ url });
      if (!page.success) return null;

      const prompt = `
        Read this documentation text for model "${model.modelId}":
        ---
        ${page.markdown.substring(0, 8000)}
        ---
        Extract: "contextWindow" (number) and "parameters" (string).
        Return JSON ONLY.
      `;
      const res = await agent.generate(prompt);
      return JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || "null");
    } catch (e) { return null; }
  }

  private async saveKnowledge(model: any, data: any, source: string) {
    const aiData = { ...(model.aiData), ...data, source, lastUpdated: new Date() };
    const specs = { ...(model.providerData), ...aiData };

    await db.update(modelRegistry)
      .set({ aiData, specs })
      .where(and(eq(modelRegistry.providerId, model.providerId), eq(modelRegistry.modelId, model.modelId)));
  }

  private guessUrl(id: string) {
    if (id.includes('gpt')) return 'https://platform.openai.com/docs/models';
    if (id.includes('claude')) return 'https://docs.anthropic.com/claude/docs/models-overview';
    return null;
  }
}

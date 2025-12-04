import { db } from '../db.js';
import { modelRegistry, providerConfigs } from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';
import { createVolcanoAgent } from './AgentFactory.js';
import { webScraperTool } from '../tools/webScraper.js';

export class ModelDoctor {
  async healModels(forceResearch = false) {
    const allModels = await db.query.modelRegistry.findMany();
    let stats = { inferred: 0, researched: 0, failed: 0 };

    const analyst = await createVolcanoAgent({
        roleId: 'analyst',
        modelId: null,
        isLocked: false,
        temperature: 0.1,
        maxTokens: 1000
    });

    for (const model of allModels) {
      const aiData = (model.aiData as any) || {};
      const specs = (model.specs as any) || {};

      if (!forceResearch && specs.contextWindow && specs.contextWindow > 0) {
        continue;
      }

      console.log(`[ModelDoctor] 🩺 Diagnosing: ${model.modelId}...`);

      const inference = await this.inferSpecs(analyst, model.modelId, model.providerData as any);

      if (inference.confidence === 'high') {
        console.log(`[ModelDoctor] 🧠 Inferred:`, inference.data);
        await this.saveKnowledge(model, inference.data, 'inference');
        stats.inferred++;
        continue;
      }

      console.log(`[ModelDoctor] 📉 Inference unsure. Dispatching Research Scraper...`);
      const research = await this.researchSpecs(analyst, model);

      if (research) {
        console.log(`[ModelDoctor] 🔬 Research Found:`, research);
        await this.saveKnowledge(model, research, 'research');
        stats.researched++;
      } else {
        console.warn(`[ModelDoctor] ❌ Diagnosis failed for ${model.modelId}`);
        stats.failed++;
      }
    }

    return stats;
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
    const raw = model.providerData as any || {};
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
    const aiData = { ...(model.aiData as any), ...data, source, lastUpdated: new Date() };
    const specs = { ...(model.providerData as any), ...aiData };

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

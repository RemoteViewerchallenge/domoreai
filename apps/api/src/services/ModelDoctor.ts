import { db } from '../db.js';
import { modelRegistry, modelCapabilities } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createVolcanoAgent } from './AgentFactory.js';
import { webScraperTool } from '../tools/webScraper.js';

export class ModelDoctor {

  // 1. The Public Entry Point
  async healModel(modelId: string) {
    const model = await db.query.modelRegistry.findFirst({
      where: eq(modelRegistry.modelId, modelId)
    });
    if (!model) return;

    // Phase 1: Fast Heuristics (Fallback)
    let diagnosis = await this.inferSpecs(null, model.modelId, model.providerData);

    // Phase 2: AI Research (The "Internet" Check)
    // We only research if we lack high-confidence data
    try {
        console.log(`[ModelDoctor] 🩺 Initiating AI Research for ${model.modelName}...`);
        const researchData = await this.researchModel(model.modelName, model.modelId);
        if (researchData) {
            console.log(`[ModelDoctor] ✅ Research successful for ${model.modelName}`, researchData);
            // Merge research data with heuristics
            diagnosis = {
                confidence: 'high',
                data: {
                    ...diagnosis.data,
                    ...researchData
                }
            };
        }
    } catch (e) {
        console.warn(`[ModelDoctor] ⚠️ Research failed for ${model.modelName}, using heuristics.`, e);
    }

    // Save to DB
    await this.saveKnowledge(model, diagnosis.data, 'doctor_heal');
  }

  // 2. The Research Agent
  private async researchModel(name: string, id: string) {
      try {
          // Create a temporary researcher agent
          // We use a cheap, fast model for the agent itself if possible, or default to system
          const agent = await createVolcanoAgent({
              roleId: 'researcher', // ensure this role exists or fallback
              modelId: null,
              isLocked: false,
              temperature: 0,
              maxTokens: 1000,
              // Inject the web scraper tool directly
              tools: ['research.web_scrape'] 
          });

          const prompt = `You are a Model Researcher. Find the technical specifications for the LLM "${name}" (ID: ${id}).
          
          I specifically need:
          1. Context Window (in tokens, e.g., 128000, 200000, 8192)
          2. Capabilities: Does it support Vision? Audio? Function Calling?
          3. Max Output Tokens.

          Use the web_scrape tool to find this information from official documentation (OpenAI, Anthropic, Google, HuggingFace, etc).
          
          Return JSON ONLY:
          {
            "contextWindow": number,
            "maxOutput": number,
            "hasVision": boolean,
            "hasAudioInput": boolean,
            "hasReasoning": boolean
          }`;

          const result = await agent.generate(prompt);
          
          // Attempt to parse JSON from the response
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
          }
          return null;
      } catch (error) {
          console.error("[ModelDoctor] Research Agent Error:", error);
          return null;
      }
  }

  // 3. The Brain (Heuristics)
  public async inferSpecs(agent: any, modelId: string, rawData: any) {
    const lower = modelId.toLowerCase();
    const rawString = JSON.stringify(rawData).toLowerCase();

    // Context Window Logic
    let context = 4096; // Fallback
    if (lower.includes('128k')) context = 128000;
    else if (lower.includes('200k')) context = 200000;
    else if (lower.includes('32k')) context = 32000;
    else if (lower.includes('16k')) context = 16000;
    else if (lower.includes('8k')) context = 8192;
    // Attempt to grab from raw data if available
    else if (rawData && typeof rawData === 'object') {
        const r = rawData;
        const c = r.context_window || r.context_length || r.max_context_length;
        if (c) context = parseInt(c);
    }

    // Capability Flags
    const hasVision = lower.includes('vision') || lower.includes('vl') || rawString.includes('vision');
    const hasAudio = lower.includes('audio') || lower.includes('whisper') || lower.includes('speech');
    const hasReasoning = lower.includes('reasoning') || lower.includes('thinking') || lower.startsWith('o1-');

    return {
      confidence: 'medium',
      data: {
        contextWindow: context,
        hasVision,
        hasAudioInput: hasAudio,
        hasReasoning
      }
    };
  }

  // 4. The Hands (Database Write)
  public async saveKnowledge(model: any, data: any, source: string) {
    console.log(`[ModelDoctor] 💾 Saving Capabilities for ${model.modelName}...`);

    // Update the main capabilities table
    await db.insert(modelCapabilities)
      .values({
        id: uuidv4(),
        modelId: model.id,
        contextWindow: data.contextWindow || 4096,
        maxOutput: data.maxOutput || 4096,
        hasVision: !!data.hasVision,
        hasAudioInput: !!data.hasAudioInput,
        hasReasoning: !!data.hasReasoning,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: modelCapabilities.modelId,
        set: {
          contextWindow: data.contextWindow,
          maxOutput: data.maxOutput,
          hasVision: !!data.hasVision,
          hasAudioInput: !!data.hasAudioInput,
          hasReasoning: !!data.hasReasoning,
          updatedAt: new Date()
        }
      });
  }

  // --- Preserved Compatibility Methods ---
  public async heal<T>(data: Record<string, unknown>, schema: z.ZodSchema<T>, modelId: string): Promise<T | Record<string, unknown>> {
    const validation = schema.safeParse(data);
    return validation.success ? validation.data : data;
  }

  async healModels(forceResearch = false) {
     const allModels = await db.query.modelRegistry.findMany({
         where: eq(modelRegistry.isActive, true)
     });
     let healed = 0;
     for (const model of allModels) {
        await this.healModel(model.modelId);
        healed++;
     }
     return { inferred: healed, researched: 0, failed: 0, skipped: 0 };
  }

  async healCapabilities() {
    return this.healModels();
  }
}
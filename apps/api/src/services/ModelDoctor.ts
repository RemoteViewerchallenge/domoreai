import { db } from '../db.js';
import { modelRegistry } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createVolcanoAgent } from './AgentFactory.js';
import { Surveyor } from './Surveyor.js';
import { saveModelKnowledge, ResearchData } from './ModelKnowledgeBase.js';

interface SpecsResult {
  confidence: 'low' | 'medium' | 'high';
  data: ResearchData;
}

export class ModelDoctor {

  // 1. Public Entry: Heal specific model
  async healModel(modelId: string, forceResearch = false) {
    const model = await db.query.modelRegistry.findFirst({
      where: eq(modelRegistry.modelId, modelId),
      with: {
        capabilities: true
      }
    });

    if (!model) return;

    // Skip if already high confidence and not forced
    const modelWithCaps = model as typeof modelRegistry.$inferSelect & { capabilities?: { confidence?: string } };
    if (!forceResearch && modelWithCaps.capabilities?.confidence === 'high') {
        // console.log(`[ModelDoctor] ⏩ ${model.modelName} already has high-confidence data, skipping.`);
        return;
    }

    // Level 1: Fast Pattern Match (Surveyor)
    const surveyedSpecs = Surveyor.inspect(model.providerId, model.modelId); 
    
    if (surveyedSpecs) {
        console.log(`[ModelDoctor] 🗺️ Surveyor identified ${model.modelName}. Skipping research.`);
        const researchData = {
            contextWindow: surveyedSpecs.contextWindow || 4096,
            maxOutput: surveyedSpecs.maxOutput || 4096,
            hasVision: surveyedSpecs.capabilities.includes('vision'),
            hasAudioInput: surveyedSpecs.capabilities.includes('audio_in'),
            hasReasoning: surveyedSpecs.capabilities.includes('reasoning') || surveyedSpecs.capabilities.includes('thought'),
        };
        await saveModelKnowledge(model.id, researchData, 'surveyor', 'high');
        return;
    }

    // Level 2: Diagnosis (Heuristics)
    const diagnosis = this.inferSpecs(model.modelId, model.providerData);
    let source: 'heuristic' | 'ai_research' | 'manual' = 'heuristic';
    let confidence: 'low' | 'medium' | 'high' = diagnosis.confidence;
    let finalData = { ...diagnosis.data };

    // Level 3: AI Research
    // Only attempt research if simple heuristics failed to give us confidence
    try {
        console.log(`[ModelDoctor] 🌍 Attempting Web Research for ${model.modelName}...`);
        const researchData = await this.researchModel(model.modelName, model.modelId);
        
        if (researchData && researchData.contextWindow > 0) {
            console.log(`[ModelDoctor] ✅ Research SUCCESS for ${model.modelName}. Found:`, researchData);
            finalData = { ...finalData, ...researchData };
            source = 'ai_research';
            confidence = 'high';
        } else {
            console.log(`[ModelDoctor] ⚠️ Research returned weak data, using heuristics.`);
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[ModelDoctor] ❌ Research Failed for ${model.modelName}: ${message}`);
        // If the model itself is broken (400/404), we might want to mark it as inactive?
        // For now, we just stick with heuristics.
    }

    // Write to DB
    await saveModelKnowledge(model.id, finalData, source, confidence);
  }

  // 2. The Research Agent
  private async researchModel(name: string, id: string): Promise<ResearchData | null> {
      try {
          const { AgentRuntime } = await import('./AgentRuntime.js');
          
          // Use a known reliable model for the researcher agent itself if possible
          // But here we rely on the default strategy.
          const runtime = await AgentRuntime.create(process.cwd(), ['research.web_scrape'], 'Worker');
          
          const agent = await createVolcanoAgent({
              roleId: 'model_doctor', 
              modelId: null, // Let factory pick best available
              isLocked: false,
              temperature: 0,
              maxTokens: 1000,
              tools: ['research.web_scrape'] 
          });

          const prompt = `SEARCH and FIND technical specs for LLM: "${name}" (ID: ${id}).
          You are the Model Doctor.
          
          TOOLS AVAILABLE:
          - research.web_scrape({ url: string })
          
          PROTOCOL:
          1. Use the tool to find context window, max output tokens, and capabilities.
          2. Return ONLY valid JSON. No markdown formatting. No comments.
          
          REQUIRED JSON FORMAT:
          {
            "contextWindow": number,
            "maxOutput": number,
            "hasVision": boolean,
            "hasAudioInput": boolean,
            "hasReasoning": boolean
          }`;

          const { result } = await runtime.runAgentLoop(
              prompt,
              await agent.generate(prompt), 
              async (context) => agent.generate(context)
          );
          
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          return this.extractJson(resultStr);

      } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          // Handle provider errors (like "Developer instruction is not enabled")
          if (err.status === 400 || err.status === 404 || err.message?.includes('not enabled')) {
             console.warn(`[ModelDoctor] Provider rejected research agent: ${err.message}`);
             return null;
          }
          console.error("[ModelDoctor] Agent Error:", error);
          return null;
      }
  }

  /**
   * Robustly extracts JSON from potentially dirty agent output
   */
  private extractJson(text: string): ResearchData | null {
      try {
          // 1. Fast path: Is it pure JSON?
          return JSON.parse(text) as ResearchData;
      } catch {
          // 2. Strip Markdown code blocks (```json ... ```)
          const codeBlock = text.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlock) {
              try { return JSON.parse(codeBlock[1]) as ResearchData; } catch {}
          }
          
          // 3. Find first { and last }
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              try { return JSON.parse(jsonMatch[0]) as ResearchData; } catch {}
          }
          
          // 4. Try to repair common syntax errors (like unquoted keys)
          // This is a simple fallback for { key: value }
          try {
             const repaired = text.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
             const match = repaired.match(/\{[\s\S]*\}/);
             if (match) return JSON.parse(match[0]) as ResearchData;
          } catch {}
          
          return null;
      }
  }

  // 3. Heuristic Fallback
  public inferSpecs(modelId: string, rawData: unknown): SpecsResult {
    const lower = modelId.toLowerCase();
    
    let context = 0;
    let maxOut = 0;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    
    // Attempt to read from provider metadata if available
    if (rawData && typeof rawData === 'object') {
        const raw = rawData as Record<string, unknown>;
        const ctxKeys = ['context_window', 'context_length', 'max_context_length', 'contextWindow', 'max_tokens', 'max_context_tokens'];
        const outKeys = ['max_output_tokens', 'output_token_limit', 'max_completion_tokens'];

        for (const key of ctxKeys) {
            const item = raw[key];
            if (item) {
                const val = typeof item === 'number' ? item : parseInt(item as string);
                if (!isNaN(val) && val > 0) {
                    context = val;
                    confidence = 'medium'; 
                    break;
                }
            }
        }
        // ... (maxOut logic same as before)
        for (const key of outKeys) {
            const item = raw[key];
            if (item) {
                const val = typeof item === 'number' ? item : parseInt(item as string);
                if (!isNaN(val) && val > 0) {
                    maxOut = val;
                    break;
                }
            }
        }
    }

    if (!context || context < 1024) {
        if (lower.includes('1m') || lower.includes('1000k')) context = 1000000;
        else if (lower.includes('200k')) context = 200000;
        else if (lower.includes('128k')) context = 128000;
        else if (lower.includes('32k')) context = 32000;
        else if (lower.includes('16k')) context = 16000;
        else if (lower.includes('8k')) context = 8192;
        else context = 4096;
    }

    if (!maxOut || maxOut < 1024) {
        if (lower.includes('o1-')) maxOut = 32768;
        else if (lower.startsWith('gpt-4o')) maxOut = 4096;
        else if (lower.includes('claude-3-5')) maxOut = 8192;
        else if (lower.includes('gemini')) maxOut = 8192;
        else if (lower.includes('r1')) maxOut = 16384;
        else maxOut = 4096;
    }
    
    const hasVision = lower.includes('vision') || lower.includes('vl') || lower.includes('gpt-4-v') || lower.includes('omni');
    const hasAudio = lower.includes('audio') || lower.includes('whisper') || lower.includes('voxtral');
    const hasReasoning = lower.includes('reasoning') || lower.includes('thinking') || lower.startsWith('o1') || lower.includes('deepseek-r1');

    return {
      confidence,
      data: {
        contextWindow: context,
        maxOutput: maxOut,
        hasVision,
        hasAudioInput: hasAudio,
        hasReasoning
      }
    };
  }

  // --- Bulk Operation ---
  async healModels(forceResearch = false) {
     const allModels = await db.query.modelRegistry.findMany({
         where: eq(modelRegistry.isActive, true)
     });
     
     const inferred = 0;
     let researched = 0;
     let failed = 0;
     
     for (const model of allModels) {
        try {
            await this.healModel(model.modelId, forceResearch);
            // We count 'healed' if the process finished without throwing
            researched++; 
        } catch {
            failed++;
        }
     }
     
     return { healed: researched, inferred, researched, failed, skipped: 0 };
  }
}
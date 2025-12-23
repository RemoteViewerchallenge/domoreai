import { db } from '../db.js';
import { modelRegistry } from '../db/schema.js'; // Keep modelRegistry for type inference
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
        console.log(`[ModelDoctor] ⏩ ${model.modelName} already has high-confidence data, skipping.`);
        return;
    }

    // Level 1: Fast Pattern Match (Surveyor)
    const surveyedSpecs = Surveyor.inspect(model.providerId, model.modelId); // Assuming providerId is the type or we can map it
    
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
    try {
        console.log(`[ModelDoctor] 🌍 Attempting Web Research for ${model.modelName}...`);
        const researchData = await this.researchModel(model.modelName, model.modelId);
        
        if (researchData && researchData.contextWindow > 4096) {
            console.log(`[ModelDoctor] ✅ Research SUCCESS for ${model.modelName}. Found:`, researchData);
            finalData = {
                ...finalData,
                ...researchData
            };
            source = 'ai_research';
            confidence = 'high';
        } else {
            console.log(`[ModelDoctor] ⚠️ Research returned weak data, using heuristics.`);
        }
    } catch (e) {
        console.warn(`[ModelDoctor] ❌ Research Failed for ${model.modelName}:`, e);
    }

    // Write to DB
    await saveModelKnowledge(model.id, finalData, source, confidence);
  }

  // 2. The Research Agent
  private async researchModel(name: string, id: string): Promise<ResearchData | null> {
      try {
          // [ANTIGRAVITY] Use AgentRuntime for tool execution support
          const { AgentRuntime } = await import('./AgentRuntime.js');
          const runtime = await AgentRuntime.create(process.cwd(), ['research.web_scrape'], 'Worker');
          
          // Create the "Brain"
          const agent = await createVolcanoAgent({
              roleId: 'model_doctor', 
              modelId: null, 
              isLocked: false,
              temperature: 0,
              maxTokens: 1000,
              tools: ['research.web_scrape'] 
          });

          // Construct Prompt with Explicit Tool Instructions
          const prompt = `SEARCH and FIND technical specs for LLM: "${name}" (ID: ${id}).
          You are the Model Doctor. You verify claims with data.
          
          TOOLS AVAILABLE:
          - research.web_scrape({ url: string }): Fetches content.
          
          PROTOCOL:
          1. If you need external info, WRITE CODE to call the tool.
             Target official docs (HuggingFace, Provider Sites).
             Example:
             \`\`\`javascript
             // Use the global 'tools' object or direct function call depending on environment
             // Trying standard pattern:
             const result = await tools['research.web_scrape'].handler({ url: 'https://...' });
             console.log(result);
             \`\`\`
          2. Analyze the observations.
          3. When you have the data, output the STRICT JSON result.
          
          REQUIRED JSON FORMAT:
          {
            "contextWindow": number,
            "maxOutput": number,
            "hasVision": boolean,
            "hasAudioInput": boolean,
            "hasReasoning": boolean
          }`;

          // Run the Loop
          const { result } = await runtime.runAgentLoop(
              prompt,
              await agent.generate(prompt), 
              async (context) => agent.generate(context)
          );
          
          // Ensure result is a string (Fail-Safe)
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          
          const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              return JSON.parse(jsonMatch[0]) as ResearchData;
          }
          return null;
      } catch (error) {
          console.error("[ModelDoctor] Agent Error:", error);
          return null;
      }
  }

  // 3. Heuristic Fallback
  public inferSpecs(modelId: string, rawData: unknown): SpecsResult {
    const lower = modelId.toLowerCase();
    
    let context = 0;
    let maxOut = 0;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    
    if (rawData && typeof rawData === 'object') {
        const raw = rawData as Record<string, unknown>;
        const ctxKeys = ['context_window', 'context_length', 'max_context_length', 'contextWindow', 'max_tokens', 'max_context_tokens'];
        const outKeys = ['max_output_tokens', 'max_tokens', 'output_token_limit', 'max_completion_tokens'];

        for (const key of ctxKeys) {
            const item = raw[key];
            if (item) {
                const val = typeof item === 'number' ? item : parseInt(item as string);
                if (!isNaN(val) && val > 0) {
                    context = val;
                    confidence = 'medium'; // Metadata is better than name guessing
                    break;
                }
            }
        }

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
    
    const hasVision = lower.includes('vision') || lower.includes('vl') || lower.includes('gpt-4-v');
    const hasAudio = lower.includes('audio') || lower.includes('whisper');
    const hasReasoning = lower.includes('reasoning') || lower.startsWith('o1') || lower.includes('deepseek-r1') || lower.includes('thought');

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

  // 4. Database Writer (DEPRECATED - Use saveModelKnowledge)
  public async saveKnowledge(model: any, data: ResearchData, source: string, confidence: string) {
    await saveModelKnowledge(model.id, data, source, confidence);
  }

  // --- Bulk Operation ---
  async healModels(forceResearch = false) {
     const allModels = await db.query.modelRegistry.findMany({
         where: eq(modelRegistry.isActive, true)
     });
     
     console.log(`[ModelDoctor] Healing ${allModels.length} models...`);
     
     for (const model of allModels) {
        await this.healModel(model.modelId, forceResearch);
     }
     
     return { healed: allModels.length, inferred: 0, researched: 0, failed: 0, skipped: 0 };
  }
  
  public heal<T>(data: T, _schema: unknown): T { return data; }
  async healCapabilities() { return this.healModels(); }
}
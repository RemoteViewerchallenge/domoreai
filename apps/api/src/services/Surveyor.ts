// import { saveModelKnowledge } from './ModelKnowledgeBase.js';

/**
 * SURVEYOR SERVICE
 * * The "Map of Florida" - Uses regex patterns to instantly identify model capabilities
 * without burning tokens or making API calls. This is the FAST PATH for data collection.
 */

export interface ModelSpecs {
  contextWindow?: number;
  maxOutput?: number;
  capabilities: string[];
  costPer1k?: number;
  rateLimit?: {
    rpm?: number;
    tpm?: number;
    rpd?: number;
  };
  confidence?: string;
  source?: string;
}

interface ProviderPattern {
  pattern: RegExp;
  specs: ModelSpecs;
}

const PROVIDER_PATTERNS: Record<string, ProviderPattern[]> = {
  // ===== GOOGLE =====
  google: [
    {
      pattern: /gemini.2\.?0.flash.lite/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075
      }
    },
    {
      pattern: /gemini.2\.?0.flash/i, // Catch-all for regular flash
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 0.10
      }
    },
    {
      pattern: /gemini.2\.?0.pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /gemini.3.pro/i, // Antigravity / Future
      specs: {
        contextWindow: 4000000,
        maxOutput: 16384,
        capabilities: ["text", "vision", "audio_in", "video_in", "reasoning"],
        costPer1k: 5.00
      }
    },
    {
      pattern: /gemini.1\.?5.flash.8b/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 0.03
      }
    },
    {
      pattern: /gemini.1\.?5.flash/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075
      }
    },
    {
      pattern: /gemini.1\.?5.pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 1.25
      }
    },
    {
        pattern: /gemma.3/i,
        specs: {
            contextWindow: 8192, // Heuristic for Gemma 3
            capabilities: ["text", "tool_use"],
            costPer1k: 0
        }
    },
    {
      pattern: /embedding/i,
      specs: {
        contextWindow: 2048,
        capabilities: ["embedding"],
        costPer1k: 0.00001
      }
    }
  ],
  
  // ... (OpenAI, Anthropic, Mistral, Groq, NVIDIA, Cerebras unchanged) ...

  // ===== OPENROUTER / GENERAL =====
  openrouter: [
    {
      pattern: /deepseek.r1/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 32768,
        capabilities: ["text", "reasoning"],
        costPer1k: 0.55
      }
    },
    {
      pattern: /qwen.*(2\.5|3)/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /gemma.?2/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /flux/i,
      specs: {
        contextWindow: 0,
        capabilities: ["image_gen"],
        costPer1k: 0.04
      }
    },
    {
       // Generic Hermes catch-all (Uncensored)
       pattern: /hermes.*(3|405b|70b)/i,
       specs: {
         contextWindow: 128000,
         capabilities: ["text", "tool_use", "uncensored"],
         costPer1k: 0.2
       }
    },
    {
       // Generic Llama catch-all
       pattern: /llama.*(3|405b|70b)/i,
       specs: {
         contextWindow: 128000,
         capabilities: ["text", "tool_use"],
         costPer1k: 0.2
       }
    }
  ],
  
  // ===== OPENAI =====
  openai: [
    {
      pattern: /o1/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 32768,
        capabilities: ["text", "reasoning", "tool_use"],
        costPer1k: 15.00
      }
    },
    {
      pattern: /gpt-4o/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 2.50
      }
    },
    {
      pattern: /gpt-4-turbo/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 10.00
      }
    },
    {
      pattern: /gpt-3\.5/i,
      specs: {
        contextWindow: 16385,
        maxOutput: 4096,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.50
      }
    }
  ],

  // ===== ANTHROPIC =====
  anthropic: [
    {
      pattern: /claude-3\.?5-sonnet/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 3.00
      }
    },
    {
      pattern: /claude-3-opus/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 15.00
      }
    },
    {
      pattern: /claude-3-haiku/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 4096,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 0.25
      }
    }
  ],

  // ===== MISTRAL =====
  mistral: [
    {
      pattern: /voxtral/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "audio_in"],
        costPer1k: 0.15
      }
    },
    {
      pattern: /min(i|e)stral/i, // Covers ministral-3b, 8b, 14b
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.1
      }
    },
    {
      pattern: /mistral-large/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 2.00
      }
    },
    {
      pattern: /mistral-(small|medium|tiny)/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.5
      }
    },
    {
        pattern: /open-mistral/i,
        specs: {
            contextWindow: 32000,
            capabilities: ["text"],
            costPer1k: 0
        }
    },
    {
      pattern: /codestral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "code"],
        costPer1k: 0.30
      }
    },
    {
      pattern: /pixtral/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "vision"],
        costPer1k: 0.15
      }
    },
    {
        pattern: /moderation/i,
        specs: {
            contextWindow: 8192,
            capabilities: ["moderation"],
            costPer1k: 0
        }
    }
  ],

  // ===== GROQ =====
  groq: [
    {
        pattern: /whisper/i,
        specs: {
            contextWindow: 0,
            capabilities: ["text_to_speech", "audio_in"],
            costPer1k: 0
        }
    },
    {
        pattern: /llama.*guard/i,
        specs: {
            contextWindow: 8192,
            capabilities: ["moderation"],
            costPer1k: 0
        }
    },
    {
      pattern: /llama-3\.?3-70b/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192,
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama-4/i, // Maverick/Scout models
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
        pattern: /kimi|qwen|gpt-oss|allam/i, // Groq hosted varied models
        specs: {
            contextWindow: 32768,
            capabilities: ["text"],
            costPer1k: 0
        }
    }
  ],
  
  // ===== NVIDIA =====
  nvidia: [
    {
       pattern: /chatqa/i,
       specs: {
         contextWindow: 128000,
         capabilities: ["text", "rag_optimized"],
         costPer1k: 0
       }
    },
    {
       pattern: /nemotron.*reward/i,
       specs: {
         contextWindow: 4096,
         capabilities: ["reward_model"], 
         costPer1k: 0
       }
    },
    {
       pattern: /nemotron/i,
       specs: {
         contextWindow: 128000,
         capabilities: ["text", "reasoning"],
         costPer1k: 0
       }
    },
    {
       pattern: /jamba/i,
       specs: {
         contextWindow: 256000,
         capabilities: ["text", "reasoning"], 
         costPer1k: 0
       }
    },
    {
       pattern: /yi-large/i,
       specs: {
         contextWindow: 32768,
         capabilities: ["text"], 
         costPer1k: 0
       }
    },
    {
       pattern: /starcoder/i,
       specs: {
         contextWindow: 16384,
         capabilities: ["text", "code"], 
         costPer1k: 0
       }
    },
    {
       pattern: /kosmos/i, // NVIDIA often hosts Microsoft's Kosmos
       specs: {
         contextWindow: 32768,
         capabilities: ["text", "vision", "ocr"],
         costPer1k: 0
       }
    }
  ],

  // ===== CEREBRAS =====
  cerebras: [
    {
       pattern: /llama-3\.?3-70b/i,
       specs: {
         contextWindow: 128000, 
         maxOutput: 8192,
         capabilities: ["text", "tool_use"],
         costPer1k: 0.60 
       }
    },
    {
       pattern: /llama-?3\.?1-8b/i,
       specs: {
         contextWindow: 128000,
         capabilities: ["text", "tool_use"],
         costPer1k: 0.10
       }
    },
    {
       pattern: /gpt-oss/i,
       specs: {
         contextWindow: 32768,
         capabilities: ["text"],
         costPer1k: 0.40
       }
    },
    {
       pattern: /qwen|zai|glm/i, 
       specs: {
         contextWindow: 32768,
         capabilities: ["text"],
         costPer1k: 0.20
       }
    }
  ],


};

export class Surveyor {
  /**
   * Inspect a model and return its specs if we can identify it via patterns
   */
  /**
   * Inspect a model and return its specs via patterns OR raw provider data
   */
  static inspect(provider: string, modelName: string, providerData?: Record<string, unknown>): ModelSpecs | null {
    const providerKey = provider.toLowerCase();
    
    // 0. CHECK RAW DATA FIRST (If available)
    // Sometimes the API explicitly gave us the answer, but Ingestion missed it.
    let rawContext: number | undefined;
    if (providerData) {
        // Common fields across providers
        const candidates = [
            providerData.context_window,
            providerData.max_context_length, 
            providerData.context_length,
            providerData.input_token_limit, // Google
            (providerData.pricing as any)?.usage // OpenRouter
        ];
        
        for (const c of candidates) {
            if (typeof c === 'number' && c > 4096) {
                rawContext = c;
                break;
            }
            if (typeof c === 'string' && !isNaN(parseInt(c)) && parseInt(c) > 4096) {
                rawContext = parseInt(c);
                break;
            }
        }
    }

    // 1. Try Specific Provider Rules
    let rules = PROVIDER_PATTERNS[providerKey];
    
    // 2. If unknown/OpenRouter, mix in others... (existing logic)
    if (!rules || (providerKey === 'openrouter')) {
        let upstreamRules: ProviderPattern[] = [];
        if (providerKey === 'openrouter') {
             if (modelName.startsWith('google/') || modelName.includes('gemini') || modelName.includes('gemma')) upstreamRules = PROVIDER_PATTERNS['google'];
             else if (modelName.startsWith('mistral') || modelName.includes('mistral')) upstreamRules = PROVIDER_PATTERNS['mistral'];
             else if (modelName.startsWith('meta-llama') || modelName.includes('llama')) upstreamRules = PROVIDER_PATTERNS['groq']; 
             else if (modelName.startsWith('anthropic') || modelName.includes('claude')) upstreamRules = PROVIDER_PATTERNS['anthropic'];
             else if (modelName.startsWith('openai')) upstreamRules = PROVIDER_PATTERNS['openai'];
        }
        const fallbacks = PROVIDER_PATTERNS['openrouter'];
        rules = [...(upstreamRules || []), ...(rules || []), ...fallbacks];
    }
    
    // 3. Match Pattern
    let specs: ModelSpecs | null = null;
    if (rules) {
        for (const rule of rules) {
          if (rule.pattern.test(modelName)) {
            console.log(`[Surveyor] ✅ Identified ${provider}/${modelName} via pattern`);
            specs = { 
                ...rule.specs,
                confidence: 'high',
                source: 'surveyor_pattern'
            }; 
            break;
          }
        }
    }
    
    // 4. Fallback Heuristics
    if (!specs) {
        const lower = modelName.toLowerCase();
        // ... (Keep existing heuristics for capabilities)
        if (lower.includes('vision') || lower.includes('vl') || lower.includes('pixtral') || lower.includes('omni') || lower.includes('ocr')) {
            specs = { contextWindow: 4096, capabilities: ["text", "vision", "ocr"], confidence: 'low', source: 'surveyor_heuristic' };
        } else if (lower.includes('image') || lower.includes('flux')) {
            specs = { contextWindow: 0, capabilities: ["image_gen"], confidence: 'medium', source: 'surveyor_heuristic' };
        } else if (lower.includes('deepseek-r1') || lower.includes('reasoner')) {
            specs = { contextWindow: 32768, capabilities: ["text", "reasoning"], confidence: 'medium', source: 'surveyor_heuristic' };
        }
    }

    // 5. MERGE RAW DATA
    // If we found raw context in step 0, apply it (override pattern if raw is explicitly higher)
    if (rawContext) {
        if (!specs) specs = { contextWindow: rawContext, capabilities: ["text"], confidence: 'high', source: 'provider_api' };
        else if ((specs.contextWindow || 0) < rawContext) {
            console.log(`[Surveyor] 📈 Upgrading context for ${modelName} from ${specs.contextWindow} to ${rawContext} (Found in Raw Data)`);
            specs.contextWindow = rawContext;
            specs.confidence = 'high';
            specs.source = 'provider_api';
        }
    }
    
    // 6. Name Inference Last Resort
    if (!specs) {
        const contextMatch = modelName.match(/(\d+)k/i);
        if (contextMatch) {
            specs = {
                contextWindow: parseInt(contextMatch[1]) * 1024,
                capabilities: ["text"],
                confidence: 'medium',
                source: 'name_inference'
            };
        }
    }

    return specs;
  }

  static async surveyAll(): Promise<{ surveyed: number; unknown: number }> {
    const { prisma } = await import('../db.js');
    
    // Find all active models to check if they need an upgrade
    // We do this in-memory to be smarter than standard SQL filters
    const models = await prisma.model.findMany({
      where: { isActive: true },
      include: { provider: true, capabilities: true }
    });

    let surveyed = 0;
    let unknown = 0;

    console.log(`[Surveyor] 🔍 Auditing ${models.length} active models...`);

    for (const model of models) {
      // CRITERIA:
      // 1. No capabilities record
      // 2. OR Context is default 4096 (likely failed ingestion)
      // 3. OR Capabilities list is empty/minimal
      const needsHelp = !model.capabilities || 
                        (model.capabilities.contextWindow === 4096) ||
                        (!model.capabilities.isMultimodal && model.name.includes('vision'));

      if (!needsHelp) continue;

      const specs = this.inspect(
          model.provider.type, 
          model.name, 
          model.providerData as Record<string, unknown>
      );
      
      if (specs) {
          // ... (Saving Logic - same as before)
          const capsData = {
              contextWindow: specs.contextWindow || 4096,
              maxOutput: specs.maxOutput || 4096,
              hasVision: specs.capabilities.includes('vision'),
              hasAudioInput: specs.capabilities.includes('audio_in'),
              supportsFunctionCalling: specs.capabilities.includes('tool_use'),
              supportsJsonMode: false,
              hasReasoning: specs.capabilities.includes('reasoning'),
              hasImageGen: specs.capabilities.includes('image_gen'),
              hasTTS: specs.capabilities.includes('text_to_speech'),
              specs: {
                  coding: specs.capabilities.includes('code'),
                  uncensored: specs.capabilities.includes('uncensored'),
                  ocr: specs.capabilities.includes('ocr'),
                  embedding: specs.capabilities.includes('embedding'),
                  ragOptimized: specs.capabilities.includes('rag_optimized'),
                  rewardModel: specs.capabilities.includes('reward_model'),
                  moderation: specs.capabilities.includes('moderation')
              },
              confidence: specs.confidence || 'medium',
              source: specs.source || 'surveyor'
          };

          await prisma.modelCapabilities.upsert({
              where: { modelId: model.id },
              create: { modelId: model.id, ...capsData },
              update: { ...capsData, updatedAt: new Date() }
          });
          surveyed++;
      } else {
        unknown++;
      }
    }
    console.log(`[Surveyor] 📊 Audit complete: Upgraded/Fixed ${surveyed} models. ${unknown} still unknown.`);
    return { surveyed, unknown };
  }
}

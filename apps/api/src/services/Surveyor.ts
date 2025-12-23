import { saveModelKnowledge } from './ModelKnowledgeBase.js';

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
}

interface ProviderPattern {
  pattern: RegExp;
  specs: ModelSpecs;
}

const PROVIDER_PATTERNS: Record<string, ProviderPattern[]> = {
  // ===== GOOGLE =====
  google: [
    {
      // Covers gemini-2.0-flash, flash-lite, flash-001, etc.
      pattern: /gemini-2\.?0-flash/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 0.10
      }
    },
    {
      pattern: /gemini-2\.?0-pro/i,
      specs: {
        contextWindow: 2000000, // Anticipated
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use", "reasoning"],
        costPer1k: 0
      }
    },
    {
      pattern: /gemini-2\.?5/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /gemini-1\.5-pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 1.25
      }
    },
    {
      pattern: /gemini-1\.5-flash/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075
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
        capabilities: ["text", "audio_in"], // Voxtral is audio optimized
        costPer1k: 0.15
      }
    },
    {
      pattern: /ministral-?3b/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.04
      }
    },
    {
      pattern: /ministral-?8b/i,
      specs: {
        contextWindow: 128000,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.10
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
    }
  ],

  // ===== GROQ =====
  groq: [
    {
      pattern: /llama-3\.?3-70b/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 8192, // Groq supports higher output now
        capabilities: ["text", "tool_use"],
        costPer1k: 0
      }
    },
    {
      pattern: /llama.*(70b|8b)/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /mixtral/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0
      }
    },
    {
      pattern: /playai-tts/i,
      specs: {
        contextWindow: 0,
        capabilities: ["text_to_speech"],
        costPer1k: 0
      }
    }
  ],
  
  // ===== OPENROUTER / GENERAL =====
  // Many diverse models appear here, we map common keywords
  openrouter: [
    {
      pattern: /deepseek-r1/i,
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
      pattern: /gemma-?2/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0.1
      }
    }
  ]
};

export class Surveyor {
  /**
   * Inspect a model and return its specs if we can identify it via patterns
   */
  static inspect(provider: string, modelName: string): ModelSpecs | null {
    const providerKey = provider.toLowerCase();
    
    // 1. Try Specific Provider Rules
    let rules = PROVIDER_PATTERNS[providerKey];
    
    // 2. If provider unknown or no match, try OpenRouter/General rules
    if (!rules && (providerKey.includes('openrouter') || providerKey.includes('router'))) {
        rules = PROVIDER_PATTERNS['openrouter'];
    }
    
    // 3. Match
    if (rules) {
        for (const rule of rules) {
          if (rule.pattern.test(modelName)) {
            console.log(`[Surveyor] ✅ Identified ${provider}/${modelName} via pattern`);
            return rule.specs;
          }
        }
    }
    
    // 4. Fallback: Generic Heuristics (The "Safety Net")
    // If we missed a pattern, try to infer from common suffixes
    const lower = modelName.toLowerCase();
    
    // Vision?
    if (lower.includes('vision') || lower.includes('vl') || lower.includes('pixtral') || lower.includes('omni')) {
        return {
            contextWindow: 16384, // Safe default for vision models
            capabilities: ["text", "vision"]
        };
    }
    
    // Reasoning?
    if (lower.includes('deepseek-r1') || lower.includes('thinking') || lower.includes('reasoner')) {
         return {
            contextWindow: 32768,
            capabilities: ["text", "reasoning"]
        };
    }

    // Context Window from name (e.g., "model-128k")
    const contextMatch = modelName.match(/(\d+)k/i);
    if (contextMatch) {
      const contextK = parseInt(contextMatch[1]);
      console.log(`[Surveyor] 🔍 Inferred ${contextK}k context from model name`);
      return {
        contextWindow: contextK * 1024,
        capabilities: ["text"]
      };
    }
    
    console.log(`[Surveyor] ❓ Unknown model: ${provider}/${modelName} - needs Cartographer`);
    return null;
  }

  /**
   * Bulk survey: Apply patterns to all models in the registry
   */
  static async surveyAll(): Promise<{ surveyed: number; unknown: number }> {
    const { prisma } = await import('../db.js');
    
    const models = await prisma.model.findMany({
      where: {
        isActive: true,
        OR: [
          { capabilities: { is: null } },
          { capabilities: { confidence: 'low' } }
        ]
      },
      include: { 
        provider: true,
        capabilities: true 
      }
    });

    let surveyed = 0;
    let unknown = 0;

    console.log(`[Surveyor] 🔍 Inspecting ${models.length} incomplete models...`);

    for (const model of models) {
      // Pass both provider type (e.g. 'google') and explicit provider name if needed
      const specs = this.inspect(model.provider.type, model.modelId);
      
      if (specs) {
        const researchData = {
          contextWindow: specs.contextWindow || 4096,
          maxOutput: specs.maxOutput || 4096,
          hasVision: specs.capabilities.includes('vision'),
          hasAudioInput: specs.capabilities.includes('audio_in'),
          hasReasoning: specs.capabilities.includes('reasoning') || specs.capabilities.includes('thought'),
        };

        await saveModelKnowledge(model.id, researchData, 'surveyor', 'high');
        surveyed++;
      } else {
        unknown++;
      }
    }

    console.log(`[Surveyor] 📊 Survey complete: ${surveyed} identified, ${unknown} unknown`);
    return { surveyed, unknown };
  }
}

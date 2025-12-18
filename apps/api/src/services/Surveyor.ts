/**
 * SURVEYOR SERVICE
 * 
 * The "Map of Florida" - Uses regex patterns to instantly identify model capabilities
 * without burning tokens or making API calls. This is the FAST PATH for data collection.
 * 
 * Strategy: Pattern matching on model names to infer specs
 * - 90% of models follow naming conventions (gemini-1.5-pro, gpt-4o, etc.)
 * - We can instantly map these to known capabilities
 * - Only unknown models need the slower "Cartographer" agent
 */

export interface ModelSpecs {
  contextWindow?: number;
  maxOutput?: number;
  capabilities: string[]; // e.g. ["text", "vision", "audio_in", "image_gen", "embedding"]
  costPer1k?: number;
  rateLimit?: {
    rpm?: number; // Requests per minute
    tpm?: number; // Tokens per minute
    rpd?: number; // Requests per day
  };
}

interface ProviderPattern {
  pattern: RegExp;
  specs: ModelSpecs;
}

/**
 * THE ZONING MAP
 * Each provider has "zones" - model families with shared characteristics
 */
const PROVIDER_PATTERNS: Record<string, ProviderPattern[]> = {
  // ===== GOOGLE =====
  google: [
    {
      pattern: /gemini-2\.0-flash-exp/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 0, // Free tier
        rateLimit: { rpm: 10, tpm: 4000000, rpd: 1500 }
      }
    },
    {
      pattern: /gemini-1\.5-pro/i,
      specs: {
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"],
        costPer1k: 1.25, // $1.25 per 1M input tokens
        rateLimit: { rpm: 360, tpm: 4000000 }
      }
    },
    {
      pattern: /gemini-1\.5-flash/i,
      specs: {
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "audio_in", "tool_use"],
        costPer1k: 0.075, // $0.075 per 1M input tokens
        rateLimit: { rpm: 1000, tpm: 4000000 }
      }
    },
    {
      pattern: /gemini-pro-vision/i,
      specs: {
        contextWindow: 16384,
        capabilities: ["text", "vision"],
        costPer1k: 0.25
      }
    },
    {
      pattern: /text-embedding/i,
      specs: {
        contextWindow: 2048,
        capabilities: ["embedding"],
        costPer1k: 0.00001 // Very cheap
      }
    }
  ],

  // ===== OPENAI =====
  openai: [
    {
      pattern: /gpt-4o/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 2.50,
        rateLimit: { rpm: 10000, tpm: 30000000 }
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
      pattern: /gpt-3\.5-turbo/i,
      specs: {
        contextWindow: 16385,
        maxOutput: 4096,
        capabilities: ["text", "tool_use"],
        costPer1k: 0.50
      }
    },
    {
      pattern: /dall-e/i,
      specs: {
        capabilities: ["image_gen"],
        costPer1k: 20.00 // Per image, not per token
      }
    },
    {
      pattern: /tts/i,
      specs: {
        capabilities: ["text_to_speech"],
        costPer1k: 15.00 // Per 1M characters
      }
    },
    {
      pattern: /whisper/i,
      specs: {
        capabilities: ["speech_to_text"],
        costPer1k: 6.00 // Per minute
      }
    },
    {
      pattern: /text-embedding/i,
      specs: {
        contextWindow: 8191,
        capabilities: ["embedding"],
        costPer1k: 0.02
      }
    }
  ],

  // ===== ANTHROPIC =====
  anthropic: [
    {
      pattern: /claude-3\.5-sonnet/i,
      specs: {
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ["text", "vision", "tool_use"],
        costPer1k: 3.00,
        rateLimit: { rpm: 50, tpm: 40000 }
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
      pattern: /mistral-large/i,
      specs: {
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ["text", "tool_use"],
        costPer1k: 2.00
      }
    },
    {
      pattern: /mistral-medium/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0.70
      }
    },
    {
      pattern: /mistral-small/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text"],
        costPer1k: 0.20
      }
    },
    {
      pattern: /codestral/i,
      specs: {
        contextWindow: 32000,
        capabilities: ["text", "code"],
        costPer1k: 0.30
      }
    }
  ],

  // ===== GROQ =====
  groq: [
    {
      pattern: /llama.*70b/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0, // Free tier
        rateLimit: { rpm: 30, tpm: 6000, rpd: 14400 }
      }
    },
    {
      pattern: /llama.*8b/i,
      specs: {
        contextWindow: 8192,
        capabilities: ["text"],
        costPer1k: 0,
        rateLimit: { rpm: 30, tpm: 7000, rpd: 14400 }
      }
    },
    {
      pattern: /mixtral/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text"],
        costPer1k: 0,
        rateLimit: { rpm: 30, tpm: 5000, rpd: 14400 }
      }
    }
  ],

  // ===== OLLAMA (Local) =====
  ollama: [
    {
      pattern: /.*/i, // Catch-all for local models
      specs: {
        contextWindow: 4096, // Conservative default
        capabilities: ["text"],
        costPer1k: 0, // Local = free
        rateLimit: { rpm: 1000, tpm: 1000000 } // No real limits for local
      }
    }
  ]
};

export class Surveyor {
  /**
   * Inspect a model and return its specs if we can identify it via patterns
   * @returns ModelSpecs if identified, null if unknown (needs Cartographer)
   */
  static inspect(provider: string, modelName: string): ModelSpecs | null {
    const providerKey = provider.toLowerCase();
    const rules = PROVIDER_PATTERNS[providerKey] || [];
    
    // Try each pattern for this provider
    for (const rule of rules) {
      if (rule.pattern.test(modelName)) {
        console.log(`[Surveyor] ✅ Identified ${provider}/${modelName} via pattern`);
        return rule.specs;
      }
    }
    
    // Special case: Extract context window from model name (e.g., "model-128k")
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
   * @returns Count of models successfully surveyed
   */
  static async surveyAll(): Promise<{ surveyed: number; unknown: number }> {
    const { prisma } = await import('../db.js');
    
    // Find all models with missing specs
    const models = await prisma.model.findMany({
      where: {
        OR: [
          { specs: { equals: {} } },
          { specs: { equals: null as any } }
        ]
      },
      include: { provider: true }
    });

    let surveyed = 0;
    let unknown = 0;

    for (const model of models) {
      const specs = this.inspect((model as any).provider.type, model.modelId);
      
      if (specs) {
        // Update the model with surveyed specs
        await prisma.model.update({
          where: { id: model.id },
          data: {
            specs: {
              ...specs,
              source: 'surveyor',
              surveyedAt: new Date().toISOString()
            },
            capabilities: specs.capabilities
          }
        });
        surveyed++;
      } else {
        unknown++;
      }
    }

    console.log(`[Surveyor] 📊 Survey complete: ${surveyed} identified, ${unknown} unknown`);
    return { surveyed, unknown };
  }
}

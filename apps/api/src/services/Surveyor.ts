import axios from 'axios';
import { prisma } from '../db.js';
import { AgentRuntime } from './AgentRuntime.js';
import { createVolcanoAgent } from './VolcanoAgent.js';
import { ModelSelector } from '../orchestrator/ModelSelector.js';

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
      specs: { contextWindow: 1000000, maxOutput: 8192, capabilities: ["text", "vision", "audio_in", "tool_use"], costPer1k: 0.075 }
    },
    {
      // Catch gemini-1.5-pro AND gemini-pro-1.5
      pattern: /gemini.*1\.?5.*pro|gemini.*pro.*1\.?5/i,
      specs: { contextWindow: 2000000, maxOutput: 8192, capabilities: ["text", "vision", "audio_in", "video_in", "tool_use"], costPer1k: 1.25 }
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
      specs: { contextWindow: 200000, maxOutput: 8192, capabilities: ["text", "vision", "tool_use"], costPer1k: 3.00 }
    },
    {
      pattern: /claude-3\.?5-haiku/i,
      specs: { contextWindow: 200000, maxOutput: 8192, capabilities: ["text", "vision", "tool_use"], costPer1k: 1.00 }
    },
    {
      pattern: /claude-3-opus/i,
      specs: { contextWindow: 200000, maxOutput: 4096, capabilities: ["text", "vision", "tool_use"], costPer1k: 15.00 }
    },
    {
      pattern: /claude-3-sonnet/i, // Claude 3 Legacy
      specs: { contextWindow: 200000, maxOutput: 4096, capabilities: ["text", "vision", "tool_use"], costPer1k: 3.00 }
    },
    {
      pattern: /claude-3-haiku/i,
      specs: { contextWindow: 200000, maxOutput: 4096, capabilities: ["text", "vision", "tool_use"], costPer1k: 0.25 }
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
    },
    // NVIDIA NEW ADDITIONS
    {
      pattern: /cosmos/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["embedding", "vision_embed"],
        costPer1k: 0
      }
    },
    {
      pattern: /(dino|clip|embed|rerank)/i,
      specs: {
        contextWindow: 4096,
        capabilities: ["embedding"],
        costPer1k: 0
      }
    },
    {
      pattern: /(vila|fuyu|pixtral|paligemma|cambrian)/i,
      specs: {
        contextWindow: 32768,
        capabilities: ["text", "vision"],
        costPer1k: 0
      }
    },
    {
      pattern: /(flux|stable-diffusion|midjourney)/i,
      specs: {
        contextWindow: 0,
        capabilities: ["image_gen"],
        costPer1k: 0
      }
    },
    {
      pattern: /(parakeet|canary|speech|tts|whisper)/i,
      specs: {
        contextWindow: 0,
        capabilities: ["text_to_speech", "audio_in"],
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


  // ===== OLLAMA (Local) =====
  ollama: [
    {
      pattern: /embed/i,
      specs: { contextWindow: 2048, capabilities: ["embedding"], costPer1k: 0 }
    },
    {
      pattern: /(llava|vision|minicpm)/i,
      specs: { contextWindow: 128000, capabilities: ["text", "vision"], costPer1k: 0 }
    },
    {
      pattern: /whisper/i,
      specs: { contextWindow: 0, capabilities: ["audio_in"], costPer1k: 0 }
    },
    {
      pattern: /llama-?3\.?1/i, // Llama 3.1 is 128k
      specs: { contextWindow: 128000, capabilities: ["text", "tool_use"], costPer1k: 0 }
    },
    {
      pattern: /llama-?3\.?2/i, // Llama 3.2 (Vision for 11b/90b, Text for 1b/3b) - Assume Text fallback
      specs: { contextWindow: 128000, capabilities: ["text", "tool_use"], costPer1k: 0 }
    },
    {
      pattern: /llama-?3/i, // Base Llama 3 is 8k
      specs: { contextWindow: 8192, capabilities: ["text"], costPer1k: 0 }
    },
    {
      pattern: /gemma.?2/i,
      specs: { contextWindow: 8192, capabilities: ["text"], costPer1k: 0 }
    },
    {
      pattern: /codellama/i,
      specs: { contextWindow: 16384, capabilities: ["text", "code"], costPer1k: 0 }
    },
    {
      pattern: /mistral/i,
      specs: { contextWindow: 32768, capabilities: ["text"], costPer1k: 0 }
    },
    {
      pattern: /phi-?3\.?5/i,
      specs: { contextWindow: 128000, capabilities: ["text", "reasoning"], costPer1k: 0 }
    },
    {
      pattern: /phi-?3/i,
      specs: { contextWindow: 128000, capabilities: ["text"], costPer1k: 0 }
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
      } else if (lower.includes('reward')) {
        specs = { contextWindow: 4096, capabilities: ["text", "reward_model"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('moderation')) {
        specs = { contextWindow: 4096, capabilities: ["text", "moderation"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('med') || lower.includes('clinical') || lower.includes('bio') || lower.includes('healthcare')) {
        specs = { contextWindow: 4096, capabilities: ["text", "medical"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('weather') || lower.includes('climate')) {
        specs = { contextWindow: 4096, capabilities: ["text", "weather"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('math') || lower.includes('physics')) {
        specs = { contextWindow: 4096, capabilities: ["text", "specialized_science"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('embed') || lower.includes('bge') || lower.includes('rerank')) {
        specs = { contextWindow: 2048, capabilities: ["embedding"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('tts') || lower.includes('speech')) {
        specs = { contextWindow: 0, capabilities: ["text_to_speech", "audio_in"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('whisper')) {
        specs = { contextWindow: 0, capabilities: ["audio_in"], confidence: 'high', source: 'surveyor_heuristic' };
      } else if (lower.includes('dino') || lower.includes('clip')) {
        specs = { contextWindow: 0, capabilities: ["embedding", "vision_embed"], confidence: 'medium', source: 'surveyor_heuristic' };
      } else if (lower.includes('flux') || lower.includes('midjourney')) {
        specs = { contextWindow: 0, capabilities: ["image_gen"], confidence: 'high', source: 'surveyor_heuristic' };
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
      // Try to find explicit context size in name (e.g. "8k", "32k", "128k", "8192", "32768")
      const kMatch = modelName.match(/(\d+)k/i);
      const exactMatch = modelName.match(/(8192|32768|128000|16384|4096)/);

      if (kMatch) {
        specs = {
          contextWindow: parseInt(kMatch[1]) * 1024,
          capabilities: ["text"],
          confidence: 'medium',
          source: 'name_inference'
        };
      } else if (exactMatch) {
        specs = {
          contextWindow: parseInt(exactMatch[1]),
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
      // 4. PROTECTION: Never overwrite if source is 'manual' or 'agent'
      const isResearched = model.capabilities?.source === 'manual' ||
        model.capabilities?.source === 'agent' ||
        model.capabilities?.confidence === 'high';

      const needsHelp = (!model.capabilities ||
        (model.capabilities.contextWindow === 4096) ||
        (!model.capabilities.isMultimodal && model.name.includes('vision'))) && !isResearched;

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
          hasAudioOutput: specs.capabilities.includes('audio_out') || specs.capabilities.includes('text_to_speech'),
          hasReward: specs.capabilities.includes('reward_model'),
          hasModeration: specs.capabilities.includes('moderation'),
          specs: {
            coding: specs.capabilities.includes('code'),
            uncensored: specs.capabilities.includes('uncensored'),
            ocr: specs.capabilities.includes('ocr'),
            embedding: specs.capabilities.includes('embedding'),
            ragOptimized: specs.capabilities.includes('rag_optimized'),
            rewardModel: specs.capabilities.includes('reward_model'),
            moderation: specs.capabilities.includes('moderation'),
            medical: specs.capabilities.includes('medical'),
            weather: specs.capabilities.includes('weather'),
            science: specs.capabilities.includes('specialized_science')
          },
          hasEmbedding: specs.capabilities.includes('embedding'),
          hasOCR: specs.capabilities.includes('ocr'),
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

  /**
   * WATERFALL DISCOVERY (Self-Healing)
   * 1. Deterministic Pass: Standard /v1/models parsing.
   * 2. Double-Check: Detect anomalies if 0 models found.
   * 3. Agentic JSON Diagnostics: Agent writes repair script for raw JSON.
   * 4. Agentic Web Escalation: Final fallback via web browsing.
   */
  static async discoverFreeModels(providerId: string): Promise<string[]> {
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId }
    });

    if (!provider || !provider.baseURL) {
      console.error(`[Surveyor] Provider ${providerId} not found or has no baseURL`);
      return [];
    }

    console.log(`[Surveyor] 🌊 Starting Self-Healing Waterfall Discovery for ${providerId}`);

    // STEP 1: THE DETERMINISTIC PASS
    let rawJsonResponse: any = null;
    try {
      const apiKey = process.env[`${providerId.toUpperCase()}_API_KEY`] || '';
      const response = await axios.get(`${provider.baseURL}/models`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });
      rawJsonResponse = response.data;

      const models = rawJsonResponse?.data || rawJsonResponse || [];
      const freeModels: string[] = [];

      if (Array.isArray(models)) {
        for (const m of models) {
          const id = m.id || m.name;
          if (!id) continue;

          const isExplicitFree = id.toLowerCase().endsWith(':free');
          const pricing = m.pricing || m.cost || {};
          const isPricingFree = (pricing.prompt !== undefined && Number(pricing.prompt) === 0) ||
            (pricing.input !== undefined && Number(pricing.input) === 0);

          if (isExplicitFree || isPricingFree) {
            console.log(`[Surveyor] ✅ Found free model via API (Step 1): ${id}`);
            freeModels.push(id);
            await this.saveFreeModel(providerId, id);
          }
        }
      }

      // STEP 2: THE "DOUBLE-CHECK" VALIDATION
      if (freeModels.length > 0) {
        console.log(`[Surveyor] 🎯 Discovery complete for ${providerId} (Step 1). Found ${freeModels.length} models.`);
        return freeModels;
      }
      console.warn(`[Surveyor] ⚠️ ANOMALY DETECTED for ${providerId}: Deterministic pass found 0 free models. Proceeding to Step 3.`);
    } catch (error: any) {
      console.warn(`[Surveyor] ⚠️ Step 1 (Deterministic) failed for ${providerId}: ${error.message}`);
    }

    // STEP 3: AGENTIC JSON DIAGNOSTICS (Self-Healing)
    if (rawJsonResponse) {
      console.log(`[Surveyor] 🧠 Starting Agentic JSON Diagnostics for ${providerId}`);
      try {
        const selector = new ModelSelector();
        const bestModelSlug = await selector.resolveModelForRole({ id: 'researcher', metadata: {} } as any, 0, []);
        const bestModel = await prisma.model.findUnique({ where: { id: bestModelSlug } });

        if (bestModel) {
          const runtime = await AgentRuntime.create(undefined, []);
          const agent = await createVolcanoAgent({
            roleId: 'researcher',
            modelId: bestModel.name,
            providerId: bestModel.providerId,
            userGoal: `Heal parsing logic for ${providerId}`,
            isLocked: false,
            temperature: 0,
            maxTokens: 2048
          });

          // Truncate to first 5 models to save context
          const sampleJson = Array.isArray(rawJsonResponse?.data) ? rawJsonResponse.data.slice(0, 5) :
            (Array.isArray(rawJsonResponse) ? rawJsonResponse.slice(0, 5) : rawJsonResponse);

          const prompt = `
You are a data-parsing expert. Our standard parser failed to find free models in this API response. 
Analyze this JSON schema: ${JSON.stringify(sampleJson, null, 2)}

Question: How does this specific provider indicate a model is free? 
Task: Write a TypeScript function named 'extractFreeModels' that takes a JSON array (the 'data' or root) and returns an array of model ID strings for completely free models.
Requirements:
1. Return ONLY the executable TypeScript code for the function.
2. Ensure the code is robust and handles missing fields.
`;

          const agentResponse = await runtime.generateWithContext(agent, "You are a senior dev.", prompt) as string;
          const codeMatch = agentResponse.match(/```typescript([\s\S]*?)```/) ||
            agentResponse.match(/```javascript([\s\S]*?)```/) ||
            [null, agentResponse];
          const script = codeMatch[1].trim();

          console.log(`[Surveyor] 🛡️ Executing Agent-generated repair script for ${providerId}...`);

          try {
            // Safe Execution Wrapper
            const fn = new Function('data', `${script}; return extractFreeModels(data);`);
            const repairedModels = fn(rawJsonResponse?.data || rawJsonResponse);

            if (Array.isArray(repairedModels) && repairedModels.length > 0) {
              console.log(`[Surveyor] ✨ Self-Healing Success! Extracted ${repairedModels.length} models.`);
              for (const id of repairedModels) {
                await this.saveFreeModel(providerId, id);
              }
              return repairedModels;
            }
          } catch (e) {
            console.error("[Surveyor] ❌ Repair script crashed:", e);
          }
        }
      } catch (error) {
        console.error(`[Surveyor] ❌ Step 3 (Diagnostics) failed:`, error);
      }
    }

    // STEP 4: AGENTIC WEB ESCALATION (The Final Fallback)
    console.log(`[Surveyor] 🌐 Escalating to WEB SCAPE for ${providerId}`);
    try {
      const selector = new ModelSelector();
      const bestModelSlug = await selector.resolveModelForRole({ id: 'researcher', metadata: {} } as any, 0, []);
      const bestModel = await prisma.model.findUnique({ where: { id: bestModelSlug } });

      if (!bestModel) throw new Error("No model available for research");

      const runtime = await AgentRuntime.create(undefined, ['browse', 'research.web_scrape']);
      const agent = await createVolcanoAgent({
        roleId: 'researcher',
        modelId: bestModel.name,
        providerId: bestModel.providerId,
        userGoal: `Discover free models for ${providerId} via web`,
        isLocked: false,
        temperature: 0.1,
        maxTokens: 2048
      });

      const prompt = `
The API does not contain pricing data for ${providerId}. 
Use the 'browse' or 'research.web_scrape' tool to navigate to ${(provider as any).pricingUrl || provider.baseURL} or search the web for '${provider.label || providerId} free API models'. 
Read the documentation and extract the exact model IDs that are available on the free tier. 

Return a strictly formatted JSON array of strings containing only the model IDs.
Example: ["model-x-free", "model-y-free"]
`;

      const response = await runtime.generateWithContext(agent, "You are a researcher.", prompt) as string;
      const jsonMatch = response.match(/\[\s*".*"\s*\]/s) || response.match(/\[.*\]/s);
      if (jsonMatch) {
        const discovered = JSON.parse(jsonMatch[0]) as string[];
        if (Array.isArray(discovered)) {
          for (const id of discovered) {
            console.log(`[Surveyor] ✅ Agent verified free model: ${id}`);
            await this.saveFreeModel(providerId, id);
          }
          return discovered;
        }
      }
    } catch (error) {
      console.error(`[Surveyor] ❌ Step 4 (Web) failed:`, error);
    }

    return [];
  }

  private static async saveFreeModel(providerId: string, modelName: string) {
    let model = await prisma.model.findUnique({
      where: { providerId_name: { providerId, name: modelName } }
    });

    if (!model) {
      model = await prisma.model.create({
        data: {
          providerId,
          name: modelName,
          isActive: true,
          providerData: { source: 'surveyor_discovery' }
        }
      });
    }

    await prisma.modelCapabilities.upsert({
      where: { modelId: model.id },
      create: {
        modelId: model.id,
        isFreeTier: true,
        source: 'surveyor_discovery',
        confidence: 'high'
      } as any,
      update: {
        isFreeTier: true,
        source: 'surveyor_discovery',
        updatedAt: new Date()
      } as any
    });
  }
}

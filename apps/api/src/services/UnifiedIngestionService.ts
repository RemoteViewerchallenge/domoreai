import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// 1. Define "Rosetta Stone" Mappings
// Tells the system how to find 'contextWindow' for each provider
const MAPPINGS: Record<string, {
  contextPath: string;
  namePath: string;
  idPath: string;
  pricingPath?: string;
}> = {
  google: {
    contextPath: 'inputTokenLimit', // Google uses this key
    namePath: 'displayName',
    idPath: 'name' // e.g. "models/gemini-1.5-flash"
  },
  openrouter: {
    contextPath: 'context_length', // OpenRouter uses this
    namePath: 'name',
    idPath: 'id',
    pricingPath: 'pricing'
  },
  groq: {
    contextPath: 'context_window',
    namePath: 'id',
    idPath: 'id'
  },
  ollama: {
    contextPath: 'details.context_length', // Often hidden, defaulted later
    namePath: 'name',
    idPath: 'name'
  },
  mistral: {
    contextPath: 'max_context_length',
    namePath: 'name',
    idPath: 'id'
  }
};

interface RawModelData {
  [key: string]: unknown;
}

export class UnifiedIngestionService {
  
  /**
   * Ingests all model JSON files from the latest_models directory
   * Uses provider-specific mappings to normalize diverse JSON schemas
   */
  static async ingestAllModels(modelsDir?: string): Promise<void> {
    const targetDir = modelsDir || path.join(process.cwd(), 'latest_models');
    
    let files: string[];
    try {
      files = await fs.readdir(targetDir);
    } catch (error) {
      console.error(`[UnifiedIngestion] Failed to read directory ${targetDir}:`, error);
      throw new Error(`Models directory not found: ${targetDir}`);
    }

    console.log(`🚀 Starting Unified Ingestion from ${targetDir}...`);

    for (const file of files) {
      // Only process JSON files
      if (!file.endsWith('.json')) continue;

      // Detect Provider from Filename (e.g., "google_models_...")
      const providerMatch = file.match(/^(google|openrouter|groq|ollama|mistral)/);
      if (!providerMatch) {
        console.log(`⏭️  Skipping ${file} - no provider pattern match`);
        continue;
      }
      
      const providerName = providerMatch[1];
      const mapping = MAPPINGS[providerName] || MAPPINGS['openrouter']; // Fallback
      
      console.log(`📦 Ingesting ${providerName} from ${file}...`);
      
      try {
        const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
        const rawModels = JSON.parse(content) as RawModelData[] | { data: RawModelData[] };
        
        // Handle both array and wrapped structures (Groq sometimes wraps in { data: [] })
        const modelList = Array.isArray(rawModels) ? rawModels : ((rawModels as { data?: RawModelData[] }).data || []);

        if (modelList.length === 0) {
          console.log(`⚠️  No models found in ${file}`);
          continue;
        }

        // Find or create the provider config
        const providerConfig = await this.ensureProviderConfig(providerName);

        let ingestedCount = 0;
        let skippedCount = 0;

        for (const raw of modelList) {
          try {
            await this.ingestSingleModel(raw, providerConfig.id, providerName, mapping);
            ingestedCount++;
          } catch (error) {
            console.error(`    ❌ Failed to ingest model:`, error);
            skippedCount++;
          }
        }

        console.log(`    ✅ Ingested ${ingestedCount} models, skipped ${skippedCount} from ${file}`);
      } catch (error) {
        console.error(`[UnifiedIngestion] Failed to process ${file}:`, error);
      }
    }
    
    console.log("✅ Ingestion Complete. Agents ready to spawn.");
  }

  /**
   * Ensures a provider configuration exists, creating it if necessary
   */
  private static async ensureProviderConfig(providerName: string): Promise<{ id: string }> {
    // Try to find existing provider by type/label
    const existing = await prisma.providerConfig.findFirst({
      where: {
        OR: [
          { type: providerName },
          { label: providerName }
        ]
      }
    });

    if (existing) {
      return existing;
    }

    // Create a placeholder provider config
    console.log(`  🔧 Creating provider config for ${providerName}...`);
    return await prisma.providerConfig.create({
      data: {
        label: providerName,
        type: providerName,
        apiKey: 'PLACEHOLDER', // User will need to configure
        isEnabled: false, // Disabled until user adds real API key
        baseURL: this.getDefaultBaseURL(providerName)
      }
    });
  }

  /**
   * Returns default base URL for known providers
   */
  private static getDefaultBaseURL(providerName: string): string {
    const urls: Record<string, string> = {
      google: 'https://generativelanguage.googleapis.com',
      openrouter: 'https://openrouter.ai/api/v1',
      groq: 'https://api.groq.com/openai/v1',
      ollama: 'http://localhost:11434',
      mistral: 'https://api.mistral.ai/v1'
    };
    return urls[providerName] || '';
  }

  /**
   * Ingests a single model from raw provider data
   */
  private static async ingestSingleModel(
    raw: RawModelData,
    providerId: string,
    providerName: string,
    mapping: typeof MAPPINGS[string]
  ): Promise<void> {
    // 2. Extract Data using Mappings
    const modelId = this.resolvePath(raw, mapping.idPath) as string;
    const name = (this.resolvePath(raw, mapping.namePath) as string) || modelId;
    const rawContext = this.resolvePath(raw, mapping.contextPath);
    
    if (!modelId) {
      throw new Error('Model ID not found in raw data');
    }

    // 3. Normalize "Specs" (The Unified Layer)
    let contextWindow = 4096; // Safe default
    if (rawContext !== null && rawContext !== undefined) {
      if (typeof rawContext === 'number') {
        contextWindow = rawContext;
      } else if (typeof rawContext === 'string') {
        contextWindow = parseInt(rawContext);
      }
    }
    
    // Extract max output tokens
    let maxOutput = 4096; // default
    if ('outputTokenLimit' in raw) {
      const outputLimit = raw.outputTokenLimit;
      if (typeof outputLimit === 'number') {
        maxOutput = outputLimit;
      } else if (typeof outputLimit === 'string') {
        maxOutput = parseInt(outputLimit);
      }
    } else if ('top_provider' in raw && typeof raw.top_provider === 'object' && raw.top_provider) {
      const topProvider = raw.top_provider as Record<string, unknown>;
      if (topProvider.max_completion_tokens) {
        const maxCompletionTokens = topProvider.max_completion_tokens;
        if (typeof maxCompletionTokens === 'number') {
          maxOutput = maxCompletionTokens;
        } else if (typeof maxCompletionTokens === 'string') {
          maxOutput = parseInt(maxCompletionTokens);
        }
      }
    }

    const isMultimodal = this.detectMultimodal(raw);
    
    const specs = {
      contextWindow: contextWindow,
      maxOutput: maxOutput,
      isMultimodal: isMultimodal,
      pricing: mapping.pricingPath ? this.resolvePath(raw, mapping.pricingPath) : {}
    };

    // Determine capabilities
    const capabilities = this.extractCapabilities(raw, isMultimodal);

    // Extract pricing
    const costPer1k = this.extractCostPer1k(raw, providerName);
    const isFree = costPer1k === 0;

    // Extract pricing config for multi-modal support
    const pricingConfig = this.extractPricingConfig(raw, providerName);

    // 4. Upsert into DB (Preserving Raw Data!)
    await prisma.model.upsert({
      where: { 
        providerId_modelId: {
          providerId: providerId,
          modelId: modelId
        }
      }, 
      update: {
        name,
        specs,
        providerData: raw, // <--- CRITICAL: Never lose the original data
        capabilities,
        costPer1k,
        isFree,
        pricingConfig: pricingConfig || undefined
      },
      create: {
        providerId: providerId,
        modelId: modelId,
        name: name,
        specs,
        providerData: raw,
        capabilities,
        costPer1k,
        isFree,
        pricingConfig: pricingConfig || undefined
      }
    });
  }

  /**
   * Helper to dig into JSON paths (supports dot notation like "details.context_length")
   */
  private static resolvePath(obj: RawModelData, path: string): unknown {
    return path.split('.').reduce<unknown>((o, key) => {
      if (o && typeof o === 'object' && key in (o as Record<string, unknown>)) {
        return (o as Record<string, unknown>)[key];
      }
      return null;
    }, obj);
  }

  /**
   * Heuristic to detect vision/multimodal capabilities
   */
  private static detectMultimodal(raw: RawModelData): boolean {
    const str = JSON.stringify(raw).toLowerCase();
    return str.includes('vision') || 
           str.includes('image') || 
           str.includes('multimodal') ||
           str.includes('video');
  }

  /**
   * Extracts capabilities array from raw model data
   */
  private static extractCapabilities(raw: RawModelData, isMultimodal: boolean): string[] {
    const capabilities: string[] = ['text'];

    // Check for explicit modalities (OpenRouter pattern)
    if ('architecture' in raw && typeof raw.architecture === 'object' && raw.architecture) {
      const arch = raw.architecture as Record<string, unknown>;
      if ('input_modalities' in arch && Array.isArray(arch.input_modalities)) {
        capabilities.push(...(arch.input_modalities as string[]));
      }
    }

    // Check for supported generation methods (Google pattern)
    if ('supportedGenerationMethods' in raw && Array.isArray(raw.supportedGenerationMethods)) {
      const methods = raw.supportedGenerationMethods as string[];
      if (methods.includes('generateContent')) {
        capabilities.push('generateContent');
      }
    }

    // Check for reasoning capability
    if ('thinking' in raw && raw.thinking === true) {
      capabilities.push('reasoning');
    }

    // Add vision if multimodal
    if (isMultimodal && !capabilities.includes('vision')) {
      capabilities.push('vision');
    }

    // Deduplicate
    return [...new Set(capabilities)];
  }

  /**
   * Extracts cost per 1k tokens (normalized for prompt tokens)
   */
  private static extractCostPer1k(raw: RawModelData, providerName: string): number {
    // OpenRouter format
    if ('pricing' in raw && typeof raw.pricing === 'object' && raw.pricing) {
      const pricing = raw.pricing as Record<string, unknown>;
      if ('prompt' in pricing && typeof pricing.prompt === 'string') {
        const cost = parseFloat(pricing.prompt);
        // OpenRouter reports per-token, we want per-1k
        return cost * 1000;
      }
    }

    // Google/others - often free or need to check separately
    if ('isFree' in raw && raw.isFree === true) {
      return 0;
    }

    // Default: assume unknown pricing
    return 0;
  }

  /**
   * Extracts comprehensive pricing configuration for multi-modal models
   */
  private static extractPricingConfig(raw: RawModelData, providerName: string): Record<string, unknown> | null {
    if ('pricing' in raw && typeof raw.pricing === 'object' && raw.pricing) {
      return raw.pricing as Record<string, unknown>;
    }
    return null;
  }
}

import { PrismaClient, Prisma } from '@prisma/client';
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

// Type for the raw provider response structure
interface RawProviderResponse {
  data?: RawModelData[];
  models?: RawModelData[];
  [key: string]: unknown;
}

export class UnifiedIngestionService {
  
  /**
   * Ingests all model JSON files from the latest_models directory
   * TWO-PHASE APPROACH:
   * 1. Save raw JSON to RawDataLake (The "Bag") - prevents data loss
   * 2. Process into Model table with normalization
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
    console.log(`📋 Phase 1: Saving raw data to RawDataLake (The Bag)\n`);

    // PHASE 1: Save all raw JSON to RawDataLake
    const rawRecords: Array<{ id: string; provider: string; fileName: string }> = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const providerMatch = file.match(/^(google|openrouter|groq|ollama|mistral)/);
      if (!providerMatch) {
        console.log(`⏭️  Skipping ${file} - no provider pattern match`);
        continue;
      }
      
      const providerName = providerMatch[1];
      
      try {
        const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
        const rawData = JSON.parse(content) as RawProviderResponse | RawModelData[];
        
        // Save to RawDataLake (The Bag)
        const record = await prisma.rawDataLake.create({
          data: {
            provider: providerName,
            fileName: file,
            rawData: rawData as Prisma.JsonObject,
            processed: false
          }
        });
        
        rawRecords.push({ id: record.id, provider: providerName, fileName: file });
        console.log(`  💾 Saved ${file} to RawDataLake (ID: ${record.id})`);
      } catch (error) {
        console.error(`  ❌ Failed to save ${file} to RawDataLake:`, error);
      }
    }

    console.log(`\n📋 Phase 2: Processing ${rawRecords.length} raw records into Model table\n`);

    // PHASE 2: Process each raw record into Model table
    let totalIngested = 0;
    let totalFiltered = 0;

    for (const { id, provider, fileName } of rawRecords) {
      try {
        // Fetch the raw record
        const rawRecord = await prisma.rawDataLake.findUnique({
          where: { id }
        });

        if (!rawRecord) {
          console.warn(`  ⚠️  Raw record ${id} not found`);
          continue;
        }

        // Type the raw data properly to avoid unsafe any usage
        const rawData = rawRecord.rawData as RawProviderResponse | RawModelData[];
        const mapping = MAPPINGS[provider] || MAPPINGS['openrouter'];
        
        // Handle both array and wrapped structures
        let modelList: RawModelData[];
        if (Array.isArray(rawData)) {
          modelList = rawData;
        } else {
          modelList = rawData.data || rawData.models || [];
        }

        if (modelList.length === 0) {
          console.log(`  ⚠️  No models in ${fileName} (provider may have returned empty list)`);
          // Mark as processed even if empty - we don't want to retry forever
          await prisma.rawDataLake.update({
            where: { id },
            data: { processed: true }
          });
          continue;
        }

        console.log(`📦 Processing ${provider} from ${fileName} (${modelList.length} models)...`);

        // Find or create provider config
        const providerConfig = await this.ensureProviderConfig(provider);

        let ingestedCount = 0;
        let filteredCount = 0;

        for (const raw of modelList) {
          try {
            // ingestSingleModel now returns true if accepted, false if filtered
            const accepted = await this.ingestSingleModel(raw, providerConfig.id, provider, mapping);
            if (accepted) {
              ingestedCount++;
            } else {
              filteredCount++;
            }
          } catch (error) {
            console.error(`    ❌ Failed to process model:`, error);
            filteredCount++;
          }
        }

        // Mark as processed
        await prisma.rawDataLake.update({
          where: { id },
          data: { processed: true }
        });

        console.log(`    ✅ Ingested ${ingestedCount} models, filtered ${filteredCount} from ${fileName}`);
        totalIngested += ingestedCount;
        totalFiltered += filteredCount;
      } catch (error) {
        console.error(`[UnifiedIngestion] Failed to process raw record ${id}:`, error);
      }
    }
    
    console.log(`\n✅ Ingestion Complete!`);
    console.log(`   - Saved to App: ${totalIngested} models`);
    console.log(`   - Filtered Out: ${totalFiltered} models (Paid OpenRouter or Invalid)`);
    console.log(`\n`);
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
   * Uses Ghost Records pattern: updates lastSeenAt, preserves source
   * 
   * @returns true if model was accepted and ingested, false if filtered out
   */
  private static async ingestSingleModel(
    raw: RawModelData,
    providerId: string,
    providerName: string,
    mapping: typeof MAPPINGS[string]
  ): Promise<boolean> {
    // 2. Extract Data using Mappings
    const modelId = this.resolvePath(raw, mapping.idPath) as string;
    const name = (this.resolvePath(raw, mapping.namePath) as string) || modelId;
    
    if (!modelId) {
      throw new Error('Model ID not found in raw data');
    }

    // ==============================================================================
    // PHASE 2 GATEKEEPER: Strict Filtering
    // ==============================================================================
    // Determine if this model is truly free
    const isFree = this.isModelFree(providerName, raw);

    // STRICT RULE: If OpenRouter AND Not Free, REJECT IT ENTIRELY
    // This prevents paid models from ever entering the Model table
    if (providerName === 'openrouter' && !isFree) {
      // Log the rejection for transparency
      console.log(`    🚫 Filtered out paid OpenRouter model: ${name} (${modelId})`);
      return false; // Model rejected - never enters the database
    }

    // ==============================================================================
    // NORMALIZATION: Only reached if model passed the gatekeeper
    // ==============================================================================
    const rawContext = this.resolvePath(raw, mapping.contextPath);
    
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
    
    // CRITICAL: Preserve the raw pricing object in specs
    // This solves "the data is not there" - we keep the original pricing structure
    const specs: Prisma.JsonObject = {
      contextWindow: contextWindow,
      maxOutput: maxOutput,
      isMultimodal: isMultimodal,
      pricing: mapping.pricingPath ? (this.resolvePath(raw, mapping.pricingPath) as Prisma.JsonValue) : {}
    };

    // Determine capabilities (as string array for capabilityTags)
    const capabilityTags = this.extractCapabilities(raw, isMultimodal);

    // Extract cost (will be 0 for free models)
    const costPer1k = isFree ? 0 : this.extractCostPer1k(raw, providerName);

    // 4. GHOST RECORDS PATTERN: Upsert with timestamp tracking
    // - Update lastSeenAt on every ingestion (proves the model still exists)
    // - Preserve source if already exists (don't overwrite INFERENCE/MANUAL with INDEX)
    // - Set isActive=true (model is confirmed alive)
    const now = new Date();
    
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
        providerData: raw as Prisma.JsonObject, // <--- CRITICAL: Never lose the original data
        capabilityTags, // Use capabilityTags (string[]) instead of capabilities (relation)
        costPer1k,
        isFree: true, // We only accepted it because it passed the gatekeeper
        // GHOST RECORDS: Update tracking fields
        lastSeenAt: now,        // Confirm this model is still alive
        isActive: true,         // Re-activate if it was marked inactive
        // Note: We do NOT update 'source' - preserve INFERENCE/MANUAL discoveries
      },
      create: {
        providerId: providerId,
        modelId: modelId,
        name: name,
        specs,
        providerData: raw as Prisma.JsonObject,
        capabilityTags, // Use capabilityTags (string[]) instead of capabilities (relation)
        costPer1k,
        isFree: true, // Only free models make it this far
        // GHOST RECORDS: Initialize tracking fields
        source: 'INDEX',        // This came from the provider's official list
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true,
      }
    });

    return true; // Model accepted and ingested
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
   * Helper to detect if a model is TRULY free
   * This is strict to avoid false positives that could lead to unexpected charges
   * 
   * WHITELIST APPROACH:
   * - Ollama: Always free (local)
   * - Groq, Mistral, Google: Free tier with rate limits (fail-open)
   * - OpenRouter: STRICT - must have pricing.prompt === 0 AND pricing.completion === 0
   */
  private static isModelFree(providerName: string, raw: RawModelData): boolean {
    // 1. Whitelist: Local models are always free
    if (providerName === 'ollama' || providerName === 'local') {
      return true;
    }
    
    // 2. Whitelist: Providers with robust Free Tiers / Rate Limits
    // We ingest ALL of these. We assume the user stays within rate limits.
    // These providers have generous free tiers and we fail-open (trust them)
    if (['groq', 'mistral', 'google'].includes(providerName)) {
      return true; 
    }

    // 3. STRICT CHECK: OpenRouter
    // OpenRouter does NOT have a simple "is_free" flag.
    // We MUST check the pricing object structure.
    // The pricing object looks like: { prompt: "0", completion: "0" } for free models
    // or { prompt: "0.00001", completion: "0.00002" } for paid models
    if (providerName === 'openrouter') {
      if ('pricing' in raw && typeof raw.pricing === 'object' && raw.pricing !== null) {
        const pricing = raw.pricing as Record<string, unknown>;
        
        // Extract prompt and completion costs
        const promptVal = pricing.prompt;
        const completionVal = pricing.completion;
        
        // Convert to numbers, defaulting to 999 (expensive) if invalid
        const prompt = parseFloat(
          typeof promptVal === 'string' || typeof promptVal === 'number' 
            ? String(promptVal) 
            : '999'
        );
        const completion = parseFloat(
          typeof completionVal === 'string' || typeof completionVal === 'number' 
            ? String(completionVal) 
            : '999'
        );
        
        // It is only free if BOTH are exactly zero
        const isFree = prompt === 0 && completion === 0;
        
        // Debug logging for OpenRouter pricing detection
        if (!isFree) {
          const modelId = this.resolvePath(raw, 'id') as string;
          console.log(`    💰 OpenRouter pricing check for ${modelId}: prompt=${prompt}, completion=${completion} -> ${isFree ? 'FREE' : 'PAID'}`);
        }
        
        return isFree;
      }
      
      // If no pricing info, assume NOT free (conservative/safe)
      console.log(`    ⚠️  OpenRouter model missing pricing info - treating as PAID (safe default)`);
      return false;
    }

    // Default: assume NOT free for safety (unknown providers)
    return false;
  }

  /**
   * Extracts cost per 1k tokens (normalized for prompt tokens)
   */
  private static extractCostPer1k(raw: RawModelData, providerName: string): number {
    // Use strict free checker first
    if (this.isModelFree(providerName, raw)) {
      return 0;
    }

    // OpenRouter format
    if ('pricing' in raw && typeof raw.pricing === 'object' && raw.pricing) {
      const pricing = raw.pricing as Record<string, unknown>;
      if ('prompt' in pricing && typeof pricing.prompt === 'string') {
        const cost = parseFloat(pricing.prompt);
        // OpenRouter reports per-token, we want per-1k
        return cost * 1000;
      }
    }

    // Default: unknown pricing (conservative: treat as paid)
    return 0;
  }

  /**
   * Extracts comprehensive pricing configuration for multi-modal models
   */
  private static extractPricingConfig(raw: RawModelData, _providerName: string): Record<string, unknown> | null {
    if ('pricing' in raw && typeof raw.pricing === 'object' && raw.pricing) {
      return raw.pricing as Record<string, unknown>;
    }
    return null;
  }
}

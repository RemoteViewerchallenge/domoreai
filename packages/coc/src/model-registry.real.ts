// Real model registry that uses Ollama for local testing
import fetch from 'node-fetch';
import { config } from './config';

interface ModelConfig {
  provider: string;
  model_id: string;
  name: string;
  is_free: boolean;
  context_window?: number;
  type?: string;
}

export class ModelRegistry {
  private ollamaUrl: string;
  private ollamaModel: string;
  private modelsData: ModelConfig[];

  constructor() {
    this.ollamaUrl = config.OLLAMA_URL;
    this.ollamaModel = config.OLLAMA_MODEL;
    
    // Load models from the JSON file
    const fs = require('fs');
    const path = require('path');
    const modelsPath = path.resolve(process.cwd(), '..', '..', 'apps', 'api', 'latest_models', 'models.json');
    
    try {
      this.modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
      console.log(`[ModelRegistry] Loaded ${this.modelsData.length} models from registry`);
    } catch (e) {
      console.warn('[ModelRegistry] Failed to load models.json:', e);
      this.modelsData = [];
    }
  }

  pick(opts: { role?: string; name?: string }): Model {
    // For COC testing, all models map to the same Ollama model
    // But we track which "logical" model was selected for the bandit
    const modelName = opts.name || 'granite4:micro';
    
    // SIMULATION MODE: Log what bandit selected vs. what we're actually using
    console.log(`[ModelRegistry] 🎯 Bandit selected: ${modelName}, ⚙️  Using Ollama: ${this.ollamaModel} (SIMULATION MODE)`);
    
    // Find metadata from registry if available
    const modelMeta = this.modelsData.find(m => 
      m.model_id === modelName || m.name === modelName
    );

    return new Model(
      modelName,
      this.ollamaUrl,
      this.ollamaModel,
      modelMeta
    );
  }

  listModels(): ModelConfig[] {
    return this.modelsData;
  }
}

class Model {
  name: string;
  private ollamaUrl: string;
  private ollamaModel: string;
  private meta?: ModelConfig;

  constructor(name: string, ollamaUrl: string, ollamaModel: string, meta?: ModelConfig) {
    this.name = name;
    this.ollamaUrl = ollamaUrl;
    this.ollamaModel = ollamaModel;
    this.meta = meta;
  }

  async run(prompt: string, opts?: { meta?: any }): Promise<{ text: string; artifacts?: any[]; nextRoles?: any[] }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const text = data.response || '';

      // Try to parse tool calls or structured output from response
      const artifacts: any[] = [];
      const nextRoles: any[] = [];

      // Simple heuristic: if response contains JSON, try to parse it
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.artifacts) artifacts.push(...parsed.artifacts);
          if (parsed.nextRoles) nextRoles.push(...parsed.nextRoles);
        }
      } catch {}

      return { text, artifacts, nextRoles };
    } catch (error) {
      console.error(`[Model ${this.name}] Call failed:`, error);
      throw error;
    }
  }
}

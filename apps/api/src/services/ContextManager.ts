import fs from 'fs';
import path from 'path';

export type ContextState = {
  tone?: string;
  style?: string;
  memory: Record<string, string>;
};

/**
 * ContextManager
 * - In-memory Map backed by a JSON file for optional persistence
 * - Safe, simple persistence (no DB migrations required)
 */
export class ContextManager {
  private store: Map<string, ContextState>;
  private persistFile: string | null;

  constructor(persistFile?: string | null) {
    this.store = new Map();
    this.persistFile = persistFile || path.join(process.cwd(), 'data', 'context_store.json');
    this.loadFromDisk();
  }

  private ensureDataDir() {
    if (!this.persistFile) return;
    const dir = path.dirname(this.persistFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private loadFromDisk() {
    try {
      if (!this.persistFile) return;
      if (fs.existsSync(this.persistFile)) {
        const raw = fs.readFileSync(this.persistFile, 'utf8');
        const obj = JSON.parse(raw || '{}');
        for (const key of Object.keys(obj)) {
          this.store.set(key, obj[key]);
        }
      }
    } catch (err) {
      console.warn('[ContextManager] Failed to load context store:', err);
    }
  }

  private saveToDisk() {
    try {
      if (!this.persistFile) return;
      this.ensureDataDir();
      const obj: Record<string, ContextState> = {};
      for (const [k, v] of this.store.entries()) obj[k] = v;
      fs.writeFileSync(this.persistFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ContextManager] Failed to persist context store:', err);
    }
  }

  async getContext(roleId: string): Promise<ContextState> {
    if (!roleId) return { tone: '', style: '', memory: {} };
    let ctx = this.store.get(roleId);
    if (!ctx) {
      ctx = { tone: '', style: '', memory: {} };
      this.store.set(roleId, ctx);
    }
    return { tone: ctx.tone, style: ctx.style, memory: { ...ctx.memory } };
  }

  async setContext(roleId: string, state: Partial<ContextState>): Promise<void> {
    if (!roleId) return;
    const existing = this.store.get(roleId) || { tone: '', style: '', memory: {} };
    const merged: ContextState = {
      tone: state.tone ?? existing.tone,
      style: state.style ?? existing.style,
      memory: { ...(existing.memory || {}), ...(state.memory || {}) },
    };
    this.store.set(roleId, merged);
    this.saveToDisk();
  }

  async updateTone(roleId: string, tone: string): Promise<void> {
    const existing = this.store.get(roleId) || { tone: '', style: '', memory: {} };
    existing.tone = tone;
    this.store.set(roleId, existing);
    this.saveToDisk();
  }

  async updateStyle(roleId: string, style: string): Promise<void> {
    const existing = this.store.get(roleId) || { tone: '', style: '', memory: {} };
    existing.style = style;
    this.store.set(roleId, existing);
    this.saveToDisk();
  }

  async setMemoryKey(roleId: string, key: string, value: string): Promise<void> {
    const existing = this.store.get(roleId) || { tone: '', style: '', memory: {} };
    existing.memory = { ...(existing.memory || {}), [key]: value };
    this.store.set(roleId, existing);
    this.saveToDisk();
  }

  async removeMemoryKey(roleId: string, key: string): Promise<void> {
    const existing = this.store.get(roleId);
    if (!existing) return;
    if (existing.memory && key in existing.memory) {
      const copy = { ...existing.memory };
      delete copy[key];
      existing.memory = copy;
      this.store.set(roleId, existing);
      this.saveToDisk();
    }
  }

  async clearContext(roleId: string): Promise<void> {
    this.store.delete(roleId);
    this.saveToDisk();
  }

  /**
   * Cell Division: Validates if model can fit the context from given files
   * Returns validation result with action suggestions
   */
  async validateContextFit(
    modelId: string, 
    filePaths: string[]
  ): Promise<{
    fit: boolean;
    action?: string;
    reason?: string;
    usage?: {
      totalTokens: number;
      limit: number;
      utilizationPercent: number;
    };
  }> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // 1. Fetch Model Specs
      const model = await prisma.model.findUnique({ 
        where: { id: modelId },
        select: { specs: true, name: true }
      });

      if (!model) {
        return {
          fit: false,
          action: 'SELECT_DIFFERENT_MODEL',
          reason: `Model ${modelId} not found in registry`
        };
      }

      const specs = model.specs as { contextWindow?: number };
      const limit = specs?.contextWindow || 8192; // Default if unknown

      // 2. Calculate "Weight" - count tokens from files
      const totalTokens = await this.countTokensFromFiles(filePaths);

      const utilizationPercent = (totalTokens / limit) * 100;

      console.log(`⚖️ Context Check for ${model.name}: ${totalTokens} / ${limit} (${utilizationPercent.toFixed(1)}%)`);

      // 3. Determine if context fits
      const SAFE_THRESHOLD = 0.85; // Use 85% of context window to leave room for output

      if (totalTokens > limit * SAFE_THRESHOLD) {
        // TRIGGER CELL DIVISION
        return {
          fit: false,
          action: 'SPLIT_JOB',
          reason: `Context overflow (${totalTokens} tokens > ${(limit * SAFE_THRESHOLD).toFixed(0)} safe limit). ` +
                  `Suggest breaking ${filePaths.length > 1 ? 'files' : filePaths[0]} into sub-tasks.`,
          usage: {
            totalTokens,
            limit,
            utilizationPercent
          }
        };
      }

      return { 
        fit: true,
        usage: {
          totalTokens,
          limit,
          utilizationPercent
        }
      };
    } catch (error) {
      console.error('[ContextManager] Context validation failed:', error);
      return {
        fit: false,
        action: 'ERROR',
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Counts approximate tokens from file paths
   * Uses a simple heuristic: 1 token ≈ 4 characters
   */
  private async countTokensFromFiles(filePaths: string[]): Promise<number> {
    let totalChars = 0;

    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          totalChars += content.length;
        } else {
          console.warn(`[ContextManager] File not found: ${filePath}`);
        }
      } catch (error) {
        console.warn(`[ContextManager] Failed to read ${filePath}:`, error);
      }
    }

    // Simple heuristic: ~4 chars per token
    return Math.ceil(totalChars / 4);
  }

  /**
   * Advanced tokenization using a proper tokenizer (TODO: integrate tiktoken or similar)
   * For now, uses the simple character-based heuristic
   */
  async countTokens(text: string): Promise<number> {
    // TODO: Integrate proper tokenizer (tiktoken for GPT models, etc.)
    // For now, use simple heuristic
    return Math.ceil(text.length / 4);
  }
}


// Export a singleton for app-wide usage (AgentRuntime will use this)
export const contextManager = new ContextManager();

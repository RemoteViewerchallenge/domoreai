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
}

// Export a singleton for app-wide usage (AgentRuntime will use this)
export const contextManager = new ContextManager();

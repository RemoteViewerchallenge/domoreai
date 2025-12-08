// ModelBandit - per-role model/prompt selection (epsilon-greedy).
import fs from 'fs';
import path from 'path';

export type ModelArm = {
  id: string;
  modelName?: string;
  promptTemplate?: string;
  topK?: number;
  wins: number;
  plays: number;
  meta?: any;
};

export class ModelBandit {
  filepath: string;
  epsilon = 0.4; // Increased from 0.2 for more exploration
  private state: { 
    roles: Record<string, ModelArm[]>;
    recentProviders: { provider: string; timestamp: number }[]; // Track recent provider usage
  } = { roles: {}, recentProviders: [] };
  private providerCooldownMs = 30000; // 30 seconds cooldown per provider

  constructor(filepath?: string) {
    this.filepath = filepath || path.resolve(process.cwd(), 'out', 'model_bandit_state.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filepath)) {
      try { 
        const loaded = JSON.parse(fs.readFileSync(this.filepath, 'utf8'));
        this.state = {
          roles: loaded.roles || {},
          recentProviders: loaded.recentProviders || []
        };
      } catch { 
        this.state = { roles: {}, recentProviders: [] }; 
      }
    } else {
      this.state = { roles: {}, recentProviders: [] };
      this.persist();
    }
  }

  private persist() { fs.writeFileSync(this.filepath, JSON.stringify(this.state, null, 2)); }

  ensureRoleArms(role: string, seedArms: Partial<ModelArm>[] = []) {
    if (!this.state.roles[role]) {
      this.state.roles[role] = seedArms.map((a, i) => ({
        id: a.id || `${role}-model-${i}`,
        modelName: a.modelName || `free-model-${String.fromCharCode(65 + i)}`,
        promptTemplate: a.promptTemplate,
        topK: a.topK || 5,
        wins: 0,
        plays: 0,
        meta: a.meta || {}
      }));
      this.persist();
    }
  }

  selectArm(role?: string, fallbackRole = 'default'): ModelArm {
    const arms = this.state.roles[role || ''] || this.state.roles[fallbackRole];
    if (!arms || arms.length === 0) {
      const all = Object.values(this.state.roles).flat();
      if (all.length === 0) {
        const def = { id: 'arm_freeA', modelName: 'free-model-A', promptTemplate: 'worker.tpl', topK: 5, wins: 0, plays: 0 };
        this.state.roles['default'] = [def];
        this.persist();
        return def;
      }
      return all[Math.floor(Math.random() * all.length)];
    }
    
    // Clean up old provider cooldowns (older than cooldown period)
    const now = Date.now();
    this.state.recentProviders = this.state.recentProviders.filter(
      p => now - p.timestamp < this.providerCooldownMs
    );
    
    // Get providers on cooldown
    const cooldownProviders = new Set(this.state.recentProviders.map(p => p.provider));
    
    // Filter arms by provider availability
    const availableArms = arms.filter(a => {
      const provider = a.meta?.provider || 'unknown';
      return !cooldownProviders.has(provider);
    });
    
    // If all providers are on cooldown, allow the oldest cooldown provider
    const armsToUse = availableArms.length > 0 ? availableArms : arms;
    
    // Force exploration more often (40% exploration)
    if (Math.random() < this.epsilon) {
      const selected = armsToUse[Math.floor(Math.random() * armsToUse.length)];
      this.recordProviderUsage(selected);
      return selected;
    }
    
    // Exploit: select best arm by win rate, but only from available providers
    const playedArms = armsToUse.filter(a => a.plays > 0);
    if (playedArms.length === 0) {
      const selected = armsToUse[Math.floor(Math.random() * armsToUse.length)];
      this.recordProviderUsage(selected);
      return selected;
    }
    
    let best = playedArms[0];
    let bestScore = best.wins / best.plays;
    for (const a of playedArms) {
      const sc = a.wins / a.plays;
      if (sc > bestScore) { best = a; bestScore = sc; }
    }
    
    this.recordProviderUsage(best);
    return best;
  }

  private recordProviderUsage(arm: ModelArm) {
    const provider = arm.meta?.provider || 'unknown';
    this.state.recentProviders.push({
      provider,
      timestamp: Date.now()
    });
    // Keep only last 10 provider usages to avoid memory bloat
    if (this.state.recentProviders.length > 10) {
      this.state.recentProviders = this.state.recentProviders.slice(-10);
    }
    this.persist();
  }

  updateArm(role: string | undefined, armId: string, reward: number) {
    const roleKey = role || 'default';
    let a = this.state.roles[roleKey]?.find(x => x.id === armId);
    if (!a) {
      for (const r of Object.keys(this.state.roles)) {
        const found = this.state.roles[r].find(x => x.id === armId);
        if (found) { a = found; break; }
      }
    }
    if (!a) {
      const stub: ModelArm = { id: armId, modelName: 'unknown', wins: 0, plays: 0 };
      this.state.roles[roleKey] = this.state.roles[roleKey] || [];
      this.state.roles[roleKey].push(stub);
      a = stub;
    }
    a.plays = (a.plays || 0) + 1;
    if ((reward || 0) >= 0.5) a.wins = (a.wins || 0) + 1;
    this.persist();
  }

  listArms(role?: string) { return role ? (this.state.roles[role] || []) : this.state.roles; }

  addArm(role: string, arm: Partial<ModelArm>) {
    this.state.roles[role] = this.state.roles[role] || [];
    const newArm: ModelArm = {
      id: arm.id || `${role}-model-${this.state.roles[role].length}`,
      modelName: arm.modelName,
      promptTemplate: arm.promptTemplate,
      topK: arm.topK || 5,
      wins: 0,
      plays: 0,
      meta: arm.meta || {}
    };
    this.state.roles[role].push(newArm);
    this.persist();
    return newArm;
  }
}
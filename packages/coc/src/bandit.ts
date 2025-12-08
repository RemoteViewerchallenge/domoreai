// Role-aware epsilon-greedy Bandit
// Arms are stored per role. Each arm can include modelName, promptTemplate, topK, nextRoleHints, etc.
// Persisted to out/bandit_state.json
import fs from 'fs';
import path from 'path';

export type Arm = {
  id: string;
  modelName?: string;
  promptTemplate?: string;
  topK?: number;
  nextRoleHints?: Array<{ role: string; weight?: number }>;
  wins: number;
  plays: number;
  meta?: any;
};

type RoleArms = {
  role: string;
  arms: Arm[];
};

export class Bandit {
  filepath: string;
  epsilon = 0.2; // exploration rate
  // structure: { roles: { [roleName]: Arm[] } }
  private state: { roles: Record<string, Arm[]> } = { roles: {} };

  constructor(filepath?: string) {
    this.filepath = filepath || path.resolve(process.cwd(), 'out', 'bandit_state.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filepath)) {
      try {
        const raw = fs.readFileSync(this.filepath, 'utf8');
        this.state = JSON.parse(raw);
      } catch (e) {
        // ignore and start fresh
        this.state = { roles: {} };
      }
    } else {
      this.state = { roles: {} };
      this.persist();
    }
  }

  private persist() {
    fs.writeFileSync(this.filepath, JSON.stringify(this.state, null, 2));
  }

  // Ensure a role has a set of default arms (call at startup or seed)
  ensureRoleArms(role: string, seedArms: Partial<Arm>[] = []) {
    if (!this.state.roles[role]) {
      this.state.roles[role] = seedArms.map((a, i) => ({
        id: a.id || `${role}-arm-${i}`,
        modelName: a.modelName || `free-model-${String.fromCharCode(65 + i)}`,
        promptTemplate: a.promptTemplate,
        topK: a.topK || 5,
        nextRoleHints: a.nextRoleHints || [],
        wins: 0,
        plays: 0,
        meta: a.meta || {}
      }));
      this.persist();
    }
  }

  // Return an arm for a role (or fallbackRole if none)
  /**
   * Select arm using UCB (Upper Confidence Bound) + rate limit awareness
   * 
   * Selection strategy:
   * 1. Epsilon-greedy exploration (random selection with probability epsilon)
   * 2. UCB exploitation with rate limit bonus:
   *    - Base score: wins/plays (success rate)
   *    - Exploration bonus: sqrt(2 * ln(total_plays) / arm_plays)
   *    - Rate limit bonus: usage_score / 100 (prioritize models with available quota)
   * 
   * This maximizes learning while intelligently rotating through free tier quotas
   */
  async selectArm(role?: string, fallbackRole = 'default'): Promise<Arm> {
    const arms = this.state.roles[role || ''] || this.state.roles[fallbackRole];
    if (!arms || arms.length === 0) {
      // fallback: pick across all roles (flatten)
      const all = Object.values(this.state.roles).flat();
      if (all.length === 0) {
        // seed a trivial default if nothing exists
        const defaultArm: Arm = { id: 'arm_freeA', modelName: 'free-model-A', wins: 0, plays: 0 };
        this.state.roles['default'] = [defaultArm];
        this.persist();
        return defaultArm;
      }
      // random from all
      return all[Math.floor(Math.random() * all.length)];
    }

    // Exploration with epsilon-greedy
    if (Math.random() < this.epsilon) {
      return arms[Math.floor(Math.random() * arms.length)];
    }

    // Exploitation with UCB + rate limit awareness
    // Import rate limit tracker (lazy to avoid circular deps)
    const { calculateUsageScore } = await import('./rate-limit-tracker');
    
    const totalPlays = arms.reduce((sum, a) => sum + a.plays, 0);
    const lnTotal = Math.log(Math.max(totalPlays, 1));
    
    let best = arms[0];
    let bestScore = -Infinity;
    
    for (const arm of arms) {
      // Base exploitation score (success rate)
      const winRate = arm.plays === 0 ? 0 : arm.wins / arm.plays;
      
      // Exploration bonus (UCB1 formula)
      const explorationBonus = arm.plays === 0 
        ? 1000 // High bonus for unexplored arms
        : Math.sqrt((2 * lnTotal) / arm.plays);
      
      // Rate limit bonus (0-1, based on available quota)
      let rateLimitBonus = 0;
      if (arm.meta?.provider && arm.modelName) {
        const usageScore = await calculateUsageScore(arm.meta.provider, arm.modelName);
        rateLimitBonus = usageScore / 100; // Normalize to 0-1
      }
      
      // Combined score: balance learning, performance, and quota availability
      const score = winRate + explorationBonus + rateLimitBonus;
      
      if (score > bestScore) {
        best = arm;
        bestScore = score;
      }
    }
    
    return best;
  }

  // Update an arm by role and id
  updateArm(role: string | undefined, armId: string, reward: number) {
    const roleKey = role || 'default';
    const arms = this.state.roles[roleKey];
    let a: Arm | undefined = undefined;
    if (arms) a = arms.find(x => x.id === armId);
    if (!a) {
      // Try to find any arm by id globally
      for (const r of Object.keys(this.state.roles)) {
        const found = this.state.roles[r].find(x => x.id === armId);
        if (found) { a = found; break; }
      }
    }
    // if still not found, create a stub arm in default
    if (!a) {
      const stub: Arm = { id: armId, modelName: 'unknown', wins: 0, plays: 0 };
      this.state.roles[roleKey] = this.state.roles[roleKey] || [];
      this.state.roles[roleKey].push(stub);
      a = stub;
    }
    a.plays = (a.plays || 0) + 1;
    if ((reward || 0) >= 0.5) a.wins = (a.wins || 0) + 1;
    this.persist();
  }

  // Optional helpers for debugging / UI
  listArms(role?: string) {
    if (role) return this.state.roles[role] || [];
    return this.state.roles;
  }

  // Add arm to a role
  addArm(role: string, arm: Partial<Arm>) {
    this.state.roles[role] = this.state.roles[role] || [];
    const newArm: Arm = {
      id: arm.id || `${role}-arm-${this.state.roles[role].length}`,
      modelName: arm.modelName,
      promptTemplate: arm.promptTemplate,
      topK: arm.topK || 5,
      nextRoleHints: arm.nextRoleHints || [],
      wins: 0,
      plays: 0,
      meta: arm.meta || {}
    };
    this.state.roles[role].push(newArm);
    this.persist();
    return newArm;
  }
}
// RoleBandit v2 - role-aware contextual epsilon-greedy bandit
// - Arms stored per role (uses your real roles from agents/roles.json when seeding).
// - Optional context-based preference boosting (simple similarity function).
// - Persists state to out/role_bandit_v2.json
import fs from 'fs';
import path from 'path';

export type RoleArmV2 = {
  id: string;
  nextRole: string;
  weight?: number;
  wins: number;
  plays: number;
  meta?: Record<string, any>; // optional arm features (e.g., preferred task_size, priority)
};

type StateV2 = {
  roles: Record<string, RoleArmV2[]>;
  epsilon: number;
};

const DEFAULT_FILE = path.resolve(process.cwd(), 'out', 'role_bandit_v2.json');

export class RoleBanditV2 {
  filepath: string;
  state: StateV2;

  constructor(filepath?: string, epsilon = 0.2) {
    this.filepath = filepath || DEFAULT_FILE;
    this.state = { roles: {}, epsilon };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filepath)) {
        const raw = fs.readFileSync(this.filepath, 'utf8');
        const j = JSON.parse(raw);
        this.state = { ...this.state, ...(j || {}) };
      } else {
        this.persist();
      }
    } catch (e) {
      // if corrupted, start fresh but don't throw
      this.state = { roles: {}, epsilon: this.state.epsilon };
      this.persist();
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(this.filepath), { recursive: true });
      fs.writeFileSync(this.filepath, JSON.stringify(this.state, null, 2));
    } catch (e) {
      // best-effort
    }
  }

  // Seed arms for a role using provided seedArms array
  ensureRoleArms(role: string, seedArms: Partial<RoleArmV2>[] = []) {
    if (!this.state.roles[role]) {
      this.state.roles[role] = seedArms.map((a, i) => ({
        id: a.id || `${role}-route-${i}`,
        nextRole: a.nextRole || `role-${i}`,
        weight: a.weight || 1,
        wins: 0,
        plays: 0,
        meta: a.meta || {}
      }));
      this.persist();
    }
  }

  // Seed using agents/roles.json file: provide either a roles array or path to file
  seedFromRolesFile(rolesFilePath?: string, defaultRouteTargets: string[] = ['department-lead', 'test-writer']) {
    const p = rolesFilePath || path.resolve(process.cwd(), 'agents', 'roles.json');
    let roles: string[] = [];
    if (fs.existsSync(p)) {
      try {
        const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(obj.roles)) roles = obj.roles;
      } catch {}
    }
    if (!roles.length) roles = defaultRouteTargets.concat(); // fallback minimal list

    for (const r of roles) {
      // if already seeded, skip
      if (this.state.roles[r] && this.state.roles[r].length > 0) continue;

      const targets = roles.filter(x => x !== r);
      this.state.roles[r] = [
        { id: `${r}-route-0`, nextRole: targets[0] || defaultRouteTargets[0], weight: 1, wins: 0, plays: 0, meta: {} },
        { id: `${r}-route-1`, nextRole: targets[1] || defaultRouteTargets[1] || targets[0] || defaultRouteTargets[0], weight: 1, wins: 0, plays: 0, meta: {} }
      ];
    }
    this.persist();
  }

  // Simple similarity between arm.meta and context: returns 0..1
  private contextSimilarity(armMeta: Record<string, any> | undefined, ctx: Record<string, any> | undefined) {
    if (!armMeta || !ctx) return 0;
    let score = 0;
    let total = 0;
    for (const k of Object.keys(armMeta)) {
      total++;
      try {
        const av = armMeta[k];
        const cv = ctx[k];
        if (av === undefined || cv === undefined) continue;
        // exact match boosts score; numeric closeness also counts
        if (typeof av === 'number' && typeof cv === 'number') {
          const diff = Math.abs(av - cv);
          // normalize: closer => closer to 1 (use simple logistic)
          const s = Math.max(0, 1 - Math.min(diff / (Math.max(av, cv, 1)), 1));
          score += s;
        } else if (av === cv) {
          score += 1;
        } else if (Array.isArray(av) && Array.isArray(cv)) {
          const inter = av.filter((x: any) => cv.includes(x)).length;
          score += inter / Math.max(av.length, 1);
        } else {
          // no match
        }
      } catch (e) {}
    }
    return total ? score / total : 0;
  }

  // select an arm for a role; fallbackRole used if role not found
  selectArm(role?: string, context?: Record<string, any>, fallbackRole = 'default'): RoleArmV2 {
    const roleKey = role || fallbackRole;
    const arms = this.state.roles[roleKey] || this.state.roles[fallbackRole];
    if (!arms || arms.length === 0) {
      // flatten fallback across all roles
      const all = Object.values(this.state.roles).flat();
      if (all.length === 0) {
        const arm = { id: 'route_default', nextRole: 'department-lead', weight: 1, wins: 0, plays: 0, meta: {} };
        this.state.roles['default'] = [arm];
        this.persist();
        return arm;
      }
      return all[Math.floor(Math.random() * all.length)];
    }

    // exploration
    if (Math.random() < (this.state.epsilon ?? 0.2)) {
      return arms[Math.floor(Math.random() * arms.length)];
    }

    // exploitation: compute weighted score = avgReward * (1 + simWeight * similarity)
    let best = arms[0];
    let bestScore = -Infinity;
    for (const a of arms) {
      const avg = a.plays > 0 ? (a.wins / a.plays) : 0;
      const sim = this.contextSimilarity(a.meta, context);
      // tune sim weight: give moderate weight to similarity
      const simWeight = 0.5;
      const sc = avg * (1 + simWeight * sim);
      if (sc > bestScore) {
        bestScore = sc;
        best = a;
      }
    }
    return best;
  }

  // update arm's stats
  updateArm(role: string | undefined, armId: string, reward: number) {
    const roleKey = role || 'default';
    let arm = this.state.roles[roleKey]?.find(x => x.id === armId);
    if (!arm) {
      // search globally
      for (const rk of Object.keys(this.state.roles)) {
        const found = this.state.roles[rk].find(x => x.id === armId);
        if (found) { arm = found; break; }
      }
    }
    if (!arm) {
      // create stub
      arm = { id: armId, nextRole: 'unknown', weight: 1, wins: 0, plays: 0, meta: {} };
      this.state.roles[roleKey] = this.state.roles[roleKey] || [];
      this.state.roles[roleKey].push(arm);
    }
    arm.plays = (arm.plays || 0) + 1;
    if ((reward || 0) >= 0.5) arm.wins = (arm.wins || 0) + 1;
    this.persist();
  }

  listArms(role?: string) { return role ? (this.state.roles[role] || []) : this.state.roles; }

  addArm(role: string, arm: Partial<RoleArmV2>) {
    this.state.roles[role] = this.state.roles[role] || [];
    const newArm: RoleArmV2 = {
      id: arm.id || `${role}-route-${this.state.roles[role].length}`,
      nextRole: arm.nextRole || 'department-lead',
      weight: arm.weight || 1,
      wins: 0,
      plays: 0,
      meta: arm.meta || {}
    };
    this.state.roles[role].push(newArm);
    this.persist();
    return newArm;
  }
}
import fs from 'fs';

type Arm = { id: string; modelName?: string; promptTemplate?: string; topK?: number; wins: number; plays: number; meta?: any };

export class Bandit {
  arms: Arm[] = [];
  filepath: string;
  epsilon = 0.2; // exploration rate

  constructor(filepath: string) {
    this.filepath = filepath;
    if (fs.existsSync(filepath)) {
      try { this.arms = JSON.parse(fs.readFileSync(filepath,'utf8')); } catch {}
    }
    if (this.arms.length === 0) {
      // default arms - you should seed arms per role in production
      this.arms = [
        { id: 'arm_freeA', modelName: 'free-model-A', wins: 0, plays: 0 },
        { id: 'arm_freeB', modelName: 'free-model-B', wins: 0, plays: 0 },
      ];
      this.persist();
    }
  }

  persist(){ fs.writeFileSync(this.filepath, JSON.stringify(this.arms,null,2)); }

  // return chosen arm object; you can pass role to select role-specific arms
  selectArm(role?: string) {
    // maybe filter by role/meta in future
    if (Math.random() < this.epsilon) {
      const idx = Math.floor(Math.random() * this.arms.length);
      return this.arms[idx];
    }
    // exploitation: pick arm with highest avg reward (wins/plays)
    let best = this.arms[0];
    let bestScore = (best.plays === 0) ? 0 : (best.wins / best.plays);
    for (const a of this.arms) {
      const sc = (a.plays === 0) ? 0 : (a.wins / a.plays);
      if (sc > bestScore) { best = a; bestScore = sc; }
    }
    return best;
  }

  updateArm(armId: string, reward: number /* 0..1 */) {
    const a = this.arms.find(x => x.id === armId) || this.arms[0];
    a.plays = (a.plays || 0) + 1;
    // treat reward >= 0.5 as a "win" for simplicity
    if ((reward || 0) >= 0.5) a.wins = (a.wins || 0) + 1;
    this.persist();
  }
}
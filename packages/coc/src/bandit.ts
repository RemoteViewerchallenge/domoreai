import * as fs from 'fs';
import * as path from 'path';

/**
 * Arm (model) in the multi-armed bandit
 */
export interface Arm {
  id: string;
  wins: number;
  trials: number;
}

/**
 * Multi-armed bandit learner for model selection
 * Uses epsilon-greedy strategy with decay
 */
export class Bandit {
  private arms: Map<string, Arm>;
  private epsilon: number;
  private epsilonDecay: number;
  private statePath: string;

  constructor(armIds: string[], statePath: string, epsilon = 0.1, epsilonDecay = 0.99) {
    this.arms = new Map();
    this.epsilon = epsilon;
    this.epsilonDecay = epsilonDecay;
    this.statePath = statePath;

    // Initialize arms
    for (const id of armIds) {
      this.arms.set(id, { id, wins: 0, trials: 0 });
    }

    // Load state if it exists
    this.loadState();
  }

  /**
   * Select an arm using epsilon-greedy strategy
   */
  selectArm(): string {
    // Exploration: random selection
    if (Math.random() < this.epsilon) {
      const arms = Array.from(this.arms.keys());
      return arms[Math.floor(Math.random() * arms.length)];
    }

    // Exploitation: select arm with highest win rate
    let bestArm: string | null = null;
    let bestRate = -1;

    for (const [id, arm] of this.arms) {
      const rate = arm.trials === 0 ? 0 : arm.wins / arm.trials;
      if (rate > bestRate || (rate === bestRate && arm.trials === 0)) {
        bestRate = rate;
        bestArm = id;
      }
    }

    return bestArm || Array.from(this.arms.keys())[0];
  }

  /**
   * Update arm statistics after a trial
   */
  update(armId: string, reward: number): void {
    const arm = this.arms.get(armId);
    if (!arm) {
      throw new Error(`Unknown arm: ${armId}`);
    }

    arm.trials++;
    if (reward > 0) {
      arm.wins++;
    }

    // Decay epsilon
    this.epsilon *= this.epsilonDecay;

    // Persist state
    this.saveState();
  }

  /**
   * Get current statistics for all arms
   */
  getStats(): Record<string, { winRate: number; trials: number }> {
    const stats: Record<string, { winRate: number; trials: number }> = {};
    for (const [id, arm] of this.arms) {
      stats[id] = {
        winRate: arm.trials === 0 ? 0 : arm.wins / arm.trials,
        trials: arm.trials,
      };
    }
    return stats;
  }

  /**
   * Load bandit state from file
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
        if (data.arms) {
          for (const arm of data.arms) {
            if (this.arms.has(arm.id)) {
              this.arms.set(arm.id, arm);
            }
          }
        }
        if (typeof data.epsilon === 'number') {
          this.epsilon = data.epsilon;
        }
      }
    } catch (error) {
      console.warn('Failed to load bandit state:', error);
    }
  }

  /**
   * Save bandit state to file
   */
  private saveState(): void {
    try {
      const data = {
        arms: Array.from(this.arms.values()),
        epsilon: this.epsilon,
        lastUpdated: new Date().toISOString(),
      };

      // Ensure directory exists
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save bandit state:', error);
    }
  }
}

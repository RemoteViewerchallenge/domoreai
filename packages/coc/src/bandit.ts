/**
 * Bandit Learner Module
 * 
 * Implements epsilon-greedy multi-armed bandit for model selection.
 * Persists state to out/bandit_state.json for learning across runs.
 * Seeded for deterministic behavior in tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from './config.js';

export interface BanditArm {
  name: string;
  pulls: number;
  totalReward: number;
  averageReward: number;
}

export interface BanditState {
  epsilon: number;
  seed: number;
  arms: Record<string, BanditArm>;
}

/**
 * Epsilon-greedy bandit learner
 */
export class Bandit {
  private epsilon: number;
  private arms: Map<string, BanditArm>;
  private rng: () => number;
  
  constructor(epsilon: number = 0.1, seed?: number) {
    this.epsilon = epsilon;
    this.arms = new Map();
    
    // Seeded RNG for deterministic behavior
    const useSeed = seed ?? config.mockSeed;
    let state = useSeed;
    this.rng = () => {
      // Simple LCG (Linear Congruential Generator)
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  /**
   * Register an arm (model) with the bandit
   */
  registerArm(name: string): void {
    if (!this.arms.has(name)) {
      this.arms.set(name, {
        name,
        pulls: 0,
        totalReward: 0,
        averageReward: 0,
      });
    }
  }

  /**
   * Select an arm using epsilon-greedy strategy
   * @returns Selected arm name
   */
  selectArm(): string {
    if (this.arms.size === 0) {
      throw new Error('No arms registered with bandit');
    }

    // Explore: random selection
    if (this.rng() < this.epsilon) {
      const armNames = Array.from(this.arms.keys());
      const randomIndex = Math.floor(this.rng() * armNames.length);
      return armNames[randomIndex];
    }

    // Exploit: select best arm
    let bestArm: string | null = null;
    let bestReward = -Infinity;

    for (const [name, arm] of this.arms) {
      // Handle arms that haven't been pulled yet
      const reward = arm.pulls === 0 ? Infinity : arm.averageReward;
      if (reward > bestReward) {
        bestReward = reward;
        bestArm = name;
      }
    }

    return bestArm!;
  }

  /**
   * Update arm statistics with a reward
   * @param armName - Name of the arm that was pulled
   * @param reward - Reward received (0-1 range typically)
   */
  update(armName: string, reward: number): void {
    const arm = this.arms.get(armName);
    if (!arm) {
      throw new Error(`Unknown arm: ${armName}`);
    }

    arm.pulls += 1;
    arm.totalReward += reward;
    arm.averageReward = arm.totalReward / arm.pulls;
  }

  /**
   * Get current state of all arms
   */
  getState(): BanditState {
    const armsObj: Record<string, BanditArm> = {};
    for (const [name, arm] of this.arms) {
      armsObj[name] = { ...arm };
    }

    return {
      epsilon: this.epsilon,
      seed: config.mockSeed,
      arms: armsObj,
    };
  }

  /**
   * Load state from previous run
   */
  static loadState(statePath: string): Bandit {
    try {
      if (!fs.existsSync(statePath)) {
        return new Bandit();
      }

      const data = fs.readFileSync(statePath, 'utf-8');
      const state: BanditState = JSON.parse(data);
      
      const bandit = new Bandit(state.epsilon, state.seed);
      for (const [name, arm] of Object.entries(state.arms)) {
        bandit.arms.set(name, { ...arm });
      }

      return bandit;
    } catch (error) {
      console.warn(`Failed to load bandit state from ${statePath}:`, error);
      return new Bandit();
    }
  }

  /**
   * Save current state to disk
   */
  saveState(statePath: string): void {
    try {
      const dir = path.dirname(statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const state = this.getState();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save bandit state to ${statePath}:`, error);
    }
  }
}

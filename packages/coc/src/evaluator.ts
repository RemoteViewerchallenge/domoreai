import { config } from './config';
// simple seeded random for deterministic mock behavior
function seededRandom(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return () => { h += h << 13; h ^= h >>> 7; return (h >>> 0) / 4294967295; };
}

export class Evaluator {
  rng = seededRandom(config.MOCK_SEED);

  async evaluate(task: any, response: any) {
    // inject deterministic failure if MOCK_INJECT_FAILURE_RATE > random
    const failRate = config.MOCK_INJECT_FAILURE_RATE || 0;
    const r = this.rng();
    const hasText = typeof response?.text === 'string' && response.text.length > 0;
    const score = hasText && r > failRate ? 1 : 0;
    return { score, passed: score >= 0.5, details: score ? [] : ['mock-failure'] };
  }
}
/**
 * COC Configuration Module
 * 
 * Reads environment variables and provides configuration for the orchestrator.
 * Supports two modes:
 * - mock: Uses deterministic mock implementations (default, safe for local dev)
 * - real: Attempts to load production modules (requires prod/ directory)
 */

import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find repository root by looking for pnpm-workspace.yaml
 */
function findRepoRoot(): string {
  let currentDir = process.cwd();
  
  // Look for pnpm-workspace.yaml to identify repo root
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback to current directory if not found
  return process.cwd();
}

const repoRoot = findRepoRoot();

export interface CocConfig {
  mode: 'mock' | 'real';
  isMock: boolean;
  isReal: boolean;
  traceDir: string;
  banditPath: string;
  mockSeed: number;
  mockInjectFailureRate: number;
  mockLatencyMs: number;
  repoRoot: string;
}

// Parse COC_MODE environment variable
const COC_MODE = (process.env.COC_MODE || 'mock').toLowerCase();
if (COC_MODE !== 'mock' && COC_MODE !== 'real') {
  throw new Error(`Invalid COC_MODE: ${COC_MODE}. Must be 'mock' or 'real'.`);
}

// Build configuration object
const config: CocConfig = {
  mode: COC_MODE as 'mock' | 'real',
  isMock: COC_MODE === 'mock',
  isReal: COC_MODE === 'real',
  repoRoot,
  
  // Output paths - use repo root, not cwd
  traceDir: process.env.TRACE_DIR || path.join(repoRoot, 'out', 'traces'),
  banditPath: process.env.BANDIT_PATH || path.join(repoRoot, 'out', 'bandit_state.json'),
  
  // Mock configuration knobs
  mockSeed: parseInt(process.env.MOCK_SEED || '42', 10),
  mockInjectFailureRate: parseFloat(process.env.MOCK_INJECT_FAILURE_RATE || '0.0'),
  mockLatencyMs: parseInt(process.env.MOCK_LATENCY_MS || '0', 10),
};

// Validate mock configuration
if (config.mockInjectFailureRate < 0 || config.mockInjectFailureRate > 1) {
  throw new Error(`MOCK_INJECT_FAILURE_RATE must be between 0 and 1, got ${config.mockInjectFailureRate}`);
}

if (config.mockLatencyMs < 0) {
  throw new Error(`MOCK_LATENCY_MS must be >= 0, got ${config.mockLatencyMs}`);
}

export { config };

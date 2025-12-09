import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration mode for COC orchestrator
 * - "mock": Use mocked components (default, safe for local development)
 * - "real": Use real integrations (requires prod modules in src/prod/)
 */
export type CocMode = 'mock' | 'real';

/**
 * COC configuration object
 */
export interface CocConfig {
  mode: CocMode;
  traceDir: string;
  banditStatePath: string;
}

/**
 * Get the current COC mode from environment variable
 * Defaults to "mock" if COC_MODE is not set or invalid
 */
function getCocMode(): CocMode {
  const mode = process.env.COC_MODE?.toLowerCase();
  if (mode === 'real' || mode === 'mock') {
    return mode;
  }
  return 'mock';
}

/**
 * Default configuration
 */
export const config: CocConfig = {
  mode: getCocMode(),
  traceDir: path.join(process.cwd(), 'out', 'traces'),
  banditStatePath: path.join(process.cwd(), 'out', 'bandit_state.json'),
};

/**
 * Check if COC is running in mock mode
 */
export function isMock(): boolean {
  return config.mode === 'mock';
}

/**
 * Check if COC is running in real mode
 */
export function isReal(): boolean {
  return config.mode === 'real';
}

/**
 * Get the trace directory path
 */
export function getTraceDir(): string {
  return config.traceDir;
}

/**
 * Get the bandit state file path
 */
export function getBanditStatePath(): string {
  return config.banditStatePath;
}

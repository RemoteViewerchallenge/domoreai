import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env.local first (highest priority), then .env
const envLocalPath = path.resolve(process.cwd(), '..', '..', '.env.local');
const envPath = path.resolve(process.cwd(), '..', '..', '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('[Config] Loading .env.local');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('[Config] Loading .env');
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const MODE = (process.env.COC_MODE || 'mock').toLowerCase();

export const TRACE_DIR = path.resolve(process.cwd(), 'out', 'traces');
export const BANDIT_PATH = path.resolve(process.cwd(), 'out', 'bandit_state.json');

export function isMock() { return MODE === 'mock'; }
export function isReal() { return MODE === 'real'; }

export const config = {
  mode: MODE,
  TRACE_DIR,
  BANDIT_PATH,
  MOCK_SEED: process.env.MOCK_SEED || '42',
  MOCK_INJECT_FAILURE_RATE: Number(process.env.MOCK_INJECT_FAILURE_RATE || 0),
  MOCK_LATENCY_MS: Number(process.env.MOCK_LATENCY_MS || 0),
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://0.0.0.0:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'granite4:micro',
};
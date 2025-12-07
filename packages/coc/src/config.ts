import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// load .env if present (safe local behavior)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
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
  MOCK_LATENCY_MS: Number(process.env.MOCK_LATENCY_MS || 0)
};
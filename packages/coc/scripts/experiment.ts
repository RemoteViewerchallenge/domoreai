/**
 * Run N episodes of the smoke-run to let bandits learn and print a CSV summary.
 * Usage:
 *   ts-node packages/coc/scripts/experiment.ts --runs 50
 *
 * This script will:
 * - run the orchestrator smoke-run (in mock or real mode depending on COC_MODE)
 * - after all runs print a summary of plays/wins per role-arm for model and role bandits
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runSmoke() {
  // call the package start script
  const r = spawnSync('pnpm', ['--filter', '@domoreai/coc', 'start'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    throw new Error('Smoke-run failed (exit ' + r.status + ')');
  }
}

function readJsonMaybe(p: string) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function summarize() {
  const modelPath = path.resolve(process.cwd(), 'out', 'model_bandit_state.json');
  const rolePath = path.resolve(process.cwd(), 'out', 'role_bandit_state.json');
  const modelState = readJsonMaybe(modelPath) || { roles: {} };
  const roleState = readJsonMaybe(rolePath) || { roles: {} };

  console.log('model_role,armId,modelName,plays,wins,winrate');
  for (const role of Object.keys(modelState.roles || {})) {
    for (const arm of modelState.roles[role]) {
      const wr = arm.plays ? (arm.wins / arm.plays).toFixed(3) : '0.000';
      console.log(`${role},${arm.id},${arm.modelName || ''},${arm.plays || 0},${arm.wins || 0},${wr}`);
    }
  }
  console.log('\nrole_role,armId,nextRole,plays,wins,winrate');
  for (const role of Object.keys(roleState.roles || {})) {
    for (const arm of roleState.roles[role]) {
      const wr = arm.plays ? (arm.wins / arm.plays).toFixed(3) : '0.000';
      console.log(`${role},${arm.id},${arm.nextRole || ''},${arm.plays || 0},${arm.wins || 0},${wr}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runsArgIndex = args.indexOf('--runs');
  const runs = runsArgIndex >= 0 ? Number(args[runsArgIndex + 1] || 10) : 10;
  console.log(`Running ${runs} smoke-runs (COC_MODE=${process.env.COC_MODE || 'mock'})...`);
  for (let i = 0; i < runs; i++) {
    try {
      runSmoke();
    } catch (e) {
      console.error('Smoke-run error on iteration', i + 1, e);
      break;
    }
  }
  summarize();
}

main().catch((e) => {
  console.error('Experiment failed:', e);
  process.exit(1);
});
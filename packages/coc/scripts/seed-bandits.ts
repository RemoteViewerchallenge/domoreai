/**
 * Seed script for modelBandit and roleBandit.
 * Usage from repo root: node --loader ts-node/esm packages/coc/src/scripts/seed-bandits.ts
 * Or compile and run via ts-node.
 */
import fs from 'fs';
import path from 'path';
import { ModelBandit } from '../model-bandit';
import { RoleBandit } from '../role-bandit';

const rolesPath = path.resolve(process.cwd(), 'agents', 'roles.json');
let roles: string[] = ['worker', 'department-lead', 'test-writer', 'librarian', 'judge'];
if (fs.existsSync(rolesPath)) {
  try {
    const obj = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    if (Array.isArray(obj.roles)) roles = obj.roles;
  } catch (e) { /* ignore */ }
}

const modelBandit = new ModelBandit(path.resolve(process.cwd(), 'out', 'model_bandit_state.json'));
const roleBandit = new RoleBandit(path.resolve(process.cwd(), 'out', 'role_bandit_state.json'));

// Minimal seed: two model arms, two route arms per role
for (const r of roles) {
  modelBandit.ensureRoleArms(r, [
    { modelName: process.env.WORKER_MODEL || 'free-model-A', promptTemplate: 'worker.tpl', topK: 5 },
    { modelName: process.env.WORKER_MODEL_B || 'free-model-B', promptTemplate: 'worker.tpl', topK: 3 }
  ]);
  roleBandit.ensureRoleArms(r, [
    { nextRole: 'test-writer' },
    { nextRole: 'department-lead' }
  ]);
}

console.log('Seeded bandits for roles:', roles);
console.log('Model bandit file:', path.resolve(process.cwd(), 'out', 'model_bandit_state.json'));
console.log('Role bandit file:', path.resolve(process.cwd(), 'out', 'role_bandit_state.json'));
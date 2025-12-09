#!/usr/bin/env tsx
// Test runner for COC scenarios with tool call visibility
import { runDirective } from './coc';
import fs from 'fs';
import path from 'path';

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error('Usage: tsx test-runner.ts <scenario.json>');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(scenarioPath) 
    ? scenarioPath 
    : path.join(process.cwd(), scenarioPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Scenario file not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`\n🚀 Running scenario: ${fullPath}\n`);
  const scenario = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  
  try {
    await runDirective(scenario, { scenarioPath: fullPath });
    console.log('\n✅ Scenario completed successfully!');
  } catch (error) {
    console.error('\n❌ Scenario failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

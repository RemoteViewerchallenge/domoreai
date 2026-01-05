import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

// 1. Define Paths
const API_ROUTER_DIR = path.join(process.cwd(), 'src/routers');
const UI_SRC_DIR = path.resolve(process.cwd(), '../../apps/ui/src');

async function findOrphans() {
  console.log('🔍 Starting Gap Analysis...');

  // 2. Scan API for all defined procedures
  // Regex to find "procName: publicProcedure" or "procName: protectedProcedure"
  const definedProcedures = new Set<string>();
  // Note: this might fail if glob.sync is not available on named export 'glob'
  // We will check and fix if needed after first run attempt.
  const routerFiles = globSync(`${API_ROUTER_DIR}/**/*.ts`);
  
  for (const file of routerFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const routerName = path.basename(file, '.router.ts'); // e.g. "project"
    
    // Simple regex to catch procedure definitions
    // Matches: "list: publicProcedure"
    const regex = /([a-zA-Z0-9_]+)\s*:\s*(publicProcedure|protectedProcedure)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      definedProcedures.add(`${routerName}.${match[1]}`);
    }
  }

  console.log(`✅ Found ${definedProcedures.size} defined API procedures.`);

  // 3. Scan UI for all usages
  // Regex to find "trpc.router.proc.useQuery" or "trpc.router.proc.useMutation"
  const usedProcedures = new Set<string>();
  const uiFiles = globSync(`${UI_SRC_DIR}/**/*.tsx`);

  for (const file of uiFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    // Matches: trpc.project.list.useQuery
    const regex = /trpc\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\./g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      usedProcedures.add(`${match[1]}.${match[2]}`);
    }
  }

  console.log(`✅ Found ${usedProcedures.size} procedures used in UI.`);

  // 4. Calculate the Difference (Orphans)
  const orphans = [...definedProcedures].filter(p => !usedProcedures.has(p));

  if (orphans.length > 0) {
    console.log('\n⚠️  HEADLESS API ENDPOINTS (Defined but not used in UI):');
    console.log('----------------------------------------------------');
    orphans.forEach(o => console.log(`- ${o}`));
    console.log('----------------------------------------------------');
    console.log('💡 Recommendation: These are perfect candidates to expose solely to AI Agents.');
  } else {
    console.log('\n🎉 No orphans found! Your UI covers 100% of your API.');
  }
}

findOrphans();

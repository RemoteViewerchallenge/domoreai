#!/usr/bin/env tsx
/**
 * Ghost Records Seeder
 * 
 * This script reads model JSON files from latest_models/ and safely upserts them
 * into the database using the Ghost Records pattern:
 * 
 * - Updates lastSeenAt for existing models (proves they're still alive)
 * - Preserves source if model was discovered via INFERENCE or MANUAL
 * - Creates new models with source=INDEX
 * - Never deletes existing data
 * 
 * Usage:
 *   pnpm run seed:models
 *   pnpm run seed:models --dir ./custom_models_dir
 */

import { UnifiedIngestionService } from '../services/UnifiedIngestionService.js';
import { ModelDiscoveryService } from '../services/ModelDiscoveryService.js';
import path from 'path';

async function main() {
  console.log('🌱 [GhostRecordsSeeder] Starting model ingestion...\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');
  const customDir = dirIndex !== -1 ? args[dirIndex + 1] : undefined;

  const modelsDir = customDir || path.join(process.cwd(), 'latest_models');

  console.log(`📂 Reading from: ${modelsDir}\n`);

  try {
    // Run the unified ingestion
    await UnifiedIngestionService.ingestAllModels(modelsDir);

    // Get discovery stats
    console.log('\n📊 Model Discovery Statistics:');
    const stats = await ModelDiscoveryService.getDiscoveryStats();
    console.log(`   Total Models: ${stats.total}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Inactive: ${stats.inactive}`);
    console.log('\n   By Source:');
    Object.entries(stats.bySource).forEach(([source, count]) => {
      console.log(`     ${source}: ${String(count)}`);
    });

    // Optional: Mark stale models as inactive
    // Uncomment this if you want to auto-mark models not seen in 24h
    // const staleCount = await ModelDiscoveryService.markStaleModelsInactive(undefined, 24);
    // if (staleCount > 0) {
    //   console.log(`\n⚠️  Marked ${staleCount} models as inactive (not seen in 24h)`);
    // }

    console.log('\n✅ Seeding complete!\n');
  } catch (error) {
    console.error('❌ [GhostRecordsSeeder] Fatal error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

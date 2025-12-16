#!/usr/bin/env ts-node

/**
 * Robust Model Ingestion Script
 * 
 * Runs the UnifiedIngestionService to ingest model data from the latest_models directory.
 * This script handles models from multiple providers (Google, OpenRouter, Groq, Ollama, Mistral)
 * and normalizes them into a unified format while preserving the raw provider data.
 * 
 * Usage:
 *   npx ts-node src/scripts/ingest_models_robust.ts [models_directory]
 * 
 * If no directory is specified, defaults to: <project_root>/latest_models
 */

import { UnifiedIngestionService } from '../services/UnifiedIngestionService.js';
import path from 'path';

async function main() {
  console.log('🚀 Starting Robust Model Ingestion...\n');
  
  // Get models directory from command line argument or use default
  const modelsDir = process.argv[2] 
    ? path.resolve(process.argv[2])
    : path.join(process.cwd(), 'latest_models');
  
  console.log(`📂 Target directory: ${modelsDir}\n`);
  
  try {
    await UnifiedIngestionService.ingestAllModels(modelsDir);
    console.log('\n✅ Ingestion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();

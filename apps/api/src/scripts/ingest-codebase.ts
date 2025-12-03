
import { ingestionAgent } from '../services/IngestionAgent.js';
import path from 'path';

async function main() {
  const rootDir = process.argv[2] || '/home/guy/mono/apps/api'; // Default to api app
  console.log(`Starting ingestion for directory: ${rootDir}`);
  
  try {
    await ingestionAgent.ingestRepository(rootDir);
    console.log('Ingestion complete.');
  } catch (error) {
    console.error('Ingestion failed:', error);
  }
}

main();

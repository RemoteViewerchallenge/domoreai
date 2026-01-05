import { db } from './src/db.js';
import { modelCapabilities, modelRegistry } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const caps = await db.select({
      name: modelRegistry.modelName,
      context: modelCapabilities.contextWindow,
      maxOutput: modelCapabilities.maxOutput,
      confidence: modelCapabilities.confidence,
      source: modelCapabilities.source,
  })
  .from(modelCapabilities)
  .leftJoin(modelRegistry, eq(modelCapabilities.modelId, modelRegistry.id))
  .limit(20);

  console.table(caps);
  process.exit(0);
}

main().catch(console.error);

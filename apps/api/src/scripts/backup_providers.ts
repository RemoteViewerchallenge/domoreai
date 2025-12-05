import { db, shutdownDb } from '../db.js';
import { providerConfigs } from '../db/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = path.join(__dirname, 'src/db/providers_backup.json');

async function main() {
  console.log('Backing up ProviderConfig to:', BACKUP_FILE);
  
  const providers = await db.select().from(providerConfigs);
  
  if (providers.length === 0) {
    console.log('No providers found to backup.');
    return;
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(providers, null, 2));
  console.log(`Successfully backed up ${providers.length} providers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await shutdownDb();
  });

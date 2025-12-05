import { v4 as uuidv4 } from 'uuid';
import { db, shutdownDb } from '../db.js';
import { providerConfigs } from './schema.js';
import { encrypt } from '../utils/encryption.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (msg: string) => {
  console.log(msg);
};

interface BackupProvider {
  id: string;
  label: string;
  type: string;
  apiKey: string;
  baseURL: string | null;
  isEnabled: boolean;
  requestsPerMinute: number | null;
}

log('Starting seed script...');

// Load environment variables from .env.local
// We go up: src/db -> src -> api -> apps -> root (4 levels)
const envPath = path.resolve(__dirname, '../../../../.env.local');
log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

async function main() {
  log('Seeding database...');

  // 1. Try to load from backup file
  const backupFile = path.join(__dirname, 'providers_backup.json');
  if (fs.existsSync(backupFile)) {
    log(`Found backup file: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8')) as BackupProvider[];
    
    for (const p of backupData) {
      log(`Restoring provider from backup: ${p.label}`);
      await db.insert(providerConfigs).values({
          id: p.id,
          label: p.label,
          type: p.type,
          apiKey: p.apiKey,
          baseURL: p.baseURL,
          isEnabled: p.isEnabled,
          requestsPerMinute: p.requestsPerMinute
      }).onConflictDoUpdate({
          target: providerConfigs.id,
          set: {
            label: p.label,
            type: p.type,
            apiKey: p.apiKey,
            baseURL: p.baseURL,
            isEnabled: p.isEnabled,
            requestsPerMinute: p.requestsPerMinute
          }
      });
    }
    log('Backup restoration complete.');
  } else {
    log('No backup file found. Falling back to .env variables...');
  }

  log('Checking .env for additional providers...');
  const providers = [
    { keyName: 'OPENAI_API_KEY', type: 'openai', label: 'OpenAI (Auto)' },
    { keyName: 'ANTHROPIC_API_KEY', type: 'anthropic', label: 'Anthropic (Auto)' },
    { keyName: 'GOOGLE_GENERATIVE_AI_API_KEY', type: 'google', label: 'Google (Auto)' },
    { keyName: 'MISTRAL_API_KEY', type: 'mistral', label: 'Mistral (Auto)' },
    { keyName: 'OPENROUTER_API_KEY', type: 'openrouter', label: 'OpenRouter (Auto)' },
  ];

  for (const p of providers) {
    const apiKey = process.env[p.keyName];
    if (apiKey) {
      console.log(`Found ${p.keyName}, upserting provider...`);
      const encryptedKey = encrypt(apiKey);
      
      // Check if exists to avoid duplicates or overwrite
      // We check by label and type to be sure
      const existing = await db.select().from(providerConfigs)
        .where(and(eq(providerConfigs.label, p.label), eq(providerConfigs.type, p.type)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(providerConfigs)
          .set({ apiKey: encryptedKey })
          .where(eq(providerConfigs.id, existing[0].id));
        console.log(`Updated ${p.label}`);
      } else {
        await db.insert(providerConfigs).values({
            id: uuidv4(),
            label: p.label,
            type: p.type,
            apiKey: encryptedKey,
            isEnabled: true,
        });
        console.log(`Created ${p.label}`);
      }
    } else {
      console.log(`Skipping ${p.label} (Key not found)`);
    }
  }
}

main().catch(console.error).finally(async () => {
    await shutdownDb();
});

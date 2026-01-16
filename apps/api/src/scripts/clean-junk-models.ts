
// Run this via: npx ts-node --esm src/scripts/clean-junk-models.ts
import { PrismaClient } from '@prisma/client';
import { ProviderService } from '../services/provider.service.js';

const prisma = new PrismaClient();
const service = new ProviderService();

async function clean() {
    console.log("🧹 Starting Model Cleanup...");
    
    // 1. Delete models that have CUID-like IDs (starts with 'c' and no colon)
    // Actually, any model without a colon is likely a legacy record.
    const junk = await prisma.model.deleteMany({
        where: {
            NOT: {
                id: { contains: ':' }
            }
        }
    });
    
    console.log(`✅ Deleted ${junk.count} legacy/crazy model records.`);

    // 2. Trigger a fresh sync to repopulate with reasonable names
    console.log("🔄 Triggering fresh sync...");
    await service.syncAll();
    
    console.log("✨ Database is now reasonable.");
}

clean().catch(console.error).finally(() => prisma.$disconnect());

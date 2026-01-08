
import { ProviderService } from '../services/provider.service.js';
import { prisma } from '../db.js';

async function main() {
    const service = new ProviderService();
    
    const providers = ['openrouter-env', 'mistral-env', 'mistral-api']; // Guessing IDs, will try multiple or query DB

    // Get actual IDs
    const configs = await prisma.providerConfig.findMany();
    console.log("Available Providers:", configs.map(c => c.id));

    for (const config of configs) {
        if (config.type === 'openrouter' || config.type === 'mistral') {
            console.log(`Refreshing models for ${config.id} (${config.label})...`);
            try {
                const res = await service.fetchAndNormalizeModels(config.id);
                console.log(`Success! Count: ${res.count}`);
            } catch (e) {
                console.error(`Failed to refresh ${config.id}:`, e);
            }
        }
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

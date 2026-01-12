
import { prisma } from '../db.js';

async function main() {
    console.log("Wiping OpenRouter and Mistral models...");
    
    // Find provider IDs
    const providers = await prisma.providerConfig.findMany({
        where: {
            OR: [
                { type: 'openrouter' },
                { type: 'mistral' }
            ]
        }
    });

    const ids = providers.map(p => p.id);
    if (ids.length === 0) {
        console.log("No providers found to wipe.");
        return;
    }

    const { count } = await prisma.model.deleteMany({
        where: {
            providerId: { in: ids }
        }
    });

    console.log(`Deleted ${count} models.`);
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());

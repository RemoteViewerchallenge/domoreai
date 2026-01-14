
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    const totalModels = await prisma.model.count();
    const totalCaps = await prisma.modelCapabilities.count();
    
    // Check specific capabilities stats
    const surveyed = await prisma.modelCapabilities.count({
        where: {
            OR: [
                { contextWindow: { gt: 4096 } },
                { hasVision: true },
                { hasReasoning: true }
            ]
        }
    });

    const confident = await prisma.modelCapabilities.count({
        where: {
            confidence: 'high'
        }
    });

    const unknown = await prisma.modelCapabilities.count({
        where: {
            confidence: 'low',
            contextWindow: 4096
        }
    });

    console.log(`
    📊 Database Status Report
    -------------------------
    Total Models:       ${totalModels}
    Capabilities Rows:  ${totalCaps}
    
    🔍 Surveyor Impact:
    - High Confidence:  ${confident} (Verified via API or Regex)
    - Upgraded Specs:   ${surveyed} (Context > 4k OR special capabilities)
    - Default/Low:      ${unknown} (Likely 4096 context, needs agent research)
    `);

  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

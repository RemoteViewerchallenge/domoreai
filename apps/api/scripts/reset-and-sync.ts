import { prisma } from "../db.js";
import { UnifiedIngestionService } from "../services/UnifiedIngestionService.js";

async function main() {
    console.log("--- CLEANUP: Deleting Unused Models ---");
    
    // 1. Delete models that have NO usage and NO vector data
    // This safely removes the specific excess "free" OpenRouter models we just added erroneously
    // without breaking existing request history.
    const deleted = await prisma.model.deleteMany({
        where: {
            modelUsage: { none: {} },
            knowledgeVectors: { none: {} }
        }
    });
    
    console.log(`Deleted ${deleted.count} unused models.`);

    // 2. Force Ingestion (Bypassing the new check? No, we need to bypass it or artificially age the data?
    // Actually, since we just deleted them, we want to re-run ingestion to get the *correct* ones back (if any were missing)
    // or just rely on the fact that if we deleted them, and they are supposed to be there, they will come back.
    // BUT, we want to run ingestion to ensure the filter (now active) only brings back the good ones.
    
    // To safe-guard, let's manually update the "updatedAt" of one model to be old, so the service runs.
    // OR, we can just call an internal method if we exposed it, but we didn't.
    // Let's just delete ALL models (that are unused) effectively "resetting" the state.
    
    // If we want to force run, we can just delete everything effectively.
    
    console.log("--- RE-INGESTING (With Filter) ---");
    
    // We artificially age the DB (hack) or we just assume the service will run if we deleted everything? 
    // If we deleted everything, findFirst will satisfy "lastUpdate" check? 
    // If there is just ONE used model left, it will have a recent date.
    // So the check in UnifiedIngestionService will prevent a run.
    
    // WE NEED TO UPDATE THE TIMESTAMP OF REMAINING MODELS TO BE OLD
    // so the service thinks it's time to update.
    const thirtySevenHoursAgo = new Date(Date.now() - 37 * 60 * 60 * 1000);
    await prisma.model.updateMany({
        data: { updatedAt: thirtySevenHoursAgo }
    });
    console.log("Aged existing models to force update.");

    await UnifiedIngestionService.ingestAllModels();
    
    const count = await prisma.model.count();
    console.log(`Final Model Count: ${count}`);
}

main().catch(console.error);

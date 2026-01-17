import { CapabilityAuditorService } from '../apps/api/src/services/CapabilityAuditorService.js';
import { prisma } from '../apps/api/src/db.js';
import { ProviderManager } from '../apps/api/src/services/ProviderManager.js';
import { loadEnv } from './env-loader.js';

async function runAQA() {
    loadEnv();
    console.log("🛠️ Initializing AQA Run...");
    await ProviderManager.initialize();
    const auditor = new CapabilityAuditorService();

    // Ensure we have some tools to test
    const toolCount = await prisma.tool.count({
        where: { serverId: { not: null } }
    });

    if (toolCount === 0) {
        console.log("⚠️ No MCP tools found. Please run sync-mcp-tools first.");
        return;
    }

    try {
        await auditor.auditAllCapabilities();
        console.log("\n🎊 AQA Run Completed Successfully.");
    } catch (err) {
        console.error("💀 AQA Run Failed:", err);
    } finally {
        process.exit(0);
    }
}

runAQA();

import { ProviderManager } from '../apps/api/src/services/ProviderManager.js';
import { McpToolSyncService } from '../apps/api/src/services/McpToolSyncService.js';
import { loadEnv } from './env-loader.js';

async function syncAll() {
    loadEnv();
    console.log("🔄 Starting Full System Sync...");
    
    // 1. Initialize Providers & Sync Models
    console.log("\n--- Models Sync ---");
    await ProviderManager.initialize();
    await ProviderManager.syncModelsToRegistry();
    
    // 2. Sync MCP Tools
    console.log("\n--- MCP Tools Sync ---");
    const mcpStats = await McpToolSyncService.syncAllTools();
    console.log(`✅ MCP Sync Complete: ${mcpStats.servers} servers, ${mcpStats.tools} tools.`);

    console.log("\n🎊 Full System Sync Completed.");
    process.exit(0);
}

syncAll().catch(err => {
    console.error("💀 Sync Failed:", err);
    process.exit(1);
});

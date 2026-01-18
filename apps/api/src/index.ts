import './instrumentation.js'; // Must be top line
import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import './services/IngestionService.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createTRPCContext as createContext } from './trpc.js';
import { shutdownDb } from './db.js'; 
// import { llmRouter } from './routers/llm.router.js';
import { ProviderManager } from './services/ProviderManager.js';
import { createVolcanoTelemetry } from 'volcano-sdk';
// import { scheduler } from './services/JobScheduler.js';
import { backupService } from './services/BackupService.js';
// import { persistentModelDoctor } from './services/PersistentModelDoctor.js';
import { API_PORT, API_HOST, DEFAULT_CORS_ORIGIN, VOLCANO_TELEMETRY_ENABLED } from './config/constants.js';
import { initializeMockEngines } from './services/voice/mockEngines.js';

// Initialize Telemetry
if (process.env.VOLCANO_TELEMETRY_ENABLED === VOLCANO_TELEMETRY_ENABLED) {
  createVolcanoTelemetry({
    serviceName: process.env.OTEL_SERVICE_NAME,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
}

/**
 * Initializes and starts the application server.
 */
async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const port = API_PORT;

  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
  // Removed strict encryption key check as we are using env vars for keys now.
  if (ENCRYPTION_KEY && ENCRYPTION_KEY.length > 0) {
      console.log('Encryption key present (legacy check).');
  }

  // Apply essential middlewares
  // Add request logging
  app.use(morgan('dev'));

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN,
    })
  );
  app.use(express.json({ limit: '50mb' }));

  // Setup tRPC endpoint
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ path, error }) {
        console.error(`tRPC Error on '${path}':`, error);
      },
    })
  );

  // Initialize WebSocket service
  const wsService = new WebSocketService(server);
  // Register singleton so other services can broadcast events
  try {
    const { setWebSocketService } = await import('./services/websocket.singleton.js');
    setWebSocketService(wsService);
  } catch (err) {
    console.warn('Failed to register WebSocketService singleton:', err);
  }

  // Initialize Provider Manager
  await ProviderManager.initialize();
  
  // ==============================================================================
  // RUN THE ANTI-CORRUPTION PIPELINE
  // ==============================================================================
  // Phase 1: Saves raw JSON files exactly as they are to RawDataLake
  // Phase 2: Filters and normalizes data into the Model table
  // - Strict filtering: Rejects paid OpenRouter models
  // - Fail-open for Groq, Google, Mistral (assumes free tier)
  // - Preserves all original data in providerData field
  // ==============================================================================
  // RUN THE ANTI-CORRUPTION PIPELINE (Non-Blocking Optimized)
  // ==============================================================================
  
  const backgroundSync = async () => {
     try {
        console.log('🔄 Running Unified Model Ingestion (Background)...');
        // 1. PHASE 1: OFFLINE IMPORT
        const { UnifiedIngestionService } = await import('./services/UnifiedIngestionService.js');
        await UnifiedIngestionService.ingestAllModels();
        
        // 2. PHASE 2: ONLINE SYNC
        console.log('🌍 Syncing Live Providers (NVIDIA, Cerebras, etc.)...');
        await ProviderManager.syncModelsToRegistry();
    
        // 3. PHASE 3: CAPABILITY SCAN
        console.log('🕵️ Running Model Surveyor (Targeting Unknowns)...');
        const { Surveyor } = await import('./services/Surveyor.js');
        const stats = await Surveyor.surveyAll();
        if (stats.surveyed > 0) {
            console.log(`[Surveyor] Scan Complete: ${stats.surveyed} newly identified.`);
        }
     } catch (err) {
        console.error('❌ Background Sync Failed:', err);
     }
  };

  try {
     const { prisma } = await import('./db.js');
     const modelCount = await prisma.model.count();
     
     if (modelCount === 0) {
         console.log('⚠️ Database empty. Waiting for initial sync...');
         await backgroundSync();
     } else {
         console.log(`✅ Database warm (${modelCount} models). Starting server immediately.`);
         void backgroundSync(); // Fire and forget
     }

  } catch (err) {
    console.error('❌ Model Ingestion/Sync Failed:', err);
  }

  // Mount RESTful API routers
  // app.use('/llm', llmRouter);

  // Global error handler for REST routes
  // This should be the last middleware added
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message, // In production, you might want to avoid sending the raw message
    });
  });

  server.listen(port, () => {
    void (async () => {
      console.log(`API server listening at ${API_HOST}:${port}`);
    
    // Display comprehensive model inventory
    try {
      const { prisma } = await import('./db.js');
      // Cast to any to bypass type checking while Prisma client regenerates
      const allModels = await (prisma.model.findMany({
        select: {
          id: true,
          name: true,
          providerId: true,
          costPer1k: true,
          capabilities: {
            select: {
              primaryTask: true,
              isLocal: true,
              hasVision: true,
              hasReasoning: true,
              hasEmbedding: true,
              hasImageGen: true,
              hasTTS: true,
            }
          }
        }
      }) as any);
      
      // Build provider x type matrix
      interface ProviderStats {
        chat: number;
        embedding: number;
        vision: number;
        reasoning: number;
        imageGen: number;
        tts: number;
        other: number;
        total: number;
        isLocal: boolean;
      }
      
      const providerStats: Record<string, ProviderStats> = {};
      const totals: ProviderStats = {
        chat: 0,
        embedding: 0,
        vision: 0,
        reasoning: 0,
        imageGen: 0,
        tts: 0,
        other: 0,
        total: 0,
        isLocal: false
      };
      
      for (const model of allModels) {
        const provider = model.providerId;
        if (!providerStats[provider]) {
          providerStats[provider] = {
            chat: 0,
            embedding: 0,
            vision: 0,
            reasoning: 0,
            imageGen: 0,
            tts: 0,
            other: 0,
            total: 0,
            isLocal: false
          };
        }
        
        const caps = model.capabilities;
        const stats = providerStats[provider];
        
        // Track if this provider has any local models
        if (caps?.isLocal) {
          stats.isLocal = true;
        }
        
        // Categorize by primary task
        const task = caps?.primaryTask || 'chat';
        if (task === 'embedding') {
          stats.embedding++;
          totals.embedding++;
        } else if (task === 'image_gen') {
          stats.imageGen++;
          totals.imageGen++;
        } else if (task === 'tts') {
          stats.tts++;
          totals.tts++;
        } else if (task === 'chat') {
          stats.chat++;
          totals.chat++;
          
          // Also count special capabilities
          if (caps?.hasVision) {
            stats.vision++;
            totals.vision++;
          }
          if (caps?.hasReasoning) {
            stats.reasoning++;
            totals.reasoning++;
          }
        } else {
          stats.other++;
          totals.other++;
        }
        
        stats.total++;
        totals.total++;
      }
      
      // Sort providers: API first, then local
      const sortedProviders = Object.entries(providerStats).sort((a, b) => {
        if (a[1].isLocal !== b[1].isLocal) {
          return a[1].isLocal ? 1 : -1; // API providers first
        }
        return b[1].total - a[1].total; // Then by count
      });
      
      // Build the table
      const pad = (str: string | number, len: number) => String(str).padEnd(len);
      const padLeft = (str: string | number, len: number) => String(str).padStart(len);
      
      console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚀 C.O.R.E. Model Inventory                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Provider        │ Chat │ Embed │ Vision │ Reason │ ImgGen │ TTS │ Total   │
├──────────────────┼──────┼───────┼────────┼────────┼────────┼─────┼─────────┤`);
      
      for (const [provider, stats] of sortedProviders) {
        const localFlag = stats.isLocal ? '🏠' : '  ';
        const providerName = pad(provider, 14);
        console.log(
          `│ ${localFlag}${providerName} │ ${padLeft(stats.chat, 4)} │ ${padLeft(stats.embedding, 5)} │ ${padLeft(stats.vision, 6)} │ ${padLeft(stats.reasoning, 6)} │ ${padLeft(stats.imageGen, 6)} │ ${padLeft(stats.tts, 3)} │ ${padLeft(stats.total, 7)} │`
        );
      }
      
      console.log(`├──────────────────┼──────┼───────┼────────┼────────┼────────┼─────┼─────────┤`);
      console.log(
        `│ ${pad('TOTAL', 16)} │ ${padLeft(totals.chat, 4)} │ ${padLeft(totals.embedding, 5)} │ ${padLeft(totals.vision, 6)} │ ${padLeft(totals.reasoning, 6)} │ ${padLeft(totals.imageGen, 6)} │ ${padLeft(totals.tts, 3)} │ ${padLeft(totals.total, 7)} │`
      );
      console.log(`└──────────────────┴──────┴───────┴────────┴────────┴────────┴─────┴─────────┘
      `);
    } catch (err) {
      console.warn('Could not fetch model inventory:', err);
    }

    // Start background services
    console.log('\n🔧 Starting background services...');
    
    // Start automatic backup service
    try {
      await backupService.start();
    } catch (err) {
      console.warn('⚠️ Backup service failed to start:', err);
    }

    // [NEW] Trigger Background MCP Tool Sync
    // This ensures the UI reflects any new MCP servers added to RegistryClient
    void import('./services/McpToolSyncService.js').then(({ McpToolSyncService }) => {
      void McpToolSyncService.syncAllTools()
        .then(stats => console.log(`[McpSync] Startup sync complete. Tools: ${stats.tools}`))
        .catch(err => console.error('[McpSync] Startup sync failed:', err));
    });

    // [AUTONOMIC RESILIENCE] Start LogWarden
    void import('./services/LogWarden.js').then(({ logWarden }) => {
      logWarden.start();
    }).catch(err => console.error('[LogWarden] Failed to start:', err));

    // Start persistent model doctor
    // try {
    //   await persistentModelDoctor.start();
    // } catch (err) {
    //   console.warn('⚠️ Persistent model doctor failed to start:', err);
    // }
    
    // Initialize mock voice engines for development
    try {
      await initializeMockEngines();
      console.log('✅ Mock voice engines initialized');
    } catch (err) {
      console.warn('⚠️ Failed to initialize mock voice engines:', err);
    }
    })();
  });


  let isShuttingDown = false;

  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop background services first
    backupService.stop();
    // persistentModelDoctor.stop();
    
    server.close(() => {
      void (async () => {
        console.log('HTTP server closed.');      
      wsService.close(); // Assuming WebSocketService has a .close() method
      await shutdownDb();
      console.log('Database connection closed.');
        process.exit(0);
      })();
    });

    // Force exit if graceful shutdown takes too long (e.g. 5s)
    setTimeout(() => {
      console.error('Forcing shutdown after timeout...');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// START THE AUTONOMY ENGINE
// scheduler.start(5000); // Check for work every 5 seconds
// NOTE: Disabled until jobs table is created via migration.
// JobScheduler will gracefully handle missing tables when enabled.

console.log('Server starting... (Force Restart 2)');
void startServer();

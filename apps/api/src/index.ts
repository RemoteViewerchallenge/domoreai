import './instrumentation.js'; // Must be top line
import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import './services/IngestionAgent.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createTRPCContext as createContext } from './trpc.js';
import { db, shutdownDb } from './db.js'; 
import { llmRouter } from './routers/llm.router.js';
import { ProviderManager } from './services/ProviderManager.js';
import { autoLoadRawJsonFiles } from './services/RawJsonLoader.js';
import { createVolcanoTelemetry } from 'volcano-sdk';
import { scheduler } from './services/JobScheduler.js';
import { backupService } from './services/BackupService.js';
import { persistentModelDoctor } from './services/PersistentModelDoctor.js';

// Initialize Telemetry
if (process.env.VOLCANO_TELEMETRY_ENABLED === 'true') {
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
  const port = 4000;

  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error(
      'FATAL: ENCRYPTION_KEY is not set or is not a 64-character hex string. Please set a strong 32-byte key (as 64 hex chars) in your environment variables.'
    );
    // process.exit(1); // Don't exit, just warn for now to allow dev
  }

  // Apply essential middlewares
  // Add request logging
  app.use(morgan('dev'));

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    })
  );
  app.use(express.json());

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
  
  // SIMPLIFIED: Only load raw JSON files into raw_* tables
  // Skip syncModelsToRegistry() - we don't need model_registry table yet
  // Load raw JSON files into raw_* tables
  await autoLoadRawJsonFiles();

  // Mount RESTful API routers
  app.use('/llm', llmRouter);

  // Global error handler for REST routes
  // This should be the last middleware added
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message, // In production, you might want to avoid sending the raw message
    });
  });

  server.listen(port, async () => {
    console.log(`API server listening at http://localhost:${port}`);
    
    // Display free model inventory
    try {
      const { prisma } = await import('./db.js');
      const allModels = await prisma.model.findMany({
        select: {
          id: true,
          name: true,
          providerId: true,
          isFree: true
        }
      });
      
      const freeModels = allModels.filter(m => m.isFree);
      const freeByProvider = freeModels.reduce((acc, m) => {
        const provider = m.providerId;
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`
┌────────────────────────────────────────┐
│  🚀 C.O.R.E. API Started              │
├────────────────────────────────────────┤
│  Total Models: ${String(allModels.length).padEnd(23)}│
│  ✅ Free Models: ${String(freeModels.length).padEnd(21)}│
${Object.entries(freeByProvider).map(([provider, count]) => 
  `│     - ${provider}: ${String(count).padEnd(26 - provider.length)}│`
).join('\n')}
│                                        │
│  💰 Zero-Burn Mode: ACTIVE            │
└────────────────────────────────────────┘
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

    // Start persistent model doctor
    try {
      await persistentModelDoctor.start();
    } catch (err) {
      console.warn('⚠️ Persistent model doctor failed to start:', err);
    }
  });


  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop background services first
    backupService.stop();
    persistentModelDoctor.stop();
    
    server.close(async () => {
      console.log('HTTP server closed.');      
      wsService.close(); // Assuming WebSocketService has a .close() method
      await shutdownDb();
      console.log('Database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// START THE AUTONOMY ENGINE
// scheduler.start(5000); // Check for work every 5 seconds
// NOTE: Disabled until jobs table is created via migration.
// JobScheduler will gracefully handle missing tables when enabled.

console.log('Server starting... (Force Restart 2)');
startServer();

import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import { createExpressMiddleware, type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createTRPCContext as createContext } from './trpc.js';
import { db } from './db.js'; 
import { llmRouter } from './routers/llm.router.js';

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

  server.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');      
      wsService.close(); // Assuming WebSocketService has a .close() method
      await db.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer();

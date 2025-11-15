import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { appRouter } from './routers/index.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { createContext } from './trpc.js';

export type { AppRouter } from './routers/index.js';

const app = express();
const port = 4000;
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

/**
 * Initializes the database and starts the Express server.
 * This function ensures that the database is ready before the server starts accepting requests.
 * It also initializes the WebSocket service.
 */
    new WebSocketService(server);
    server.listen(port, () => {
        console.log(`API server listening at http://localhost:${port}`);
    });

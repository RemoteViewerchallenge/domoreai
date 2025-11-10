import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { VfsSessionService } from './vfsSession.service.js';
import url from 'url';
import { logger } from '../utils/logger.js';

class WebSocketService {
  private wss: WebSocketServer;
  // Store clients keyed by workspaceId
  private clients: Map<string, Set<WebSocket>> = new Map();

  public initialize(server: http.Server, vfsService: VfsSessionService) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      if (!request.url) {
        socket.destroy();
        return;
      }

      const { query } = url.parse(request.url, true);
      const token = query.token as string;

      if (!token) {
        logger.warn('WebSocket upgrade request without token');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const session = vfsService.validateToken(token);

      if (!session) {
        logger.warn(`WebSocket upgrade request with invalid token: ${token}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.addClient(session.workspaceId, ws);
        this.wss.emit('connection', ws, request);
      });
    });

    logger.info('WebSocketService initialized and attached to HTTP server');
  }

  private addClient(workspaceId: string, ws: WebSocket) {
    if (!this.clients.has(workspaceId)) {
      this.clients.set(workspaceId, new Set());
    }
    this.clients.get(workspaceId)?.add(ws);
    logger.info(`WebSocket client connected for workspace: ${workspaceId}`);

    ws.on('close', () => {
      this.removeClient(workspaceId, ws);
    });
  }

  private removeClient(workspaceId: string, ws: WebSocket) {
    const workspaceClients = this.clients.get(workspaceId);
    if (workspaceClients) {
      workspaceClients.delete(ws);
      if (workspaceClients.size === 0) {
        this.clients.delete(workspaceId);
      }
      logger.info(`WebSocket client disconnected for workspace: ${workspaceId}`);
    }
  }

  public broadcast(workspaceId: string, type: 'stdout' | 'stderr' | 'system', message: string): void {
    const workspaceClients = this.clients.get(workspaceId);
    if (!workspaceClients) {
      return;
    }

    const payload = JSON.stringify({
      type,
      message,
      timestamp: new Date().toISOString(),
    });

    workspaceClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}

export const webSocketService = new WebSocketService();

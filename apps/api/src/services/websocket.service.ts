import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

/**
 * Manages the WebSocket server for handling Virtual File System (VFS) operations.
 * It initializes the server, handles incoming connections, and validates VFS session tokens.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;

  /**
   * Creates an instance of WebSocketService and initializes the WebSocket server.
   * @param {Server} server - The HTTP server instance to attach the WebSocket server to.
   */
  constructor(server: Server) {
    this.initialize(server);
  }

  /**
   * Initializes the WebSocket server and sets up connection handling.
   * @param {Server} server - The HTTP server instance.
   * @private
   */
  private initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/vfs' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('WebSocket client connected');

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const vfsToken = url.searchParams.get('vfs_token');

      if (!vfsToken) {
        console.log('WebSocket client disconnected: No VFS token provided.');
        ws.close(1008, 'No VFS token provided');
        return;
      }

      console.log('VFS session validated for WebSocket client.');

      ws.on('message', (message: string) => {
        console.log('received: %s', message);
        // Here you would handle messages from the client, e.g., terminal commands
        // For now, we just echo the message back
        ws.send(`Echo: ${message}`);
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }
}
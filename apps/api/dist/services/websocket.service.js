import { WebSocketServer } from 'ws';
<<<<<<< HEAD
/**
 * Manages the WebSocket server for handling Virtual File System (VFS) operations.
 * It initializes the server, handles incoming connections, and validates VFS session tokens.
 */
export class WebSocketService {
    wss;
    /**
     * Creates an instance of WebSocketService and initializes the WebSocket server.
     * @param server - The HTTP server instance to attach the WebSocket server to.
     */
    constructor(server) {
        this.wss = new WebSocketServer({ server, path: '/vfs' });
        this.initialize();
    }
    /**
     * Initializes the WebSocket server and sets up connection handling.
     * @private
     */
    initialize() {
=======
import { vfsSessionService } from './vfsSession.service.js';
export class WebSocketService {
    wss = null;
    constructor(server) {
        this.initialize(server);
    }
    initialize(server) {
        this.wss = new WebSocketServer({ server, path: '/vfs' });
>>>>>>> integration/ide-layout
        this.wss.on('connection', (ws, req) => {
            console.log('WebSocket client connected');
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const vfsToken = url.searchParams.get('vfs_token');
            if (!vfsToken) {
                console.log('WebSocket client disconnected: No VFS token provided.');
                ws.close(1008, 'No VFS token provided');
                return;
            }
<<<<<<< HEAD
=======
            const vfs = vfsSessionService.getScopedVfs(vfsToken);
            if (!vfs) {
                console.log('WebSocket client disconnected: Invalid or expired VFS token.');
                ws.close(1008, 'Invalid or expired VFS token');
                return;
            }
>>>>>>> integration/ide-layout
            console.log('VFS session validated for WebSocket client.');
            ws.on('message', (message) => {
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
<<<<<<< HEAD
    /**
     * Closes the WebSocket server and terminates all client connections.
     */
    close() {
        console.log('Closing WebSocket server...');
        this.wss.close();
    }
}
//# sourceMappingURL=websocket.service.js.map
=======
}
>>>>>>> integration/ide-layout

import { Server } from 'http';
/**
 * Manages the WebSocket server for handling Virtual File System (VFS) operations.
 * It initializes the server, handles incoming connections, and validates VFS session tokens.
 */
export declare class WebSocketService {
    private wss;
    /**
     * Creates an instance of WebSocketService and initializes the WebSocket server.
     * @param {Server} server - The HTTP server instance to attach the WebSocket server to.
     */
    constructor(server: Server);
    /**
     * Initializes the WebSocket server and sets up connection handling.
     * @param {Server} server - The HTTP server instance.
     * @private
     */
    private initialize;
}
//# sourceMappingURL=websocket.service.d.ts.map
import { Server } from 'http';
<<<<<<< HEAD
/**
 * Manages the WebSocket server for handling Virtual File System (VFS) operations.
 * It initializes the server, handles incoming connections, and validates VFS session tokens.
 */
export declare class WebSocketService {
    private wss;
    /**
     * Creates an instance of WebSocketService and initializes the WebSocket server.
     * @param server - The HTTP server instance to attach the WebSocket server to.
     */
    constructor(server: Server);
    /**
     * Initializes the WebSocket server and sets up connection handling.
     * @private
     */
    private initialize;
    /**
     * Closes the WebSocket server and terminates all client connections.
     */
    close(): void;
=======
export declare class WebSocketService {
    private wss;
    constructor(server: Server);
    private initialize;
>>>>>>> integration/ide-layout
}
//# sourceMappingURL=websocket.service.d.ts.map
import type { TerminalMessage } from '@repo/common/agent';
type WebSocketStatus = 'disconnected' | 'connecting' | 'connected';
interface WebSocketState {
    status: WebSocketStatus;
    messages: TerminalMessage[];
    socket: WebSocket | null;
    actions: {
        connect: (vfsToken: string) => void;
        disconnect: () => void;
        sendMessage: (payload: any) => void;
        addMessage: (message: TerminalMessage) => void;
    };
}
/**
 * A Zustand store for managing the WebSocket connection and terminal messages.
 *
 * @property {WebSocketStatus} status - The current status of the WebSocket connection.
 * @property {TerminalMessage[]} messages - An array of terminal messages received from the server.
 * @property {WebSocket | null} socket - The WebSocket instance.
 * @property {object} actions - An object containing functions to interact with the WebSocket.
 * @property {(vfsToken: string) => void} actions.connect - Establishes a WebSocket connection.
 * @property {() => void} actions.disconnect - Closes the WebSocket connection.
 * @property {(payload: any) => void} actions.sendMessage - Sends a message to the server.
 * @property {(message: TerminalMessage) => void} actions.addMessage - Adds a message to the message history.
 */
declare const useWebSocketStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WebSocketState>>;
export default useWebSocketStore;

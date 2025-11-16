import { create } from 'zustand';
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
const useWebSocketStore = create((set, get) => ({
    status: 'disconnected',
    messages: [],
    socket: null,
    actions: {
        connect: (vfsToken) => {
            if (get().socket) {
                return;
            }
            set({ status: 'connecting' });
            const socket = new WebSocket(`ws://localhost:4000?token=${vfsToken}`);
            socket.onopen = () => {
                set({ status: 'connected', socket });
            };
            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    get().actions.addMessage(message);
                }
                catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            socket.onclose = () => {
                set({ status: 'disconnected', socket: null });
            };
            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                set({ status: 'disconnected', socket: null });
            };
        },
        disconnect: () => {
            get().socket?.close();
            set({ status: 'disconnected', socket: null });
        },
        sendMessage: (payload) => {
            const socket = get().socket;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(payload));
            }
        },
        addMessage: (message) => {
            set((state) => ({ messages: [...state.messages, message] }));
        }
    }
}));
export default useWebSocketStore;

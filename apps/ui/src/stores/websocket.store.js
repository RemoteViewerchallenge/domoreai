import { create } from 'zustand';
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

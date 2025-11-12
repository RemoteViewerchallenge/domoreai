import { create } from 'zustand';
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

const useWebSocketStore = create<WebSocketState>((set, get) => ({
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
        } catch (error) {
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
    addMessage: (message: TerminalMessage) => {
      set((state) => ({ messages: [...state.messages, message] }));
    }
  }
}));

export default useWebSocketStore;

import { create } from 'zustand';
import type { TerminalMessage } from '@repo/common/agent';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected';

function isTerminalMessage(obj: unknown): obj is TerminalMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return (
    typeof msg.timestamp === 'string' &&
    typeof msg.message === 'string' &&
    ['info', 'warn', 'error', 'command', 'response'].includes(msg.type as string)
  );
}

interface WebSocketState {
  status: WebSocketStatus;
  messages: TerminalMessage[];
  socket: WebSocket | null;
  actions: {
    connect: (vfsToken: string) => void;
    disconnect: () => void;
    sendMessage: (payload: unknown) => void;
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
      const socket = new WebSocket(`ws://localhost:4000/vfs?vfs_token=${vfsToken}`);

      socket.onopen = () => {
        set({ status: 'connected', socket });
      };

      socket.onmessage = (event) => {
        try {
          const data: unknown = JSON.parse(event.data as string);
          if (isTerminalMessage(data)) {
            get().actions.addMessage(data);
          } else {
            console.warn('Received non-TerminalMessage from WebSocket:', data);
          }
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
    sendMessage: (payload: unknown) => {
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

import { create } from 'zustand';
import useIngestStore from './ingest.store.js';
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
  lastEvent: { type: string; [key: string]: any } | null;
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
 */
const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'disconnected',
  messages: [],
  lastEvent: null,
  socket: null,
  actions: {
    connect: (vfsToken) => {
      const { socket, status } = get();
      if (socket || status === 'connecting') {
        return;
      }

      set({ status: 'connecting' });
      const newSocket = new WebSocket(`ws://localhost:4000/vfs?vfs_token=${vfsToken}`);

      newSocket.onopen = () => {
        set({ status: 'connected', socket: newSocket });
      };

      newSocket.onmessage = (event) => {
        try {
          const data: any = JSON.parse(event.data as string);

          // Pass through terminal-style messages
          if (isTerminalMessage(data)) {
            get().actions.addMessage(data);
            return;
          }

          // Handle Role Events
          if (data && (data.type === 'ROLE_CREATED' || data.type === 'ROLE_UPDATED')) {
            set({ lastEvent: data });
            return;
          }

          // Handle ingest progress events emitted by the server
          if (data && typeof data.type === 'string' && data.type.startsWith('ingest')) {
            const ingest = useIngestStore.getState();
            switch (data.type) {
              case 'ingest.start':
                ingest.increment(data.path || undefined);
                break;
              case 'ingest.file.start':
                useIngestStore.setState({ currentPath: data.filePath || data.file || null });
                break;
              case 'ingest.file.complete':
                const prev = useIngestStore.getState().filesProcessed || 0;
                useIngestStore.getState().updateProgress(prev + 1);
                break;
              case 'ingest.file.skipped':
                const prev2 = useIngestStore.getState().filesProcessed || 0;
                useIngestStore.getState().updateProgress(prev2 + 1);
                break;
              case 'ingest.complete':
                useIngestStore.getState().decrement();
                useIngestStore.getState().updateProgress(0);
                useIngestStore.setState({ currentPath: null });
                break;
              default:
                break;
            }
            return;
          }

          console.warn('Received unknown message from WebSocket:', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      newSocket.onclose = () => {
        set({ status: 'disconnected', socket: null });
      };

      newSocket.onerror = (error) => {
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

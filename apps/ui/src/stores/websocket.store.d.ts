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
declare const useWebSocketStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WebSocketState>>;
export default useWebSocketStore;

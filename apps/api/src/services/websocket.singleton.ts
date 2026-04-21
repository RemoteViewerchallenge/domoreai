import type { WebSocketService } from './websocket.service.js';

let instance: WebSocketService | null = null;

export const setWebSocketService = (svc: WebSocketService) => {
  instance = svc;
};

export const getWebSocketService = (): WebSocketService | null => instance;

export const broadcastEvent = (type: string, payload: any) => {
  if (instance) {
    instance.broadcast({ type, ...payload });
  } else {
    console.warn('[Broadcast] WebSocket service not initialized, skipping message:', type);
  }
};

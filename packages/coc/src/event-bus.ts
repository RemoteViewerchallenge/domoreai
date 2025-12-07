// Minimal in-memory pub/sub event bus.
// Other packages (Judge, Librarian) can import this singleton to subscribe.
type Handler = (payload: any) => void;
const handlers: Record<string, Handler[]> = {};

export const eventBus = {
  on(event: string, h: Handler) {
    handlers[event] = handlers[event] || [];
    handlers[event].push(h);
    return () => { handlers[event] = handlers[event].filter(x => x !== h); };
  },
  emit(event: string, payload: any) {
    (handlers[event] || []).forEach(h => { try { h(payload); } catch(e) { /* swallow handler error */ } });
  }
};
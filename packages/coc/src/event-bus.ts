/**
 * Event Bus Module
 * 
 * Provides an in-memory publish/subscribe singleton for orchestrator events.
 * Enables Judge, Librarian, and Planner to subscribe to events without tight coupling.
 * 
 * Event types:
 * - task.queued: A new task has been added to the queue
 * - task.started: A worker has picked up a task
 * - task.completed: A task has completed successfully
 * - task.failed: A task has failed
 * - task.retried: A task is being retried
 * - evaluation.complete: An evaluation has finished
 * - artifact.indexed: An artifact has been indexed
 * - trace.event: A trace event was written
 */

export type EventType =
  | 'task.queued'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.retried'
  | 'evaluation.complete'
  | 'artifact.indexed'
  | 'trace.event';

export interface Event {
  type: EventType;
  timestamp: string;
  data: any;
}

export type EventHandler = (event: Event) => void | Promise<void>;

/**
 * EventBus singleton for pub/sub
 */
class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to events of a specific type
   * @param type - Event type to subscribe to
   * @param handler - Handler function to call when event is published
   * @returns Unsubscribe function
   */
  subscribe(type: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param event - Event to publish
   */
  async publish(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Call all handlers (in parallel)
    const promises = Array.from(handlers).map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Remove all handlers for a specific event type (or all types if not specified)
   * @param type - Optional event type to clear handlers for
   */
  clear(type?: EventType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the count of handlers for a specific event type
   * @param type - Event type
   * @returns Number of handlers subscribed
   */
  handlerCount(type: EventType): number {
    return this.handlers.get(type)?.size || 0;
  }
}

// Export singleton instance
export const eventBus = new EventBus();

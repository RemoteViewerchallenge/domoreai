/**
 * In-Memory Task Queue
 * Simple FIFO queue for managing orchestration tasks
 */

export interface Task {
  id: string;
  type: string;
  payload: unknown;
  priority: number;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * In-memory task queue implementation
 */
export class TaskQueue {
  private tasks: Task[] = [];
  private idCounter = 0;

  /**
   * Enqueue a new task
   */
  enqueue(type: string, payload: unknown, priority = 0): Task {
    const task: Task = {
      id: `task-${++this.idCounter}`,
      type,
      payload,
      priority,
      createdAt: new Date(),
      status: 'pending',
    };

    this.tasks.push(task);
    // Sort by priority (higher priority first)
    this.tasks.sort((a, b) => b.priority - a.priority);

    return task;
  }

  /**
   * Dequeue the next pending task
   */
  dequeue(): Task | undefined {
    const task = this.tasks.find((t) => t.status === 'pending');
    if (task) {
      task.status = 'processing';
    }
    return task;
  }

  /**
   * Mark a task as completed
   */
  complete(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'completed';
    }
  }

  /**
   * Mark a task as failed
   */
  fail(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'failed';
    }
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return this.tasks.filter((t) => t.status === status);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.tasks.length;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks = [];
  }
}

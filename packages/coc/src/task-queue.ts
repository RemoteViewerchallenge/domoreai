/**
 * Task Queue Module
 * 
 * Provides in-memory task queue for the orchestrator.
 * Tasks are picked by workers and can transition through states.
 */

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying';

export interface Task {
  id: string;
  role: string;
  prompt: string;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * In-memory task queue
 */
export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = [];

  /**
   * Enqueue a new task
   * @param task - Task to add to queue
   */
  enqueue(task: Task): void {
    this.tasks.set(task.id, task);
    this.queue.push(task.id);
  }

  /**
   * Dequeue the next available task
   * @returns Next task or null if queue is empty
   */
  dequeue(): Task | null {
    while (this.queue.length > 0) {
      const taskId = this.queue.shift()!;
      const task = this.tasks.get(taskId);
      
      if (task && task.status === 'queued') {
        task.status = 'running';
        task.startedAt = new Date().toISOString();
        return task;
      }
    }
    return null;
  }

  /**
   * Get task by ID
   * @param id - Task ID
   * @returns Task or undefined
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Update task status
   * @param id - Task ID
   * @param status - New status
   * @param updates - Additional updates to apply
   */
  updateTask(id: string, status: TaskStatus, updates?: Partial<Task>): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.status = status;
    if (updates) {
      Object.assign(task, updates);
    }

    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString();
    }
  }

  /**
   * Retry a failed task
   * @param id - Task ID
   */
  retry(id: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.retries >= task.maxRetries) {
      throw new Error(`Task ${id} has exceeded max retries`);
    }

    task.retries += 1;
    task.status = 'queued';
    task.error = undefined;
    this.queue.push(id);
  }

  /**
   * Get all tasks
   * @returns Array of all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   * @param status - Status to filter by
   * @returns Array of tasks with the given status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * Get queue size
   * @returns Number of queued tasks
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
    this.queue = [];
  }
}

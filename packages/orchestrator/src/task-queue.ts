export type Task = {
  id: string; title: string; role: string; payloadId?: string | null; promptTemplateId?: string | null; acceptanceSchema?: any; modelHints?: any; retries?: number; meta?: any;
};

export class TaskQueue {
  private q: Task[] = [];
  enqueue(t: Task){ this.q.push(t); }
  async dequeueReady(){ return this.q.shift() || null; }
  requeue(t: Task, opts?: any){ this.q.push(t); }
  markDone(t: Task){}
  empty(){ return this.q.length === 0; }
}

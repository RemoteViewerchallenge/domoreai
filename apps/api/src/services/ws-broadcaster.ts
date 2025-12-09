/**
 * WebSocket Event Broadcaster
 * 
 * Helper utilities for broadcasting real-time events to connected UI clients.
 * Used by COC, agents, and API services for live updates.
 */

import { getWebSocketService } from '../services/websocket.singleton.js';

/**
 * Broadcast rate limit update
 */
export function broadcastRateLimitUpdate(data: {
  provider: string;
  model: string;
  remaining: number;
  limit: number;
  resetTimestamp: number;
  isThrottled: boolean;
}): void {
  try {
    const ws = getWebSocketService();
    ws?.broadcast({
      type: 'ratelimit.update',
      timestamp: Date.now(),
      ...data,
    });
  } catch {
    // Silent fail - broadcasting is optional
  }
}

/**
 * Broadcast task progress update
 */
export function broadcastTaskProgress(data: {
  taskId: string;
  step: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  startTime?: number;
}): void {
  try {
    const ws = getWebSocketService();
    ws?.broadcast({
      type: 'task.progress',
      timestamp: Date.now(),
      ...data,
    });
  } catch {
    // Silent fail
  }
}

/**
 * Broadcast model selection decision
 */
export function broadcastModelSelected(data: {
  taskId: string;
  role: string;
  modelId: string;
  provider: string;
  ucbScore?: number;
  rateLimitScore?: number;
}): void {
  try {
    const ws = getWebSocketService();
    ws?.broadcast({
      type: 'model.selected',
      timestamp: Date.now(),
      ...data,
    });
  } catch {
    // Silent fail
  }
}

/**
 * Broadcast error occurrence
 */
export function broadcastError(data: {
  provider: string;
  model?: string;
  role?: string;
  tools?: string[];
  errorType: string;
  statusCode?: number;
  message: string;
  error?: unknown;
}): void {
  try {
    const ws = getWebSocketService();
    ws?.broadcast({
      type: 'error.occurred',
      timestamp: Date.now(),
      ...data,
    });
  } catch {
    // Silent fail
  }
}

/**
 * Broadcast orchestration step update
 */
export function broadcastOrchestrationStep(data: {
  executionId: string;
  orchestrationId: string;
  stepName: string;
  stepStatus: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
}): void {
  try {
    const ws = getWebSocketService();
    ws?.broadcast({
      type: 'orchestration.step',
      timestamp: Date.now(),
      ...data,
    });
  } catch {
    // Silent fail
  }
}

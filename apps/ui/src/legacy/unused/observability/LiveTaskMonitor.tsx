import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface TaskData {
  taskId: string;
  step: string;
  status: 'running' | 'completed' | 'failed';
  duration: number;
  startTime: number;
  model?: string;
  provider?: string;
  ucbScore?: number;
  rateLimitScore?: number;
}

interface Props {
  className?: string;
}

/**
 * Live Task Monitor
 * 
 * Displays active COC tasks with real-time updates:
 * - Current step being executed
 * - Duration counter (live)
 * - Model selection decisions
 * - Task status
 * 
 * Updates via WebSocket events:
 * - task.progress
 * - model.selected
 * - task.completed
 * - task.failed
 */
export function LiveTaskMonitor({ className = '' }: Props) {
  const [tasks, setTasks] = useState<Map<string, TaskData>>(new Map());
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [, setTick] = useState(0);

  // Update duration counters every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/vfs`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[LiveTaskMonitor] WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'task.progress') {
          setTasks(prev => new Map(prev).set(data.taskId, {
            taskId: data.taskId,
            step: data.step,
            status: data.status,
            duration: data.duration || 0,
            startTime: data.startTime || Date.now(),
          }));
        }
        
        if (data.type === 'model.selected') {
          setTasks(prev => {
            const task = prev.get(data.taskId);
            if (task) {
              return new Map(prev).set(data.taskId, {
                ...task,
                model: data.modelId,
                provider: data.provider,
                ucbScore: data.ucbScore,
                rateLimitScore: data.rateLimitScore,
              });
            }
            return prev;
          });
        }

        if (data.type === 'task.completed' || data.type === 'task.failed') {
          setTasks(prev => {
            const task = prev.get(data.taskId);
            if (task) {
              return new Map(prev).set(data.taskId, {
                ...task,
                status: data.type === 'task.completed' ? 'completed' : 'failed',
                duration: data.duration || task.duration,
              });
            }
            return prev;
          });

          // Remove completed/failed tasks after 5 seconds
          setTimeout(() => {
            setTasks(prev => {
              const next = new Map(prev);
              next.delete(data.taskId);
              return next;
            });
          }, 5000);
        }
      } catch (error) {
        console.error('[LiveTaskMonitor] Failed to parse WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[LiveTaskMonitor] WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('[LiveTaskMonitor] WebSocket closed');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getCurrentDuration = (task: TaskData): number => {
    if (task.status === 'running') {
      return Date.now() - task.startTime;
    }
    return task.duration;
  };

  const taskArray = Array.from(tasks.values());
  const activeTasks = taskArray.filter(t => t.status === 'running');
  const recentTasks = taskArray.filter(t => t.status !== 'running');

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Live Task Monitor
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Active:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{activeTasks.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className={`w-2 h-2 rounded-full ${ws?.readyState === WebSocket.OPEN ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {ws?.readyState === WebSocket.OPEN ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>

      {taskArray.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No active tasks</p>
          <p className="text-sm mt-2">Tasks will appear when orchestrations run</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Active Tasks
              </h3>
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div 
                    key={task.taskId}
                    className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {task.step}
                        </span>
                      </div>
                      <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {formatDuration(getCurrentDuration(task))}
                      </div>
                    </div>

                    {task.model && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Model:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {task.model}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {task.provider}
                            </span>
                          </div>
                          {task.ucbScore !== undefined && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">UCB Score:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                {task.ucbScore.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {task.rateLimitScore !== undefined && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Rate Limit Score:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                {task.rateLimitScore}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Completed/Failed */}
          {recentTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Recent
              </h3>
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div 
                    key={task.taskId}
                    className={`border rounded-lg p-3 ${
                      task.status === 'completed'
                        ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {task.step}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {formatDuration(task.duration)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

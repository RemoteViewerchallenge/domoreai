import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface RateLimitData {
  provider: string;
  model: string;
  remaining: number;
  limit: number;
  resetTimestamp: number;
  isThrottled: boolean;
  timestamp: number;
}

interface Props {
  className?: string;
}

/**
 * Real-time Rate Limit Dashboard
 * 
 * Displays live rate limit status for all tracked models.
 * Updates via WebSocket events from the backend.
 * 
 * Features:
 * - Color-coded gauges per provider
 * - Real-time updates (no polling)
 * - Throttle warnings
 * - Reset time countdown
 */
export function RateLimitDashboard({ className = '' }: Props) {
  const [models, setModels] = useState<Map<string, RateLimitData>>(new Map());
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/vfs`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[RateLimitDashboard] WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Listen for rate limit update events
        if (data.type === 'ratelimit.update') {
          const key = `${data.provider}/${data.model}`;
          setModels(prev => new Map(prev).set(key, {
            provider: data.provider,
            model: data.model,
            remaining: data.remaining,
            limit: data.limit,
            resetTimestamp: data.resetTimestamp,
            isThrottled: data.isThrottled,
            timestamp: data.timestamp,
          }));
        }
      } catch (error) {
        console.error('[RateLimitDashboard] Failed to parse WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[RateLimitDashboard] WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('[RateLimitDashboard] WebSocket closed');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      openrouter: 'text-blue-600 dark:text-blue-400',
      google: 'text-green-600 dark:text-green-400',
      groq: 'text-purple-600 dark:text-purple-400',
      mistral: 'text-orange-600 dark:text-orange-400',
    };
    return colors[provider] || 'text-gray-600 dark:text-gray-400';
  };

  const getStatusColor = (remaining: number, limit: number, isThrottled: boolean): string => {
    if (isThrottled) return 'bg-red-500';
    const percent = (remaining / limit) * 100;
    if (percent > 50) return 'bg-green-500';
    if (percent > 20) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const formatResetTime = (resetTimestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const seconds = resetTimestamp - now;
    
    if (seconds <= 0) return 'Ready';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const modelArray = Array.from(models.values());
  
  // Group by provider
  const byProvider = modelArray.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, RateLimitData[]>);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Rate Limit Monitor
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${ws?.readyState === WebSocket.OPEN ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {ws?.readyState === WebSocket.OPEN ? 'Live' : 'Disconnected'}
        </div>
      </div>

      {modelArray.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No rate limit data yet</p>
          <p className="text-sm mt-2">Data will appear when API calls are made</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byProvider).map(([provider, providerModels]) => (
            <div key={provider} className="space-y-3">
              <h3 className={`text-lg font-semibold ${getProviderColor(provider)}`}>
                {provider.toUpperCase()}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providerModels.map((model) => {
                  const percent = (model.remaining / model.limit) * 100;
                  const statusColor = getStatusColor(model.remaining, model.limit, model.isThrottled);
                  
                  return (
                    <div 
                      key={`${model.provider}/${model.model}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={model.model}>
                            {model.model}
                          </p>
                        </div>
                        {model.isThrottled && (
                          <AlertTriangle className="w-4 h-4 text-red-500 ml-2 flex-shrink-0" />
                        )}
                        {!model.isThrottled && percent > 80 && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>{model.remaining} / {model.limit}</span>
                          <span>{percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`${statusColor} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Reset timer */}
                      {model.resetTimestamp > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          <Clock className="w-3 h-3" />
                          <span>Resets in {formatResetTime(model.resetTimestamp)}</span>
                        </div>
                      )}

                      {/* Status */}
                      {model.isThrottled && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                          ⚠️ Throttled
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

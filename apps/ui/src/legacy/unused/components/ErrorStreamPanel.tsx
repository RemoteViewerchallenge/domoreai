import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Clock, Filter } from 'lucide-react';

interface ErrorData {
  id: string;
  timestamp: number;
  provider: string;
  model?: string;
  role?: string;
  tools?: string[];
  errorType: string;
  statusCode?: number;
  message: string;
}

interface Props {
  className?: string;
  maxErrors?: number;
}

/**
 * Error Stream Panel
 * 
 * Displays last N errors with full context:
 * - Provider, model, role, tools used
 * - Error type and status code
 * - Timestamp
 * - Scrolling auto-update
 * 
 * Updates via WebSocket events:
 * - error.occurred
 */
export function ErrorStreamPanel({ className = '', maxErrors = 100 }: Props) {
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [filterErrorType, setFilterErrorType] = useState<string>('');

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/vfs`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[ErrorStreamPanel] WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'error.occurred') {
          const errorData: ErrorData = {
            id: `${data.timestamp}-${Math.random()}`,
            timestamp: data.timestamp || Date.now(),
            provider: data.provider,
            model: data.model,
            role: data.role,
            tools: data.tools,
            errorType: data.errorType,
            statusCode: data.statusCode,
            message: data.message || data.error || 'Unknown error',
          };

          setErrors(prev => {
            const next = [errorData, ...prev];
            // Keep only last N errors
            return next.slice(0, maxErrors);
          });
        }
      } catch (error) {
        console.error('[ErrorStreamPanel] Failed to parse WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[ErrorStreamPanel] WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('[ErrorStreamPanel] WebSocket closed');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [maxErrors]);

  const getErrorTypeColor = (errorType: string): string => {
    const colors: Record<string, string> = {
      rate_limit: 'text-yellow-600 dark:text-yellow-400',
      auth_failed: 'text-red-600 dark:text-red-400',
      timeout: 'text-orange-600 dark:text-orange-400',
      invalid_response: 'text-purple-600 dark:text-purple-400',
      network_error: 'text-blue-600 dark:text-blue-400',
    };
    return colors[errorType] || 'text-gray-600 dark:text-gray-400';
  };

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      openrouter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      google: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      groq: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      mistral: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[provider] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredErrors = errors.filter(error => {
    if (filterProvider && error.provider !== filterProvider) return false;
    if (filterErrorType && error.errorType !== filterErrorType) return false;
    return true;
  });

  const uniqueProviders = Array.from(new Set(errors.map(e => e.provider)));
  const uniqueErrorTypes = Array.from(new Set(errors.map(e => e.errorType)));

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          Error Stream
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Errors:</span>
            <span className="font-bold text-red-600 dark:text-red-400">{errors.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className={`w-2 h-2 rounded-full ${ws?.readyState === WebSocket.OPEN ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {ws?.readyState === WebSocket.OPEN ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Filters */}
      {errors.length > 0 && (
        <div className="flex gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Providers</option>
              {uniqueProviders.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>
          <select
            value={filterErrorType}
            onChange={(e) => setFilterErrorType(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Error Types</option>
            {uniqueErrorTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      )}

      {filteredErrors.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {errors.length > 0 ? (
            <>
              <Filter className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No errors match your filters</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No errors recorded</p>
              <p className="text-sm mt-2">Errors will appear here when they occur</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredErrors.map((error) => (
            <div 
              key={error.id}
              className="border border-red-200 dark:border-red-800 rounded-lg p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProviderColor(error.provider)}`}>
                        {error.provider}
                      </span>
                      <span className={`text-sm font-medium ${getErrorTypeColor(error.errorType)}`}>
                        {error.errorType}
                      </span>
                      {error.statusCode && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          HTTP {error.statusCode}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-2">
                      {error.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-600 dark:text-gray-400">
                      {error.model && (
                        <span>Model: <span className="font-medium">{error.model}</span></span>
                      )}
                      {error.role && (
                        <span>Role: <span className="font-medium">{error.role}</span></span>
                      )}
                      {error.tools && error.tools.length > 0 && (
                        <span>Tools: <span className="font-medium">{error.tools.join(', ')}</span></span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 ml-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(error.timestamp)}
                  </div>
                  <span>{formatTimeAgo(error.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

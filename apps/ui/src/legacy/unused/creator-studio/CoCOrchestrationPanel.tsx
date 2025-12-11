import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Play, Zap, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';

interface CoCOrchestrationPanelProps {
  className?: string;
}

/**
 * CoC (Chain of Command) Orchestration Panel
 * 
 * Provides UI for executing advanced multi-agent orchestrations using
 * the CoC package's bandit-based model & role selection.
 */
const CoCOrchestrationPanel: React.FC<CoCOrchestrationPanelProps> = ({ className = '' }) => {
  // Type guard helper
  const asString = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
  };

  const [spec, setSpec] = useState<string>(`# Example CoC Directive (YAML)
spec:
  - description: "Analyze codebase architecture"
    deliverable: "architecture.md"
    acceptanceCriteria: "Clear diagram and explanation"
  
  - description: "Write unit tests for core modules"
    deliverable: "tests/"
    acceptanceCriteria: "90%+ coverage"
`);
  
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const executeMutation = trpc.coc.executeDirective.useMutation();
  const tracesQuery = trpc.coc.getTraces.useQuery({ limit: 50 }, { 
    enabled: executing,
    refetchInterval: executing ? 1000 : false, // Poll every second while executing
  });
  const banditQuery = trpc.coc.getBanditState.useQuery(undefined, {
    refetchInterval: 5000, // Update bandit state every 5s
  });

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await executeMutation.mutateAsync({
        spec,
        meta: {
          userId: 'ui-user',
          timestamp: new Date().toISOString(),
        },
      });

      if (res.success) {
        setResult((res.result as unknown) as Record<string, unknown> | null);
      } else {
        setError(res.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className={`flex bg-[var(--color-background)] text-[var(--color-text)] font-mono text-xs h-full ${className}`}>
      {/* Main Panel */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-primary)]/50 p-4 bg-[var(--color-background-secondary)]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold text-[var(--color-primary)] uppercase tracking-wider">
              CoC Orchestration Engine
            </h2>
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            Advanced multi-agent orchestration with bandit-based model selection and role optimization
          </p>
        </div>

        {/* Spec Editor */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">
              Orchestration Spec (YAML/JSON)
            </label>
            <button
              onClick={() => void handleExecute()}
              disabled={executing}
              className={`flex items-center gap-2 px-4 py-2 rounded font-bold uppercase text-xs transition-all ${
                executing
                  ? 'bg-[var(--color-text-secondary)] text-[var(--color-background)] cursor-not-allowed'
                  : 'bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary)]/80 shadow-lg shadow-[var(--glow-primary)]'
              }`}
            >
              <Play size={14} />
              {executing ? 'Executing...' : 'Execute'}
            </button>
          </div>

          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            disabled={executing}
            className="flex-1 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded p-3 font-mono text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
            placeholder="Enter YAML or JSON spec..."
          />

          {/* Result/Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-500 mb-1">Error</p>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-500/50 rounded flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 overflow-auto">
                <p className="font-bold text-green-500 mb-1">Success</p>
                <pre className="text-xs text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Live Events & Bandit Stats */}
      <div className="w-96 border-l border-[var(--color-border)] flex flex-col bg-[var(--color-background-secondary)]">
        {/* Bandit State */}
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[var(--color-secondary)]" />
            <h3 className="font-bold text-[var(--color-secondary)] uppercase tracking-wider text-xs">
              Bandit State
            </h3>
          </div>
          
          {banditQuery.data ? (
            <div className="space-y-2 text-[10px]">
              <div>
                <p className="text-[var(--color-text-secondary)] mb-1">Model Bandit:</p>
                <div className="bg-[var(--color-background)]/50 p-2 rounded">
                  {banditQuery.data.modelBandit && typeof banditQuery.data.modelBandit === 'object' ? (
                    <p className="text-[var(--color-text)]">
                      {Object.keys(banditQuery.data.modelBandit as Record<string, unknown>).length} arms tracked
                    </p>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">No data yet</p>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-[var(--color-text-secondary)] mb-1">Role Bandit:</p>
                <div className="bg-[var(--color-background)]/50 p-2 rounded">
                  {banditQuery.data.roleBandit && typeof banditQuery.data.roleBandit === 'object' ? (
                    <p className="text-[var(--color-text)]">
                      {Object.keys(banditQuery.data.roleBandit as Record<string, unknown>).length} roles tracked
                    </p>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--color-text-secondary)]">Loading...</p>
          )}
        </div>

        {/* Live Event Traces */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <h3 className="font-bold text-[var(--color-primary)] uppercase tracking-wider text-xs mb-3">
            Live Events
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {tracesQuery.data?.events && tracesQuery.data.events.length > 0 ? (
              tracesQuery.data.events.map((event: Record<string, unknown>, i: number) => (
                <div
                  key={i}
                  className="bg-[var(--color-background)]/50 border border-[var(--color-border)] rounded p-2 text-[10px]"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[var(--color-primary)]">
                      {asString(event.event)}
                    </span>
                    <span className="text-[var(--color-text-secondary)] text-[9px]">
                      {new Date(asString(event.ts)).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {typeof event.taskId === 'string' && event.taskId && (
                    <p className="text-[var(--color-text-secondary)]">
                      Task: {event.taskId}
                    </p>
                  )}
                  
                  {typeof event.role === 'string' && event.role && (
                    <p className="text-[var(--color-text)]">
                      Role: <span className="text-[var(--color-secondary)]">{event.role}</span>
                    </p>
                  )}
                  
                  {typeof event.model === 'string' && event.model && (
                    <p className="text-[var(--color-text)]">
                      Model: <span className="text-[var(--color-success)]">{event.model}</span>
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                {executing ? 'Waiting for events...' : 'No events yet. Execute a directive to see live updates.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoCOrchestrationPanel;

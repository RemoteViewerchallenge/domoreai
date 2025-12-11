import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { Play, Settings, User } from 'lucide-react';

interface OrchestrationExecutorProps {
  className?: string;
}

/**
 * OrchestrationExecutor Component
 * 
 * Allows users to execute orchestrations with dynamic role assignments.
 * This demonstrates the key concept: Orchestrations are templates, roles are runtime actors.
 */
const OrchestrationExecutor: React.FC<OrchestrationExecutorProps> = ({ className = '' }) => {
  const { data: orchestrations } = trpc.orchestrationManagement.list.useQuery({});
  const { data: roles } = trpc.role.list.useQuery();
  const executeMutation = trpc.orchestrationManagement.execute.useMutation();

  const [selectedOrchestrationId, setSelectedOrchestrationId] = useState<string>('');
  const [selectedOrchestration, setSelectedOrchestration] = useState<any>(null);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [inputData, setInputData] = useState<string>('{}');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleOrchestrationSelect = (orchestrationId: string) => {
    const orch = orchestrations?.find((o) => o.id === orchestrationId);
    setSelectedOrchestrationId(orchestrationId);
    setSelectedOrchestration(orch);
    
    // Initialize role assignments for each step
    if (orch) {
      const assignments: Record<string, string> = {};
      orch.steps.forEach((step: any) => {
        assignments[step.name] = '';
      });
      setRoleAssignments(assignments);
    }
  };

  const handleExecute = async () => {
    if (!selectedOrchestrationId) {
      alert('Please select an orchestration');
      return;
    }

    try {
      setExecuting(true);
      
      // Filter out empty role assignments
      const filteredAssignments: Record<string, string> = {};
      Object.entries(roleAssignments).forEach(([stepName, roleId]) => {
        if (roleId) {
          filteredAssignments[stepName] = roleId;
        }
      });

      const input = JSON.parse(inputData);
      const result = await executeMutation.mutateAsync({
        orchestrationId: selectedOrchestrationId,
        input,
        roleAssignments: Object.keys(filteredAssignments).length > 0 ? filteredAssignments : undefined,
      });

      setExecutionResult(result);
      alert(`Orchestration execution started! ID: ${result.id}`);
    } catch (error: any) {
      alert(`Execution failed: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className={`flex flex-col bg-[var(--color-background)] text-[var(--color-text)] font-mono text-xs h-full ${className}`}>
      {/* Header */}
      <div className="border-b border-[var(--color-primary)]/50 p-4 bg-[var(--color-background-secondary)]">
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-lg font-bold text-[var(--color-primary)] uppercase tracking-wider">
            Orchestration Executor
          </h2>
        </div>
        <p className="text-[10px] text-[var(--color-text-secondary)]">
          Execute orchestrations with dynamic role assignments. Orchestrations are templates; roles are the actors.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Orchestration Selection */}
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-[var(--color-primary)]" />
            <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">
              Select Orchestration
            </label>
          </div>
          <select
            value={selectedOrchestrationId}
            onChange={(e) => handleOrchestrationSelect(e.target.value)}
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="">Choose an orchestration...</option>
            {orchestrations?.map((orch) => (
              <option key={orch.id} value={orch.id}>
                {orch.name} ({orch.steps.length} steps)
              </option>
            ))}
          </select>
        </div>

        {/* Role Assignments */}
        {selectedOrchestration && (
          <div className="border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[var(--color-primary)]" />
              <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">
                Assign Roles to Steps
              </label>
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mb-4 italic">
              Optional: Assign specific roles to each step. Leave empty for automatic fallback.
            </p>
            <div className="space-y-3">
              {selectedOrchestration.steps.map((step: any, index: number) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-900/50 text-[var(--color-primary)] flex items-center justify-center font-bold border border-[var(--color-primary)]/30 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--color-text)] mb-1">{step.name}</div>
                    <select
                      value={roleAssignments[step.name] || ''}
                      onChange={(e) =>
                        setRoleAssignments({ ...roleAssignments, [step.name]: e.target.value })
                      }
                      className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                    >
                      <option value="">Auto-select (fallback)</option>
                      {roles?.map((role: any) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Data */}
        {selectedOrchestration && (
          <div className="border border-[var(--color-border)] rounded bg-[var(--color-background-secondary)]/50 p-4">
            <label className="block text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider mb-3">
              Input Data (JSON)
            </label>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded p-3 font-mono text-xs h-32 focus:border-[var(--color-primary)] focus:outline-none"
              placeholder='{ "query": "your input here" }'
            />
          </div>
        )}

        {/* Execute Button */}
        {selectedOrchestration && (
          <button
            onClick={handleExecute}
            disabled={executing}
            className={`w-full py-3 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
              executing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 shadow-[var(--glow-primary)]'
            } text-white`}
          >
            <Play size={16} />
            {executing ? 'Executing...' : 'Execute Orchestration'}
          </button>
        )}

        {/* Execution Result */}
        {executionResult && (
          <div className="border border-[var(--color-success)]/50 rounded bg-[var(--color-success)]/10 p-4">
            <div className="text-xs font-semibold text-[var(--color-success)] mb-2">Execution Started!</div>
            <div className="text-[10px] text-[var(--color-text-secondary)] space-y-1">
              <div>Execution ID: <span className="text-[var(--color-text)]">{executionResult.id}</span></div>
              <div>Status: <span className="text-[var(--color-text)]">{executionResult.status}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrchestrationExecutor;

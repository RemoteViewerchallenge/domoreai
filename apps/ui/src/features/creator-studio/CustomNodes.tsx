import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Bot, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { OrchestrationStep, RoleConfig } from './types.js';
import SuperNode from './nodes/SuperNode.js';

// Helper to lookup role name for display
const getRoleName = (roleId: string | undefined, roles: RoleConfig[]) => {
  if (!roleId) return 'No Role Assigned';
  const role = roles.find(r => r.id === roleId);
  return role ? role.name : 'Unknown Role';
};

/**
 * Standard Agent Node
 * Visualizes a worker doing a task.
 */
const AgentNode = ({ data, selected }: NodeProps<{ step: OrchestrationStep, roles: RoleConfig[] }>) => {
  const assignedRole = data.roles.find(r => r.id === data.step.assignedRoleId);

  return (
    <div className={`w-64 shadow-lg rounded-lg border-2 bg-[var(--color-background-secondary)] transition-colors ${selected ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
      <div className="flex items-center px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-background)] rounded-t-lg">
        <Bot className="w-4 h-4 text-[var(--color-primary)] mr-2" />
        <span className="font-semibold text-[var(--color-text)] text-sm">{data.step.label}</span>
      </div>
      <div className="p-4">
        <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Assigned Role</div>
        <div className="text-sm text-[var(--color-text)] font-medium truncate">
          {assignedRole ? assignedRole.name : 'Unknown Role'}
        </div>
        
        {/* NEW: Command Data Display */}
        {assignedRole && (
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]/50">
             <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
                <span>Model:</span>
                <span className="font-mono text-[var(--color-primary)]">{assignedRole.currentModel || 'Auto'}</span>
             </div>
             {assignedRole.scope && (
               <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] mt-1">
                  <span>Scope:</span>
                  <span className="truncate max-w-[100px]" title={assignedRole.scope}>{assignedRole.scope}</span>
               </div>
             )}
          </div>
        )}

        {/* Input Preview (implied complexity indicator) */}
        {Object.keys(data.step.inputMapping).length > 0 && (
          <div className="mt-3 flex gap-1 flex-wrap">
            {Object.keys(data.step.inputMapping).map(key => (
              <span key={key} className="px-2 py-0.5 rounded-full bg-[var(--color-background)] text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {key}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-text-secondary)] !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-primary)] !w-3 !h-3" />
    </div>
  );
};

/**
 * Judge / Quality Gate Node
 * Visualizes a decision point with Conditional Logic handles.
 */
const JudgeNode = ({ data, selected }: NodeProps<{ step: OrchestrationStep, roles: RoleConfig[] }>) => {
  return (
    <div className={`w-64 shadow-xl rounded-lg border-2 bg-[var(--color-background)] ${selected ? 'border-[var(--color-warning)]' : 'border-[var(--color-warning)]/50'}`}>
      <div className="flex items-center px-4 py-2 border-b border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 rounded-t-lg">
        <Scale className="w-4 h-4 text-[var(--color-warning)] mr-2" />
        <span className="font-semibold text-[var(--color-text)] text-sm">{data.step.label}</span>
      </div>
      <div className="p-4 relative">
        <div className="text-xs text-[var(--color-warning)]/70 uppercase tracking-wider mb-1">Evaluator</div>
        <div className="text-sm text-[var(--color-text)] font-medium truncate mb-2">
           {getRoleName(data.step.assignedRoleId, data.roles)}
        </div>
        
        <div className="flex justify-between items-center mt-4 text-[10px] font-mono">
          <span className="text-[var(--color-error)] flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> REJECT</span>
          <span className="text-[var(--color-success)] flex items-center">APPROVE <CheckCircle2 className="w-3 h-3 ml-1"/></span>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="!bg-[var(--color-text-secondary)] !w-3 !h-3" />
      
      {/* Two outputs for branching logic */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="false"
        className="!bg-[var(--color-error)] !w-3 !h-3 !-left-1.5" 
        style={{ top: '70%' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true"
        className="!bg-[var(--color-success)] !w-3 !h-3 !-right-1.5" 
        style={{ top: '70%' }}
      />
    </div>
  );
};

export const nodeTypes = {
  agent: memo(AgentNode),
  judge: memo(JudgeNode),
  manager: memo(AgentNode),
  superNode: memo(SuperNode),
};

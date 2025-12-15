import React, { useState } from 'react';
import type { OrchestrationStep, RoleConfig } from './types.js';
import { Settings, Workflow } from 'lucide-react';

interface InspectorPanelProps {
  selectedStep: OrchestrationStep | null;
  availableRoles: RoleConfig[];
  onUpdateStep: (stepId: string, updates: Partial<OrchestrationStep>) => void;
  onCreateRole: (role: RoleConfig) => void;
  onUpdateRole: (role: RoleConfig) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedStep,
  onUpdateStep,
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'role'>('flow');
  
  if (!selectedStep) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] p-8 text-center bg-[var(--color-background-secondary)] border-l border-[var(--color-border)]">
        <div>
          <Workflow className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Select a node to configure its Logic and Assigned Role.</p>
        </div>
      </div>
    );
  }

  const assignedRole = undefined; // availableRoles.find(r => r.id === selectedStep.assignedRoleId);

  // -- handlers --
  
  // Role handling removed
  /*
  const handleRoleChange = (roleId: string) => {
    if (roleId === 'new') {
      // Create a temporary new role and assign it
      const newRole: RoleConfig = {
        id: crypto.randomUUID(),
        name: `${selectedStep.label} Role`,
        description: 'Auto-generated role',
        modelProvider: 'openai',
        model: 'gpt-4',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        tools: []
      };
      onCreateRole(newRole);
      onUpdateStep(selectedStep.id, { assignedRoleId: newRole.id });
      setActiveTab('role'); // Switch to role editor
    } else {
      onUpdateStep(selectedStep.id, { assignedRoleId: roleId });
    }
  };
  */

  return (
    <div className="w-96 bg-[var(--color-background-secondary)] border-l border-[var(--color-border)] h-full flex flex-col shadow-2xl z-20">
      
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-[var(--color-text)] font-bold flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--color-primary)]" />
          Configuration
        </h2>
        <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-mono">{selectedStep.id}</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('flow')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'flow' ? 'text-[var(--color-primary)] bg-zinc-800/50 border-b-2 border-blue-500' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <Workflow className="w-4 h-4" />
          Flow & Inputs
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* --- TAB: FLOW CONFIGURATION --- */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            
            {/* 1. Step Metadata */}
            <div className="space-y-2">
              <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">Step Label</label>
              <input 
                type="text" 
                value={selectedStep.label}
                onChange={(e) => onUpdateStep(selectedStep.id, { label: e.target.value })}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none"
              />
            </div>

            {/* 2. Role Assignment (The Link) - Removed */}
            {/*
            <div className="space-y-2">
              <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">Assigned Role</label>
              <select 
                value={selectedStep.assignedRoleId || ''}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:border-[var(--color-secondary)] outline-none"
              >
                <option value="" disabled>Select a Role...</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
                <option value="new" className="text-[var(--color-primary)]">+ Create New Role</option>
              </select>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                The identity determines the model, system prompt, and tools.
              </p>
            </div>
            */}

            {/* 3. Inputs (Data Mapping) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase text-[var(--color-text-secondary)] font-semibold tracking-wider">Input Mapping</label>
                <button 
                  onClick={() => {
                     const key = prompt("Enter input variable name (e.g. 'code'):");
                     if(key) onUpdateStep(selectedStep.id, { 
                       inputMapping: { ...selectedStep.inputMapping, [key]: '{{context.previous.output}}' } 
                     });
                  }}
                  className="text-[10px] text-[var(--color-primary)] hover:underline"
                >
                  + Add Input
                </button>
              </div>
              
              <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded p-2 space-y-2">
                {Object.entries(selectedStep.inputMapping).length === 0 && (
                  <div className="text-xs text-[var(--color-text-secondary)] italic p-2 text-center">No inputs defined.</div>
                )}
                {Object.entries(selectedStep.inputMapping).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--color-primary)] font-mono">{key}:</span>
                    <input 
                      type="text" 
                      value={value}
                      onChange={(e) => onUpdateStep(selectedStep.id, { 
                        inputMapping: { ...selectedStep.inputMapping, [key]: e.target.value }
                      })}
                      className="w-full bg-[var(--color-background-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-success)] font-mono rounded px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Conditional Logic (If Judge) */}
            {selectedStep.type === 'judge' && (
               <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
                 <label className="text-xs uppercase text-[var(--color-warning)] font-semibold tracking-wider flex items-center gap-2">
                   <Settings className="w-3 h-3"/> Judge Logic
                 </label>
                 <div className="bg-[var(--color-warning)]/10 border border-amber-900/30 rounded p-3 space-y-3">
                   <div>
                     <span className="text-[10px] text-amber-400 block mb-1">Failure Condition (Regex)</span>
                     <input 
                       type="text" 
                       value={selectedStep.flowControl.conditionExpression || ''}
                       placeholder="e.g. contains('INVALID')"
                       onChange={(e) => onUpdateStep(selectedStep.id, { 
                         flowControl: { ...selectedStep.flowControl, conditionExpression: e.target.value } 
                       })}
                       className="w-full bg-[var(--color-background)] border border-amber-900/50 rounded p-1 text-xs text-[var(--color-text)] font-mono"
                     />
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* --- TAB: ROLE CONFIGURATION --- */}
        {activeTab === 'role' && assignedRole && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
             {/* Role configuration code which was commented out in original file mostly or depended on assignedRole which I mocked to undefined for safety as code was partial */}
          </div>
        )}

        {activeTab === 'role' && !assignedRole && (
          <div className="text-center text-[var(--color-text-secondary)] py-8">
            <p>No role assigned to this step.</p>
            {/* <button 
              onClick={() => handleRoleChange('new')}
              className="mt-2 text-[var(--color-secondary)] hover:underline text-sm"
            >
              Create One Now
            </button> */}
          </div>
        )}

      </div>
    </div>
  );
};

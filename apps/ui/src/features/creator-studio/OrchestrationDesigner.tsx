import React, { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  addEdge, 
  useNodesState, 
  useEdgesState,
} from 'reactflow';
import type { 
  Connection, 
  OnSelectionChangeParams 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FileJson, Download } from 'lucide-react';

import { nodeTypes } from './CustomNodes.js';
import { InspectorPanel } from './OrchestrationInspectorPanel.js';
import type { OrchestrationStep, RoleConfig } from './types.js';
import { trpc } from '../../utils/trpc.js';

export const OrchestrationDesigner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [orchestrationId, setOrchestrationId] = useState<string | null>(null);

  // Fetch Roles from Backend
  const { data: rolesData, refetch: refetchRoles } = trpc.role.list.useQuery();
  const roles: RoleConfig[] = (rolesData || []).map(r => ({
    id: r.id,
    name: r.name,
    description: '', // Backend role doesn't have description yet?
    modelProvider: 'openai', // Default or derived
    model: 'gpt-4', // Default or derived
    systemPrompt: r.basePrompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    temperature: ((r as any).defaultTemperature as number) || 0.7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: (r as any).tools || []
  }));

  // Mutations
  const createOrchestrationMutation = trpc.orchestrationManagement.create.useMutation();
  const updateOrchestrationMutation = trpc.orchestrationManagement.update.useMutation();
  const createRoleMutation = trpc.role.create.useMutation({
    onSuccess: () => {
      void refetchRoles(); // Refetch roles after creation
    }
  });
  const updateRoleMutation = trpc.role.update.useMutation({
    onSuccess: () => {
      void refetchRoles(); // Refetch roles after update
    }
  });

  // Effect to update node data when roles change
  useEffect(() => {
    if (roles.length > 0) {
      setNodes(nds => nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          roles: roles
        }
      })));
    }
  }, [roles, setNodes]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    if (nodes.length > 0) {
      setSelectedStepId(nodes[0].id);
    } else {
      setSelectedStepId(null);
    }
  }, []);

  // Handle JSON import
  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error('File content is not a string');
        }
        const data = JSON.parse(content);
        // Just load it - no validation
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.orchestrationId) {
            setOrchestrationId(data.orchestrationId);
          }
          alert('JSON imported successfully!');
        } else {
          alert('JSON loaded. Structure: ' + Object.keys(data).join(', '));
        }
      } catch (error) {
        alert(`Error reading or parsing file: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Update a step's data (and sync to Node data)
  const handleUpdateStep = (stepId: string, updates: Partial<OrchestrationStep>) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === stepId) {
        const updatedStep = { ...node.data.step, ...updates };
        return {
          ...node,
          data: {
            ...node.data,
            step: updatedStep,
            roles: roles // ensure roles are fresh
          }
        };
      }
      return node;
    }));
  };

  const handleCreateRole = async (newRole: RoleConfig) => {
    // Persist to backend
    await createRoleMutation.mutateAsync({
      name: newRole.name,
      basePrompt: newRole.systemPrompt,
      tools: newRole.tools
    });

    // Update any nodes that were temporarily assigned the temp ID - Logic removed as roles are decoupled
    /*
    setNodes(nds => nds.map(node => {
      if (node.data.step.assignedRoleId === newRole.id) {
        return {
          ...node,
          data: {
            ...node.data,
            step: {
              ...node.data.step,
              assignedRoleId: createdRole.id
            }
          }
        };
      }
      return node;
    }));
    */
  };

  const handleUpdateRole = async (updatedRole: RoleConfig) => {
    await updateRoleMutation.mutateAsync({
      id: updatedRole.id,
      name: updatedRole.name,
      basePrompt: updatedRole.systemPrompt,
      tools: updatedRole.tools
    });
  };

  const handleSave = async () => {
    const steps = nodes.map((node, index) => {
      const step = node.data.step as OrchestrationStep;
      return {
        name: step.label,
        order: index, // TODO: Calculate topological sort order
        stepType: step.type === 'judge' ? 'conditional' : 'sequential',
        condition: step.flowControl, // Store flow control in condition JSON
        inputMapping: step.inputMapping,
        parallelGroup: step.flowControl.parallelGroup
      };
    });

    if (orchestrationId) {
      await updateOrchestrationMutation.mutateAsync({
        id: orchestrationId,
        // steps update logic is complex in backend, might need separate mutation or full replace
      });
    } else {
      const newOrch = await createOrchestrationMutation.mutateAsync({
        name: `New Orchestration ${new Date().toISOString()}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps: steps as any // Cast to match backend expectation
      });
      setOrchestrationId(newOrch.id);
    }
    alert('Saved!');
  };

  // Export current state as JSON file
  const handleExportJson = () => {
    const exportData = {
      nodes,
      edges,
      orchestrationId,
      exportedAt: new Date().toISOString()
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orchestration-${orchestrationId || 'draft'}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Find the currently selected step object from the nodes
  const selectedNode = nodes.find(n => n.id === selectedStepId);
  const selectedStep = selectedNode ? selectedNode.data.step as OrchestrationStep : null;

  return (
    <div className="flex h-full w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[var(--color-background)]"
        >
          <Background color="var(--color-text-muted)" gap={16} className="opacity-20" />
          <Controls className="bg-[var(--color-background-secondary)] border-[var(--color-border)] fill-[var(--color-text-muted)]" />
        </ReactFlow>

        <div className="absolute top-4 left-4 z-10 bg-[var(--color-background-secondary)]/80 backdrop-blur p-4 rounded-lg border border-[var(--color-border)] shadow-xl">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
            Creator Studio
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Orchestration & Role Designer
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                const id = crypto.randomUUID();
                const newStep: OrchestrationStep = {
                  id,
                  label: 'New Step',
                  type: 'agent',
                  inputMapping: {},
                  flowControl: {},
                  position: { x: 100, y: 100 }
                };
                setNodes(nds => [...nds, {
                  id,
                  type: 'agent',
                  position: { x: 100, y: 100 },
                  data: { step: newStep, roles }
                }]);
              }}
              className="px-3 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-[var(--color-background)] rounded text-xs font-bold transition-all"
            >
              + Add Node
            </button>
            <button
              onClick={() => document.getElementById('orchestration-json-import')?.click()}
              className="px-3 py-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-[var(--color-background)] rounded text-xs font-bold transition-all flex items-center gap-1"
              title="Import JSON"
            >
              <FileJson size={14} />
            </button>
            <input
              type="file"
              id="orchestration-json-import"
              accept=".json"
              className="hidden"
              onChange={handleImportJson}
            />
            <button
              onClick={handleExportJson}
              className="px-3 py-1 bg-[var(--color-info)] hover:bg-[var(--color-info)]/80 text-[var(--color-background)] rounded text-xs font-bold transition-all flex items-center gap-1"
              title="Export as JSON"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => void handleSave()}
              className="px-3 py-1 bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-[var(--color-background)] rounded text-xs font-bold transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Right Inspector Panel */}
      <InspectorPanel
        selectedStep={selectedStep}
        availableRoles={roles}
        onUpdateStep={handleUpdateStep}
        onCreateRole={(role) => void handleCreateRole(role)}
        onUpdateRole={(role) => void handleUpdateRole(role)}
      />
    </div>
  );
};

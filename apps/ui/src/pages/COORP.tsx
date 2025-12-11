import { useState } from 'react';
import { Plus, Trash2, Bot } from 'lucide-react';
import { AiButton } from '../../NUI/ui/AiButton.js';

/**
 * COORP (Cognitive Orchestration & Routing Platform) Page
 * Visual graph interface for managing AI orchestration nodes and edges
 */
export default function COORP() {
  const [nodes, setNodes] = useState<Array<{ id: string; x: number; y: number; label: string }>>([
    { id: '1', x: 100, y: 100, label: 'Start' },
    { id: '2', x: 300, y: 100, label: 'Process' },
    { id: '3', x: 500, y: 100, label: 'End' },
  ]);

  const handleAddNode = () => {
    const newId = String(Date.now());
    setNodes((prev) => [
      ...prev,
      {
        id: newId,
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 300,
        label: `Node ${prev.length + 1}`,
      },
    ]);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAiResult = (result: { success: boolean; message: string; data?: Record<string, unknown> }) => {
    console.log('AI Result:', result);
    // TODO: Handle AI result - could update node, create new nodes, etc.
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      {/* Header */}
      <div className="flex-none h-12 bg-[var(--color-background-secondary)] border-b border-[var(--color-border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot size={24} className="text-[var(--color-primary)]" />
          <h1 className="text-lg font-bold tracking-wider">COORP</h1>
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Cognitive Orchestration Platform
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNode}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 transition-colors"
          >
            <Plus size={14} />
            Add Node
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto bg-[var(--color-background)]">
        <div className="absolute inset-0 p-8">
          {/* Grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(var(--color-border) 1px, transparent 1px),
                linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              opacity: 0.2,
            }}
          />

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute flex flex-col gap-2 p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded shadow-lg"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                minWidth: '150px',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--color-text)]">{node.label}</span>
                <button
                  onClick={() => handleDeleteNode(node.id)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
                  aria-label="Delete node"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">ID: {node.id}</div>
              <div className="flex justify-end">
                <AiButton
                  source={{ type: 'coorp-node', nodeId: node.id }}
                  onResult={handleAiResult}
                />
              </div>
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-[var(--color-text-muted)]">
                <Bot size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No nodes yet. Click &quot;Add Node&quot; to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none h-8 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] flex items-center justify-between px-4">
        <span className="text-xs text-[var(--color-text-muted)]">{nodes.length} nodes</span>
        <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
          Feature Preview
        </span>
      </div>
    </div>
  );
}

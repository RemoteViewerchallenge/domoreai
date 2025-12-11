import React, { useState, useEffect } from 'react';
import { trpc } from '../../utils/trpc';
import { callVoid } from '../../lib/callVoid.js';
import { Sparkles, Save, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  category?: string;
}

export const WorkspaceSettings: React.FC = () => {
  const utils = trpc.useContext();
  
  // Fetch current workspace (assuming single workspace for now)
  const { data: workspace, isLoading } = trpc.workspace.getCurrent.useQuery();
  
  const updateWorkspaceMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
        utils.workspace.getCurrent.invalidate();
        alert('Workspace settings saved!');
    }
  });

  const generatePromptMutation = trpc.role.generatePrompt.useMutation();
  
  // Fetch roles for the dropdowns
  const { data: rolesList } = trpc.role.list.useQuery();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = (rolesList || []) as any[];

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isRoleAssignmentOpen, setIsRoleAssignmentOpen] = useState(false);

  const uniqueCategories = React.useMemo(() => {
    const categories = new Set<string>();
    roles.forEach(role => {
      if (role.category) categories.add(role.category);
    });
    return Array.from(categories).sort();
  }, [roles]);

  const filteredRoles = React.useMemo(() => {
    if (!selectedCategory) return roles;
    return roles.filter(role => role.category === selectedCategory);
  }, [roles, selectedCategory]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);

  useEffect(() => {
    if (workspace) {
      setSystemPrompt(workspace.systemPrompt || '');
    }
  }, [workspace]);

  const handleSave = () => {
    if (!workspace) return;
    callVoid(() => updateWorkspaceMutation.mutate({
      id: workspace.id,
      systemPrompt
    }));
  };

  const handleMagicGenerate = async () => {
    try {
      const result = await generatePromptMutation.mutateAsync({
        name: "Project System Prompt",
        goal: "Create a comprehensive system prompt for this project that defines coding standards, architectural patterns, and project-specific context.",
        tools: [] 
      });
      if (result.prompt) {
        setSystemPrompt(result.prompt);
      }
    } catch (e) {
      console.error("Failed to generate prompt:", e);
      alert("Failed to generate prompt.");
    }
  };

  if (isLoading) return <div className="p-4 text-[var(--color-text-muted)]">Loading workspace settings...</div>;

  return (
    <div className="h-full w-full bg-[var(--color-background)] text-[var(--color-text)] flex flex-col font-mono text-xs overflow-y-auto p-4 relative">
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
        Workspace Settings
      </h2>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Add Provider</h3>
              <button
                onClick={() => setShowAddProvider(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider Types */}
                <button
                  onClick={() => {
                    // TODO: Implement provider addition logic
                    // For now just close
                    setShowAddProvider(false);
                  }}
                  className="p-4 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)] transition-all text-left group"
                >
                  <div className="font-bold text-[var(--color-primary)] mb-1 group-hover:translate-x-1 transition-transform">OpenAI</div>
                  <div className="text-xs text-[var(--color-text-muted)]">GPT-4, GPT-3.5 Turbo</div>
                </button>
                
                <button
                  onClick={() => setShowAddProvider(false)}
                  className="p-4 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)] transition-all text-left group"
                >
                  <div className="font-bold text-[var(--color-primary)] mb-1 group-hover:translate-x-1 transition-transform">Anthropic</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Claude 3 Opus, Sonnet, Haiku</div>
                </button>

                <button
                  onClick={() => setShowAddProvider(false)}
                  className="p-4 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)] transition-all text-left group"
                >
                  <div className="font-bold text-[var(--color-primary)] mb-1 group-hover:translate-x-1 transition-transform">Google AI</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Gemini Pro, Ultra</div>
                </button>

                <button
                  onClick={() => setShowAddProvider(false)}
                  className="p-4 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)] transition-all text-left group"
                >
                  <div className="font-bold text-[var(--color-primary)] mb-1 group-hover:translate-x-1 transition-transform">OpenRouter</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Aggregator for various models</div>
                </button>
                
                <button
                  onClick={() => setShowAddProvider(false)}
                  className="p-4 border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] hover:bg-[var(--color-background-secondary)] transition-all text-left group"
                >
                  <div className="font-bold text-[var(--color-primary)] mb-1 group-hover:translate-x-1 transition-transform">Local AI</div>
                  <div className="text-xs text-[var(--color-text-muted)]">Ollama, LM Studio, LocalAI</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Data Providers Section */}
        <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]/50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase">Data Providers</h3>
            <button
              onClick={() => setShowAddProvider(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-[var(--color-background)] rounded text-xs font-bold uppercase shadow-[0_0_15px_rgba(var(--color-success-rgb),0.6)] transition-all"
            >
              <Plus size={14} />
              Add Provider
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Add data sources to your workspace. Providers can be API endpoints, databases, or other data sources.
          </p>
        </div>

        {/* Default Role Assignment (Collapsible) */}
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-background-secondary)]/50 overflow-hidden">
            <button 
                onClick={() => setIsRoleAssignmentOpen(!isRoleAssignmentOpen)}
                className="w-full flex justify-between items-center p-4 hover:bg-[var(--color-background-secondary)] transition-colors"
            >
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase">Default Role Assignment</h3>
                {isRoleAssignmentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isRoleAssignmentOpen && (
                <div className="p-4 pt-0 border-t border-[var(--color-border)] mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Category</label>
                            <select 
                                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                value={selectedCategory}
                            >
                                <option value="">All Categories</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Role</label>
                            <select 
                                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded font-mono text-xs focus:border-[var(--color-primary)] focus:outline-none"
                                disabled={!selectedCategory && roles.length > 100} // Optional optimization
                            >
                                <option value="">Select Role</option>
                                {filteredRoles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* System Prompt Section */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Project System Prompt</label>
            <button
              onClick={() => callVoid(handleMagicGenerate)}
              disabled={generatePromptMutation.isLoading}
              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white text-[10px] font-bold rounded hover:opacity-80 transition-all"
            >
              <Sparkles size={12} />
              {generatePromptMutation.isLoading ? 'GENERATING...' : 'MAGIC GENERATE'}
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            This prompt will be injected into ALL agents working within this workspace. Use it to define global coding standards, project architecture, and rules.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none font-mono text-sm resize-none rounded-lg leading-relaxed"
            placeholder="Enter project-specific instructions here..."
          />
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => callVoid(handleSave)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-[var(--color-background)] font-bold rounded shadow-lg shadow-[var(--color-primary)]/20 transition-all"
          >
            <Save size={16} />
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};

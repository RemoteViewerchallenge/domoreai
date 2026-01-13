import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Code, Globe, Terminal, Settings, Folder, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SmartEditor from '../SmartEditor.js';
import { SmartTerminal } from '../SmartTerminal.js';
import { SmartBrowser } from '../SmartBrowser.js';
import { useCardVFS } from '../../hooks/useCardVFS.js';
import { FileExplorer } from '../FileExplorer.js';
import { type CardAgentState } from '../settings/AgentSettings.js'; 
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { trpc } from '../../utils/trpc.js';
import type { TerminalMessage } from '@repo/common/agent';
import { RoleEditorCard } from './RoleEditorCard.js';
import { cn } from '../../lib/utils.js';

export const SwappableCard = memo(({ id }: { id: string }) => {
  const { 
    currentPath, navigateTo, readFile, writeFile, 
    files, refresh, createNode, ingestDirectory, 
    loadChildren 
  } = useCardVFS(id);
  
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
  const updateCard = useWorkspaceStore(s => s.updateCard);
  const startSessionMutation = trpc.agent.startSession.useMutation();

  const agentConfig = useMemo(() => {
    const meta = card?.metadata as { agentConfig?: CardAgentState } | undefined;
    return meta?.agentConfig || {
      roleId: card?.roleId || '',
      modelId: null,
      isLocked: false,
      temperature: 0.7,
      maxTokens: 2048
    };
  }, [card]);

  const [activeFile, setActiveFile] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'terminal' | 'browser' | 'files' | 'config'>('editor');
  const [terminalLogs, setTerminalLogs] = useState<TerminalMessage[]>([]);
  const [sessionId] = useState(() => `session-${id}-${Date.now()}`);
  const [quickPrompt, setQuickPrompt] = useState('');

  useEffect(() => {
    if (activeFile && viewMode === 'editor') {
        void readFile(activeFile).then(setContent).catch(() => setContent('')); 
    }
  }, [activeFile, readFile, viewMode]);

  const handleSave = useCallback((val: string | undefined) => {
      if (val === undefined) return;
      setContent(val);
      if (activeFile) void writeFile(activeFile, val);
  }, [activeFile, writeFile]);

  const runAgent = useCallback(async (goal: string) => {
      if (!agentConfig.roleId) {
          toast.error("Role Required", { description: "Select a role first." });
          setViewMode('config');
          return;
      }
      toast.loading("Running Agent...", { id: 'agent-run' });
      try {
          const session = await startSessionMutation.mutateAsync({
              cardId: id,
              userGoal: goal,
              roleId: agentConfig.roleId,
              sessionId,
              modelConfig: {
                  modelId: agentConfig.modelId || undefined,
                  temperature: agentConfig.temperature,
                  maxTokens: agentConfig.maxTokens
              },
              context: { targetDir: currentPath }
          });
          toast.success("Done", { id: 'agent-run' });
          if (session.logs) {
              setTerminalLogs(p => [...p, ...session.logs.map(l => ({ message: l, type: 'info', timestamp: new Date().toISOString() } as TerminalMessage))]);
          }
          setViewMode('terminal');
      } catch (err) {
          toast.error("Failed", { id: 'agent-run', description: (err as Error).message });
      }
  }, [id, agentConfig, startSessionMutation, currentPath, sessionId]);

  // HOTKEY HANDLER
  const handleQuickPrompt = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          if (quickPrompt.trim()) {
              runAgent(quickPrompt);
              setQuickPrompt('');
          }
      }
  };

  return (
    <div className="flex h-full w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden relative flex-col">
      
      {/* 1. Header with Quick Prompt */}
      <div className="h-9 border-b border-[var(--border-color)] flex items-center px-2 bg-[var(--bg-secondary)] gap-2">
         {/* File Path */}
         <div className="flex-1 flex items-center bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] px-2 h-6">
            <span className="text-[var(--text-muted)] text-[10px] mr-1">/</span>
            <input 
                value={activeFile} 
                onChange={(e) => setActiveFile(e.target.value)}
                className="bg-transparent text-[10px] text-[var(--text-primary)] w-full outline-none font-mono placeholder:text-[var(--text-muted)]"
                placeholder="filename..."
            />
         </div>

         {/* AI Quick Prompt */}
         <div className="flex-[2] flex items-center bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] px-2 h-6 focus-within:border-[var(--color-primary)] transition-colors">
            <Sparkles size={10} className="text-[var(--color-primary)] mr-2" />
            <input 
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                onKeyDown={handleQuickPrompt}
                className="bg-transparent text-[10px] text-[var(--text-primary)] w-full outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Shift+Enter to run agent..."
            />
         </div>

         {/* View Toggles */}
         <div className="flex gap-0.5">
            {[
                { id: 'files', icon: Folder },
                { id: 'editor', icon: Code },
                { id: 'terminal', icon: Terminal },
                { id: 'browser', icon: Globe },
                { id: 'config', icon: Settings }
            ].map(t => (
                <button 
                    key={t.id}
                    onClick={() => setViewMode(t.id as any)} 
                    className={cn(
                        "p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)]",
                        viewMode === t.id && "text-[var(--color-primary)] bg-[var(--bg-primary)]"
                    )}
                >
                    <t.icon size={12} />
                </button>
            ))}
         </div>
      </div>

      {/* 2. Content */}
      <div className="flex-1 relative overflow-hidden bg-[var(--bg-background)]">
         {viewMode === 'config' && <RoleEditorCard id={id} initialRoleId={agentConfig.roleId} onUpdateConfig={() => {}} onClose={() => setViewMode('editor')} />}
         {viewMode === 'editor' && <SmartEditor fileName={activeFile} content={content} onChange={handleSave} onRun={() => runAgent(quickPrompt)} />}
         {viewMode === 'files' && <FileExplorer files={files} currentPath={currentPath} onNavigate={navigateTo} onSelect={(p) => { setActiveFile(p); if(!p.endsWith('/')) setViewMode('editor'); }} onCreateNode={createNode} onRefresh={refresh} onEmbedDir={ingestDirectory} onLoadChildren={loadChildren} className="p-2"/>}
         {viewMode === 'terminal' && <SmartTerminal workingDirectory={currentPath} logs={terminalLogs} onInput={(msg) => runAgent(msg)} />}
         {viewMode === 'browser' && <SmartBrowser url={(card?.metadata as any)?.url || 'https://google.com'} />}
      </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
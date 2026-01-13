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
import { CardTaskApproval } from './CardTaskApproval.js';
import MonacoDiffEditor from '../MonacoDiffEditor.js';
import { cn } from '../../lib/utils.js';

export const SwappableCard = memo(({ id }: { id: string }) => {
  const { 
    currentPath, navigateTo, readFile, writeFile, 
    files, refresh, createNode, ingestDirectory, 
    loadChildren 
  } = useCardVFS(id);
  
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
  // Removed unused updateCard variable
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
  const [viewMode, setViewMode] = useState<'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config'>('editor');
  const [terminalLogs, setTerminalLogs] = useState<TerminalMessage[]>([]);
  const [sessionId] = useState(() => `session-${id}-${Date.now()}`);
  const [quickPrompt, setQuickPrompt] = useState('');
  
  // Visual Check State
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [pendingGoal, setPendingGoal] = useState('');

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
           if (quickPrompt.trim()) {
              void runAgent(quickPrompt);
              setQuickPrompt('');
          }
          }
      }
      // Demo: Trigger Visual Check with Cmd/Win + Enter
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (quickPrompt.trim()) {
            setPendingGoal(quickPrompt);
            setIsWaitingApproval(true);
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
                    onClick={() => setViewMode(t.id as 'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config')} 
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
         {viewMode === 'editor' && <SmartEditor fileName={activeFile} content={content} onChange={handleSave} onRun={() => void runAgent(quickPrompt)} />}
         {viewMode === 'diff' && (
            <div className="h-full w-full flex flex-col">
                <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
                    <span className="text-xs font-bold text-zinc-400">Diff View: {activeFile}</span>
                    <button onClick={() => setViewMode('editor')} className="text-[10px] text-blue-400 hover:underline">Close Diff</button>
                </div>
                <div className="flex-1 min-h-0">
                    <MonacoDiffEditor 
                        original={`// Previous version of ${activeFile}\n\n${content}`} 
                        modified={content + '\n// New changes applied by agent'} 
                        language="typescript" 
                    />
                </div>
            </div>
         )}
         {viewMode === 'files' && <FileExplorer files={files} currentPath={currentPath} onNavigate={(p) => void navigateTo(p)} onSelect={(p) => { setActiveFile(p); if(!p.endsWith('/')) setViewMode('editor'); }} onCreateNode={(t, n) => void createNode(t, n)} onRefresh={() => void refresh()} onEmbedDir={(p) => void ingestDirectory(p)} onLoadChildren={loadChildren} className="p-2"/>}
         {viewMode === 'terminal' && <SmartTerminal workingDirectory={currentPath} logs={terminalLogs} onInput={(msg) => void runAgent(msg)} />}
          {viewMode === 'browser' && <SmartBrowser url={(card?.metadata as { url?: string })?.url || 'https://google.com'} />}
          
          {/* Approval Overlay */}
          {isWaitingApproval && (
            <CardTaskApproval 
                taskId={`task-${Date.now()}`}
                roleName={agentConfig.roleId || 'Agent'}
                intent={pendingGoal}
                onApprove={() => {
                    setIsWaitingApproval(false);
                    void runAgent(pendingGoal);
                    setQuickPrompt('');
                    toast.success("Change Approved", { description: "Agent proceeding with execution." });
                }}
                onReject={(reason) => {
                    setIsWaitingApproval(false);
                    toast.error("Change Rejected", { description: reason });
                }}
                onInspect={() => {
                    setViewMode('diff');
                    setIsWaitingApproval(false); // Hide the card so we can see the diff
                }}
            />
          )}
       </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
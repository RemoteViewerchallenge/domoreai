import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Code, Globe, Terminal, Settings, Folder } from 'lucide-react';
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

  // Initialize state from persisted metadata or defaults
  const [activeFile, setActiveFile] = useState<string>(() => {
      const meta = card?.metadata as { activeFile?: string } | undefined;
      return meta?.activeFile || '';
  });
  
  const [browserUrl, setBrowserUrl] = useState(() => {
      const meta = card?.metadata as { url?: string } | undefined;
      return meta?.url || "https://google.com";
  });

  const [content, setContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config'>('editor');
  const [terminalLogs, setTerminalLogs] = useState<TerminalMessage[]>([]);
  const [sessionId] = useState(() => `session-${id}-${Date.now()}`);

  const updateCard = useWorkspaceStore(s => s.updateCard);

  // Persistence: Save activeFile and browserUrl to store whenever they change
  useEffect(() => {
      // Access fresh state directly to avoid dependency loops with 'card' object
      const currentCard = useWorkspaceStore.getState().cards.find(c => c.id === id);
      updateCard(id, { 
          metadata: { 
              ...(currentCard?.metadata || {}), 
              activeFile, 
              url: browserUrl 
          } 
      });
  }, [activeFile, browserUrl, id, updateCard]);

  // Auto-Create Default Session File if needed
  useEffect(() => {
     if (!activeFile && viewMode === 'editor') {
         const defaultPath = `/home/guy/mono/.nebula/sessions/${id}.md`;
         void writeFile(defaultPath, '').then(() => {
             setActiveFile(defaultPath);
         }).catch(() => {
             // If directory doesn't exist, we might need to create it. 
             // We can optimistically set it, and file system will error only mostly on write.
             // But let's try to set it so user isn't stuck in limbo.
             setActiveFile(defaultPath);
         });
     }
  }, [activeFile, viewMode, id, writeFile]);


  // Auto-switch view based on file extension or URL
  useEffect(() => {
    if (activeFile) {
        if (activeFile.startsWith('http')) {
            setBrowserUrl(prev => prev === activeFile ? prev : activeFile);
            setViewMode(prev => prev === 'browser' ? prev : 'browser');
        } else if (/\.(png|jpg|jpeg|gif|svg)$/i.test(activeFile)) {
            // Future: SmartImageViewer
            setBrowserUrl(prev => {
                const newUrl = `file://${activeFile}`;
                return prev === newUrl ? prev : newUrl;
            });
            setViewMode(prev => prev === 'browser' ? prev : 'browser'); 
        } else if (/\.(html)$/i.test(activeFile)) {
             setBrowserUrl(prev => {
                const newUrl = `file://${activeFile}`;
                return prev === newUrl ? prev : newUrl;
             });
             setViewMode(prev => prev === 'browser' ? prev : 'browser');
        } else {
            setViewMode(prev => prev === 'editor' ? prev : 'editor');
            // Only read file if it changed, to avoid loops if readFile is unstable
            void readFile(activeFile).then(setContent).catch(() => setContent('')); 
        }
    }
  }, [activeFile, readFile]); // Removing viewMode dependency to prevent cycles

  const handleSave = useCallback((val: string | undefined) => {
      if (val === undefined) return;
      setContent(val);
      if (activeFile) void writeFile(activeFile, val);
  }, [activeFile, writeFile]);

  const runAgent = useCallback(async (goal: string, roleIdOverride?: string) => {
      const effectiveRoleId = roleIdOverride || agentConfig.roleId;
      console.log('[SwappableCard] Running agent with:', { effectiveRoleId, roleIdOverride, cardRole: agentConfig.roleId });
      
      if (!effectiveRoleId) {
          toast.error("Role Required", { description: "Select a role first." });
          setViewMode('config');
          return;
      }
      toast.loading("Running Agent...", { id: 'agent-run' });
      try {
          const session = await startSessionMutation.mutateAsync({
              cardId: id,
              userGoal: goal,
              roleId: effectiveRoleId,
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
  // Removed global hotkey handler (handleQuickPrompt) as it is now handled per-component.

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

         <div className="flex-1" />

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
                    type="button"
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
         {viewMode === 'config' && <RoleEditorCard 
            id={id} 
            initialRoleId={agentConfig.roleId} 
            onUpdateConfig={(config) => {
               // Update the card's metadata with the new agent config
               updateCard(id, {
                  metadata: {
                     ...card?.metadata,
                     agentConfig: {
                        roleId: config.roleId,
                        modelId: config.modelId,
                        temperature: config.temperature,
                        maxTokens: config.maxTokens,
                        isLocked: agentConfig.isLocked
                     }
                  }
               });
               toast.success('Role Configuration Updated');
            }} 
            onClose={() => setViewMode('editor')} 
         />}
         {viewMode === 'editor' && (
             <SmartEditor 
                fileName={activeFile} 
                content={content} 
                onChange={handleSave} 
                onRun={(goal, roleId) => void runAgent(goal || content, roleId)} 
                onNavigate={(url) => {
                    setBrowserUrl(url);
                    setViewMode('browser');
                }}
             />
         )}
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
         {viewMode === 'files' && <FileExplorer 
            files={files} 
            currentPath={currentPath} 
            onNavigate={(p) => void navigateTo(p)} 
            onSelect={(p) => { setActiveFile(p); if(!p.endsWith('/')) setViewMode('editor'); }} 
            onCreateNode={(t, n) => void createNode(t, n)} 
            onRefresh={() => void refresh()} 
            onEmbedDir={(p) => void ingestDirectory(p)} 
            onLoadChildren={loadChildren} 
            className="p-2"
            // Always allow saving current content to a new file (Save As behavior)
            activeContent={content}
            onSaveContent={(path, text) => {
                void (async () => {
                    await writeFile(path, text);
                    toast.success("Saved content to " + path.split('/').pop());
                    setActiveFile(path);
                    setViewMode('editor');
                })();
            }}
         />}
         {viewMode === 'terminal' && <SmartTerminal workingDirectory={currentPath} logs={terminalLogs} onInput={(msg) => void runAgent(msg)} />}
          {viewMode === 'browser' && <SmartBrowser url={(card?.metadata as { url?: string })?.url || 'https://google.com'} onUrlChange={setBrowserUrl} />}
       </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
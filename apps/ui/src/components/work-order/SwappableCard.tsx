
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  Code, Globe, Terminal, Settings, Folder
} from 'lucide-react';
import { toast } from 'sonner';
import { SmartMonacoEditor } from '../SmartMonacoEditor.js';
import { SmartTerminal } from '../SmartTerminal.js';
import { SmartBrowser } from '../SmartBrowser.js';
import { useCardVFS } from '../../hooks/useCardVFS.js';
import { FileExplorer } from '../FileExplorer.js';
import { type CardAgentState } from '../settings/AgentSettings.js'; 
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { trpc } from '../../utils/trpc.js';
import type { TerminalMessage } from '@repo/common/agent';
import { RoleEditorCard } from './RoleEditorCard.js';


export const SwappableCard = memo(({ id }: { id: string }) => {
  const { 
    currentPath, navigateTo, readFile, writeFile, 
    files, refresh, createNode, ingestDirectory, 
    loadChildren 
  } = useCardVFS(id);
  
  // External State & Actions
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));
  const updateCard = useWorkspaceStore(s => s.updateCard);
  
  // Agent Mutations
  const startSessionMutation = trpc.agent.startSession.useMutation();

  // Agent Config State
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

  const handleUpdateConfig = useCallback((newConfig: Partial<CardAgentState>) => {
    const merged = { ...agentConfig, ...newConfig };
    updateCard(id, { 
        roleId: newConfig.roleId ?? agentConfig.roleId,
        metadata: { ...card?.metadata, agentConfig: merged } 
    });
  }, [id, updateCard, card?.metadata, agentConfig]);

  // UI State
  const [activeFile, setActiveFile] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'terminal' | 'browser' | 'files' | 'config'>('editor');
  const [terminalLogs, setTerminalLogs] = useState<TerminalMessage[]>([]);
  // Persistent Session ID
  const [sessionId] = useState(() => `session-${id}-${Date.now()}`);

  // Load Content
  useEffect(() => {
    if (activeFile && viewMode === 'editor') {
        void readFile(activeFile).then(setContent).catch(() => setContent('')); 
    }
  }, [activeFile, readFile, viewMode]);

  const handleSave = useCallback((val: string | undefined) => {
      if (val === undefined) return;
      setContent(val);
      if (activeFile) {
          void writeFile(activeFile, val);
      }
  }, [activeFile, writeFile]);

  const runAgent = useCallback(async (goal: string) => {
      if (!agentConfig.roleId) {
          toast.error("Role Required", { description: "Please select a role in the settings before running." });
          setViewMode('config');
          return;
      }

      toast.loading("Starting Agent...", { id: 'agent-run' });
      
      try {
          // Construct Input
          const input = {
              cardId: id,
              userGoal: goal,
              roleId: agentConfig.roleId,
              sessionId, // Persistent Session
              modelConfig: {
                  modelId: agentConfig.modelId || undefined,
                  temperature: agentConfig.temperature,
                  maxTokens: agentConfig.maxTokens
              },
              context: {
                  targetDir: currentPath 
              }
          };

          const session = await startSessionMutation.mutateAsync(input);
          
          toast.success("Agent Finished", { id: 'agent-run' });
          
          // Append logs to terminal
          if (session.logs && session.logs.length > 0) {
              const logMessages: TerminalMessage[] = session.logs.map(l => ({
                  message: l,
                  type: 'info',
                  timestamp: new Date().toISOString()
              }));
              setTerminalLogs(prev => [...prev, ...logMessages]);
          }
           // Also show the result if available (Agent Service returns result separately from logs)
          if (session.result) {
                setTerminalLogs(prev => [...prev, {
                    message: `\n> ${session.result}\n`,
                    type: 'info',
                    timestamp: new Date().toISOString()
                }]);
          }
          // Switch to terminal
          setViewMode('terminal');

      } catch (err) {
          console.error(err);
          toast.error("Agent Failed", { id: 'agent-run', description: (err as Error).message });
      }
  }, [id, agentConfig, startSessionMutation, currentPath, sessionId]);

  const handleTerminalInput = useCallback((input: string) => {
      // Echo user command to log
      setTerminalLogs(prev => [...prev, {
          message: `$ ${input}`,
          type: 'command', 
          timestamp: new Date().toISOString()
      }]);
      // Run agent with this input
      void runAgent(input);
  }, [runAgent]);

  return (
    <div className="flex h-full w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl relative group">
      
      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Header */}
          <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900">
             
             {/* Left: Path & File Toggle */}
             <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center bg-black/40 rounded px-2 py-1 border border-zinc-800 flex-1 max-w-md">
                    <span className="text-zinc-500 text-xs mr-2 font-mono">/</span>
                    <input 
                        value={activeFile} 
                        onChange={(e) => setActiveFile(e.target.value)}
                        className="bg-transparent text-xs text-white w-full outline-none font-mono"
                        placeholder="Select or type filename..."
                    />
                </div>
             </div>

             {/* Right: Actions & Tools */}
             <div className="flex items-center gap-2">
                
                {/* Global View Switcher */}
                <div className="flex bg-black/40 rounded p-0.5 border border-zinc-800">
                    <button type="button" onClick={() => setViewMode('files')} className={`p-1.5 rounded ${viewMode === 'files' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`} title="Files"><Folder size={14}/></button>
                    <button type="button" onClick={() => setViewMode('editor')} className={`p-1.5 rounded ${viewMode === 'editor' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`} title="Code"><Code size={14}/></button>
                    <button type="button" onClick={() => setViewMode('terminal')} className={`p-1.5 rounded ${viewMode === 'terminal' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`} title="Terminal"><Terminal size={14}/></button>
                    <button type="button" onClick={() => setViewMode('browser')} className={`p-1.5 rounded ${viewMode === 'browser' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`} title="Browser"><Globe size={14}/></button>
                    <button type="button" onClick={() => setViewMode('config')} className={`p-1.5 rounded ${viewMode === 'config' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`} title="Role Settings"><Settings size={14}/></button>
                </div>
             </div>
          </div>

          {/* Content Layer */}
          <div className="flex-1 relative bg-black/50 overflow-hidden">
             
             {/* CONFIG (Role Editor) */}
             {viewMode === 'config' && (
                  <RoleEditorCard 
                     id={id} 
                     initialRoleId={agentConfig.roleId}
                     onUpdateConfig={handleUpdateConfig}
                     onClose={() => setViewMode('editor')}
                  />
             )}

             {/* Editor Layer */}
             {viewMode === 'editor' && (
                  <SmartMonacoEditor 
                    path={activeFile} 
                    value={content} 
                    onChange={handleSave} 
                  />
             )}
             
             {/* Tools */}
             {viewMode === 'files' && (
                <div className="h-full w-full bg-zinc-900/50">
                    <FileExplorer 
                        files={files} 
                        currentPath={currentPath}
                        onNavigate={navigateTo}
                        onSelect={(path) => {
                            setActiveFile(path);
                            // Auto-switch to editor when a file is selected
                            if (!path.endsWith('/')) { 
                                setViewMode('editor');
                            }
                        }}
                        onCreateNode={(type, name) => void createNode(type, name)}
                        onRefresh={() => void refresh()}
                        onEmbedDir={(path) => void ingestDirectory(path)}
                        onLoadChildren={loadChildren}
                        className="p-2"
                    />
                </div>
              )}
             {viewMode === 'terminal' && (
                <SmartTerminal 
                    workingDirectory={currentPath} 
                    logs={terminalLogs}
                    onInput={handleTerminalInput}
                />
             )}
             {viewMode === 'browser' && <SmartBrowser url={(card?.metadata as any)?.url || 'https://www.google.com'} />}

          </div>
      </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
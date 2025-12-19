import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { FileText, Code, FolderTree, Globe, Terminal, FileCode, Settings, Play, Paperclip, X } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js'; 
import { useCardVFS } from '../../hooks/useCardVFS.js';
import XtermTerminal from '../XtermTerminal.js';
import { BrowserCard } from '../BrowserCard.js';
import { AgentSettings, type CardAgentState } from '../settings/AgentSettings.js';
import { trpc } from '../../utils/trpc.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { useTheme } from '../../hooks/useTheme.js';
import { NEON_BUTTON_COLORS, getNeonColorForPath } from '../../utils/neonTheme.js';
import useIngestStore from '../../stores/ingest.store.js';
import useWebSocketStore from '../../stores/websocket.store.js';
import { SimpleErrorModal } from '../SimpleErrorModal.js';
import { CardAgentPrompt } from './CardAgentPrompt.js'; 
import { CardCustomButtons } from './CardCustomButtons.js';

type ComponentType = 'editor' | 'code' | 'browser' | 'terminal' | 'preview';

interface RoleWithPreferredModels {
  preferredModels?: {
    model?: {
      modelId: string;
    };
    adjustedParameters?: Record<string, unknown>;
  }[];
}

/**
 * SwappableCard - A multi-modal workspace component that can switch between
 * Editor, Code, Browser, and Terminal views.
 * 
 * Performance Note: Uses separate primitive selectors for card data from Zustand
 * to prevent infinite render loops and unnecessary updates.
 */
export const SwappableCard = React.memo(({ id, roleId }: { id: string; roleId?: string }) => {
  const { theme } = useTheme();

  // Select primitive values separately to ensure referential stability
  const storedTitle = useWorkspaceStore(useCallback((s) => s.cards.find((c) => c.id === id)?.title, [id]));
  const storedType = useWorkspaceStore(useCallback((s) => s.cards.find((c) => c.id === id)?.type, [id]));
  const storedTargetDir = useWorkspaceStore(useCallback((s) => s.cards.find((c) => c.id === id)?.metadata?.targetDir, [id]));

  const updateCard = useWorkspaceStore((state) => state.updateCard);

  const { 
    files, 
    currentPath, 
    navigateTo: navigate, 
    mkdir, 
    refresh, 
    loadChildren, 
    readFile, 
    writeFile, 
    createFile 
  } = useCardVFS(id);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  
  const wsStatus = useWebSocketStore(state => state.status);
  const wsActions = useWebSocketStore(state => state.actions);
  const storeLogs = useWebSocketStore(state => (state.messages || []).map(m => m.message));
  
  // Initialize state from store primitives
  const [cardTitle, setCardTitle] = useState(storedTitle || "New Task");
  const [targetDir, setTargetDir] = useState(storedTargetDir || "./src");
  const [type, setType] = useState<ComponentType>((storedType as ComponentType) || 'editor');

  // Helper to sync type changes to store immediately on user action
  const handleSetType = useCallback((newType: ComponentType) => {
      setType(newType);
      if (newType !== storedType) {
          updateCard(id, { type: newType });
      }
  }, [id, storedType, updateCard]);

  // View State (Editor vs File Tree vs Settings)
  const [viewMode, setViewMode] = useState<'editor' | 'files' | 'settings'>('editor');
  
  // Sync local title state to store with debounce
  useEffect(() => {
    if (storedTitle !== undefined && cardTitle !== storedTitle) {
      const timeout = setTimeout(() => {
        updateCard(id, { title: cardTitle });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [cardTitle, storedTitle, id, updateCard]);

  // Sync local targetDir state to store with debounce
  useEffect(() => {
    if (targetDir && storedTargetDir !== targetDir) {
       const timeout = setTimeout(() => {
         // Get latest metadata from store to avoid overwriting other fields
         const currentMetadata = useWorkspaceStore.getState().cards.find(c => c.id === id)?.metadata;
         updateCard(id, { metadata: { ...currentMetadata, targetDir } });
       }, 500);
       return () => clearTimeout(timeout);
    }
  }, [targetDir, storedTargetDir, id, updateCard]);

  // Track if we have auto-renamed this card yet
  const hasRunOnce = useRef(!!storedTitle && storedTitle !== "New Task");

  // Fetch available roles for the settings panel
  const { data: roles } = trpc.role.list.useQuery(undefined, { retry: 1 });
  
  // Fetch available models for the settings panel
  const { data: models } = trpc.model.list.useQuery(undefined, { retry: 1 });

  // Agent Configuration (inherits from role, can be overridden per card)
  const [agentConfig, setAgentConfig] = useState<CardAgentState>(() => {
    return {
      roleId: roleId || "",
      modelId: null,
      isLocked: false,
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    };
  });

  // Always select a role: if none is set, pick the first available role 
  const hasSetInitialRole = useRef(false);
  useEffect(() => {
    if (roles && roles.length > 0 && !agentConfig.roleId && !hasSetInitialRole.current) {
      setAgentConfig(prev => ({ ...prev, roleId: roles[0].id }));
      hasSetInitialRole.current = true;
    }
  }, [roles, agentConfig.roleId]);

  // Compute adjusted parameters for the current selection
  const currentRole = roles?.find(r => r.id === agentConfig.roleId);
  const currentModelConfig = (currentRole as any)?.preferredModels?.find((pm: any) => pm.model?.modelId === agentConfig.modelId);
  const adjustedParameters = currentModelConfig?.adjustedParameters;

  // Error State
  const [error, setError] = useState<string | null>(null);

  // Agent session mutation
  const startSessionMutation = trpc.agent.startSession.useMutation({
    onSuccess: (data) => {
      console.log('[Card] Agent session completed:', data);
      
      if (data.logs && data.logs.length > 0) {
        data.logs.forEach((msg: string) => {
            wsActions.addMessage({
                timestamp: new Date().toISOString(),
                type: 'info',
                message: msg
            });
        });
        handleSetType('terminal');
      }

      if (data.result) {
          setContent(prev => {
              const newContent = prev + '\n\n' + data.result;
              return newContent;
          });
          
          if (data.result.trim().startsWith('http')) {
             handleSetType('browser');
          }
      }

      if (data.modelId) {
          setAgentConfig(prev => ({
              ...prev,
              modelId: data.modelId,
              isLocked: true 
          }));
      }
    },
    onError: (err) => {
      console.error('[Card] Failed to start agent session:', err);
      setError(`Failed to start agent: ${err.message}`);
    },
  });

  const ingestDirectoryMutation = trpc.vfs.ingestDirectory.useMutation({
    onSuccess: () => {
      console.log('Ingestion started/completed successfully');
    },
    onError: (err) => {
      console.error('Ingestion failed:', err);
      setError(`Ingestion failed: ${err.message}`);
    },
    onSettled: () => {
      useIngestStore.getState().decrement();
    }
  });

  const isAiWorking = startSessionMutation.isLoading;

  const handleRunAgent = useCallback(() => {
    if (isAiWorking) return; 

    // Strip HTML to get plain text prompt
    const tmp = document.createElement("DIV");
    tmp.innerHTML = content;
    const prompt = tmp.textContent || tmp.innerText || "";
    
    if (!prompt.trim()) {
      setError('Please enter a prompt first');
      return;
    }

    if (!agentConfig.roleId) {
      setError('Please select a role in settings first');
      return;
    }

    // Auto-title on first run
    if (!hasRunOnce.current) {
        const cleanName = prompt.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 30).trim() || "New Task";
        setCardTitle(cleanName);
        hasRunOnce.current = true;
        updateCard(id, { title: cleanName });
    }

    startSessionMutation.mutate({
      roleId: agentConfig.roleId,
      modelConfig: {
        modelId: agentConfig.modelId || undefined,
        temperature: agentConfig.temperature,
        maxTokens: agentConfig.maxTokens,
      },
      userGoal: prompt,
      cardId: id,
      context: { targetDir }
    });
  }, [content, agentConfig, startSessionMutation, id, isAiWorking, updateCard, targetDir]);

  const handleAttachFile = useCallback(async (filePath: string) => {
    try {
      const fileContent = await readFile(filePath);
      const attachmentText = `\n\n---\n**Attached File: ${filePath}**\n\`\`\`\n${fileContent}\n\`\`\`\n---\n\n`;
      setContent(prev => prev + attachmentText);
      setShowAttachModal(false);
    } catch (err) {
      console.error('Failed to attach file:', err);
      setError(`Failed to attach file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [readFile]);

  const initializedRef = useRef<string | null>(null);
  useEffect(() => {
    if (initializedRef.current === id) return;
    
    const init = async () => {
        const basePath = currentPath === '.' ? 'workspace' : currentPath;
        const agentsDir = `${basePath}/agents`;
        const autoFileName = `${agentsDir}/card-${id}.md`;
        
        try {
            await mkdir(agentsDir).catch(() => {}); 
            try {
                const existing = await readFile(autoFileName);
                if (!activeFile) {
                    setActiveFile(autoFileName);
                    setContent(existing);
                }
            } catch {
                await createFile(autoFileName, `# Card ${id} Workspace\n\nAuto-generated session.`);
                if (!activeFile) {
                    setActiveFile(autoFileName);
                    setContent(`# Card ${id} Workspace\n\nAuto-generated session.`);
                }
            }
        } catch {
            console.error("FS Init Error");
        }
        
        initializedRef.current = id;
    };
    void init();
  }, [id, currentPath]);

  const menuItems = [
    { id: 'editor', icon: FileText, label: 'Write (Tiptap)' },
    { id: 'code', icon: Code, label: 'Code (Monaco)' },
    { id: 'browser', icon: Globe, label: 'Research (Browser)' },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
  ];

  const neonColor = getNeonColorForPath(currentPath);

  const viewSwitcher = (
    <div className="flex items-center gap-1 bg-[var(--color-background)] rounded p-0.5 border border-[var(--color-border)]">
        {menuItems.map((item) => (
        <button
            key={item.id}
            onClick={() => {
            handleSetType(item.id as ComponentType);
            setViewMode('editor');
            }}
            className={`p-1 rounded ${type === item.id ? 'bg-[var(--color-background-secondary)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
            title={item.label}
        >
            <item.icon size={14} />
        </button>
        ))}
    </div>
  );

  const isUniversalMode = viewMode === 'editor' && (type === 'browser' || type === 'terminal');
  
  return (
    <>
      <SimpleErrorModal 
        isOpen={!!error} 
        onClose={() => setError(null)} 
        error={error} 
      />
      
      <div 
        className="flex flex-col h-full w-full rounded overflow-hidden transition-all"
        style={{ 
          backgroundColor: theme.colors.cardBackground || theme.colors.backgroundSecondary,
          border: `2px solid ${theme.colors.cardBorder || neonColor}`,
          boxShadow: activeFile ? `0 0 20px ${theme.colors.primary.glow}` : `0 0 10px ${neonColor}40, inset 0 0 10px ${neonColor}20`
        }}
      >
        
        {!isUniversalMode && (
        <div 
          className="flex-none h-8 border-b flex items-center justify-between px-2"
          style={{
            backgroundColor: theme.colors.cardHeaderBackground || theme.colors.backgroundSecondary,
            borderColor: theme.colors.cardBorder || theme.colors.border
          }}
        >
          
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] overflow-hidden">
            <div 
              className="group relative px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-help flex-none"
              style={{ 
                backgroundColor: `${neonColor}20`,
                color: neonColor,
                border: `1px solid ${neonColor}60`
              }}
            >
              <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                {currentPath.split('/').pop() || '/'}
              </span>
              <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[9px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {currentPath}
              </div>
            </div>
            
            <div className="flex items-center gap-2 min-w-0">
                {viewMode === 'settings' ? (
                    <Settings size={14} className="text-[var(--color-primary)] flex-none" />
                ) : (type === 'editor' || type === 'code') ? (
                    activeFile?.endsWith('.md') ? <FileText size={14} className="text-[var(--color-primary)] flex-none" /> : <FileCode size={14} className="text-[var(--color-warning)] flex-none" />
                ) : (
                    (() => {
                        const Item = menuItems.find(m => m.id === type);
                        return Item ? <Item.icon size={14} className="flex-none" /> : null;
                    })()
                )}
                <span className="font-bold text-[var(--color-text)] truncate" title={cardTitle}>
                    {cardTitle}
                </span>
            </div>
          </div>
  
          <div className="flex items-center gap-2">
            {viewMode === 'editor' && type === 'editor' && (
              <>
                <button
                  onClick={handleRunAgent}
                  disabled={isAiWorking}
                  className={`p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all ${NEON_BUTTON_COLORS.run.bg} ${NEON_BUTTON_COLORS.run.hover} ${NEON_BUTTON_COLORS.run.text} ${NEON_BUTTON_COLORS.run.border} ${NEON_BUTTON_COLORS.run.glow}`}
                  title="Run Agent (Cmd/Ctrl + Enter)"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => setShowAttachModal(true)}
                  className={`p-1.5 rounded transition-all ${NEON_BUTTON_COLORS.attach.bg} ${NEON_BUTTON_COLORS.attach.hover} ${NEON_BUTTON_COLORS.attach.text} ${NEON_BUTTON_COLORS.attach.border} ${NEON_BUTTON_COLORS.attach.glow}`}
                  title="Attach File from VFS"
                >
                  <Paperclip size={14} />
                </button>
              </>
            )}
  
            <button
              onClick={() => setViewMode(viewMode === 'settings' ? 'editor' : 'settings')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'settings' 
                  ? `${NEON_BUTTON_COLORS.settings.bg} ${NEON_BUTTON_COLORS.settings.text} ${NEON_BUTTON_COLORS.settings.glow}`
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] hover:bg-[var(--color-background-secondary)]'
              }`}
              title="Toggle Settings"
            >
              <Settings size={14} />
            </button>
  
            {(type === 'editor' || type === 'code') && viewMode !== 'settings' && (
              <div className="flex items-center gap-1 bg-[var(--color-background)] rounded p-0.5 border border-[var(--color-border)]">
                <button 
                  onClick={() => setViewMode('editor')}
                  className={`p-1 rounded ${viewMode === 'editor' ? 'bg-[var(--color-background-secondary)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                  title="Editor View"
                >
                  <Code size={14} />
                </button>
                <button 
                  onClick={() => setViewMode('files')}
                  className={`p-1 rounded ${viewMode === 'files' ? 'bg-[var(--color-background-secondary)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                  title="Local File Explorer"
                >
                  <FolderTree size={14} />
                </button>
              </div>
            )}
  
            {viewSwitcher}
            
          </div>
        </div>
        )}
  
        <div className="flex-1 min-h-0 relative bg-[var(--color-background)]">

          {viewMode === 'settings' && (
            <div className="flex flex-col h-full w-full bg-zinc-950">
              <div className="px-3 pt-3 pb-0">
                  <label className="text-[10px] uppercase text-[var(--color-text-secondary)] font-bold mb-1 block">Target Directory</label>
                  <input
                      value={targetDir}
                      onChange={(e) => setTargetDir(e.target.value)}
                      placeholder="./src"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                  />
              </div>
            <AgentSettings 
              config={{ ...agentConfig, adjustedParameters }}
              availableRoles={roles?.map(r => ({ 
                id: r.id, 
                name: r.name, 
                category: (r.category as any)?.name || (typeof r.category === 'string' ? r.category : '') || 'Uncategorized' 
              })) || []}
              availableModels={models?.map((m: any) => ({
                  id: m.modelId,
                  name: m.name,
                  provider: m.provider.type,
                  capabilities: {
                      vision: m.hasVision,
                      reasoning: m.hasReasoning,
                      coding: m.hasCoding
                  },
                  supportsTools: m.supportsTools,
                  isUncensored: m.isUncensored,
                  costPer1k: m.costPer1k || undefined
              })) || []}
              onUpdate={setAgentConfig}
              fileSystem={{
                currentPath,
                onNavigate: (path) => navigate(path)
              }}
            />
            </div>
          )}
  
          {viewMode === 'editor' && (type === 'editor' || type === 'code') && (
            activeFile ? (
              <SmartEditor 
                fileName={activeFile} 
                content={content} 
                onChange={setContent} 
                isAiTyping={isAiWorking}
                onRun={handleRunAgent}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] gap-4">
                <div className="text-sm">No file selected</div>
                <button 
                  onClick={() => setViewMode('files')}
                  className="px-3 py-1.5 bg-[var(--color-background-secondary)] hover:bg-[var(--color-background)] text-[var(--color-text-secondary)] rounded text-xs border border-[var(--color-border)] transition-colors"
                >
                  Open File Explorer
                </button>
              </div>
            )
          )}
  
          {viewMode === 'files' && (
            <div className="h-full w-full p-2">
              <div className="text-[10px] uppercase text-[var(--color-text-muted)] mb-2 font-bold">Select file for Card {id}</div>
              <FileExplorer 
                files={files} 
                currentPath={currentPath}
                onNavigate={(p) => void navigate(p)}
                onCreateFolder={(p) => void mkdir(p)}
                onRefresh={refresh}
                onLoadChildren={loadChildren}
                onEmbedDir={() => {
                  useIngestStore.getState().increment(currentPath);
                  ingestDirectoryMutation.mutate({ path: currentPath, cardId: id });
                }}
                onSelect={async (path) => {
                  setActiveFile(path);
                  try {
                      const content = await readFile(path);
                      setContent(content);
                  } catch (e) {
                      console.error("Failed to read file", e);
                      setContent("// Failed to load content");
                  }
                  setViewMode('editor'); 
                }} 
              />
            </div>
          )}
  
          {viewMode === 'editor' && type === 'browser' && <BrowserCard headerEnd={viewSwitcher} />}
          {viewMode === 'editor' && type === 'terminal' && (
            <XtermTerminal 
              logs={storeLogs}
              workingDirectory={currentPath}
              onInput={(data) => {
                wsActions.sendMessage({ command: data });
              }}
              headerEnd={viewSwitcher}
            />
          )}
  
        </div>
        
        <div className="flex-none p-2 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)]">
          <div className="flex gap-2 justify-between items-center px-1 text-[10px]">
            <div className="text-[var(--color-text-muted)] flex-shrink-0">
              Role: <span className="text-[var(--color-text-secondary)]">{roles?.find(r => r.id === agentConfig.roleId)?.name || 'None'}</span> | 
              Temp: <span className="text-[var(--color-primary)]">{agentConfig.temperature}</span> | 
              Tokens: <span className="text-[var(--color-primary)]">{agentConfig.maxTokens}</span>
            </div>
            {isAiWorking && (
              <div className="text-[var(--color-success)] animate-pulse flex-shrink-0">● AI Working...</div>
            )}
            <div className="text-[var(--color-text-muted)] flex-shrink-0">
              WS: <span className={wsStatus === 'connected' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>{wsStatus}</span>
            </div>

            <div className="flex gap-1.5 ml-auto">
              <CardAgentPrompt
                cardId={id}
                cardContext={{
                  currentPath,
                  activeFile,
                  content,
                  type
                }}
                onSubmit={(prompt) => {
                  const contextPrompt = `
Context from Card ${id}:
- Current Path: ${currentPath}
- Active File: ${activeFile || 'None'}
- View Type: ${type}
${activeFile ? `- File Content:\n\`\`\`\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\`` : ''}

User Question: ${prompt}
`;
                  startSessionMutation.mutate({
                    roleId: agentConfig.roleId,
                    modelConfig: {
                      modelId: agentConfig.modelId || undefined,
                      temperature: agentConfig.temperature,
                      maxTokens: agentConfig.maxTokens,
                    },
                    userGoal: contextPrompt,
                    cardId: id,
                  });
                }}
                isLoading={isAiWorking}
              />

              <CardCustomButtons
                cardId={id}
                buttons={[]} 
                onExecute={(button) => {
                  if (button.action === 'command') {
                    wsActions.sendMessage({ command: button.actionData });
                    handleSetType('terminal');
                  } else if (button.action === 'url') {
                    window.open(button.actionData, '_blank');
                  } else if (button.action === 'agent') {
                    startSessionMutation.mutate({
                      roleId: agentConfig.roleId,
                      modelConfig: {
                        modelId: agentConfig.modelId || undefined,
                        temperature: agentConfig.temperature,
                        maxTokens: agentConfig.maxTokens,
                      },
                      userGoal: button.actionData,
                      cardId: id,
                    });
                  }
                }}
                onAddButton={() => {
                  alert('Button creator coming soon! Use Role Creator panel to create buttons.');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showAttachModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[600px] h-[500px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-200">Attach File from VFS</h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <FileExplorer 
                files={files}
                currentPath={currentPath}
                onNavigate={(p) => void navigate(p)}
                onCreateFolder={(p) => void mkdir(p)}
                onRefresh={refresh}
                onLoadChildren={loadChildren}
                onSelect={(path) => {
                  void handleAttachFile(path);
                }}
                className="h-full"
              />
            </div>

            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-[var(--color-text-secondary)]">
              Click on a file to attach it to your chat
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SwappableCard.displayName = 'SwappableCard';

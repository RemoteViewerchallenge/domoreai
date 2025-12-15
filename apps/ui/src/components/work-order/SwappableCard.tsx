import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Code, FolderTree, Globe, Terminal, FileCode, Settings, Play, Paperclip, X } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js'; 
import { useCardVFS } from '../../hooks/useCardVFS.js';
import XtermTerminal from '../XtermTerminal.js';
import BrowserCard from '../BrowserCard.js';
import { AgentSettings, type CardAgentState } from '../settings/AgentSettings.js';
import { trpc } from '../../utils/trpc.js';
import useIngestStore from '../../stores/ingest.store.js';
import { SimpleErrorModal } from '../SimpleErrorModal.js';
import useWebSocketStore from '../../stores/websocket.store.js';
import { getNeonColorForPath, NEON_BUTTON_COLORS } from '../../utils/neonTheme.js';
import { CardAgentPrompt } from './CardAgentPrompt.js';
import { CardCustomButtons } from './CardCustomButtons.js';
import { useTheme } from '../../hooks/useTheme.js';

type ComponentType = 'editor' | 'code' | 'browser' | 'terminal';

interface RoleWithPreferredModels {
  id: string;
  name: string;
  preferredModels?: {
    model?: {
      modelId: string;
    };
    adjustedParameters?: Record<string, unknown>;
  }[];
}

export const SwappableCard = ({ id, roleId }: { id: string; roleId?: string }) => {
  const { theme } = useTheme();
  // Use per-card VFS state instead of global context
  const { 
    files, 
    createFile, 
    readFile, 
    currentPath, 
    mkdir, 
    navigateTo: navigate, 
    refresh,
    loadChildren 
  } = useCardVFS(id);
  
  // Component Type State (for the main view switcher)
  const [type, setType] = useState<ComponentType>('editor');

  // View State (Editor vs File Tree vs Settings)
  const [viewMode, setViewMode] = useState<'editor' | 'files' | 'settings'>('editor');
  
  // File State
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const { messages: storeLogs, actions: wsActions, status: wsStatus } = useWebSocketStore();
  
  // Connect to WS on mount
  useEffect(() => {
      if (wsStatus === 'disconnected') {
          wsActions.connect('dummy-token'); // In real app, get token from auth
      }
  }, [wsStatus, wsActions]);

  // Title State
  const [cardTitle, setCardTitle] = useState(new Date().toLocaleString());
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch available roles for the settings panel
  const { data: roles } = trpc.role.list.useQuery();
  
  // Fetch available models for the settings panel
  const { data: models } = trpc.model.list.useQuery();

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

  // Always select a role: if none is set, pick the first available role and keep it until changed by user
  useEffect(() => {
    if (roles && roles.length > 0 && !agentConfig.roleId) {
      setAgentConfig(prev => ({ ...prev, roleId: roles[0].id }));
    }
  }, [roles, agentConfig.roleId]);

  // Compute adjusted parameters for the current selection
  const currentRole = roles?.find(r => r.id === agentConfig.roleId);
  const currentModelConfig = (currentRole as unknown as RoleWithPreferredModels)?.preferredModels?.find((pm) => pm.model?.modelId === agentConfig.modelId);
  const adjustedParameters = currentModelConfig?.adjustedParameters;

  // Error State
  const [error, setError] = useState<string | null>(null);

  // Agent session mutation
  const startSessionMutation = trpc.agent.startSession.useMutation({
    onSuccess: (data) => {
      console.log('[Card] Agent session completed:', data);
      
      if (data.logs && data.logs.length > 0) {
        // Add logs to store
        data.logs.forEach((msg: string) => {
            wsActions.addMessage({
                timestamp: new Date().toISOString(),
                type: 'info',
                message: msg
            });
        });
        // Automatically switch to terminal to show what happened
        setType('terminal');
      }

      if (data.result) {
          // Append the result to the editor content
          setContent(prev => {
              const newContent = prev + '\n\n' + data.result;
              return newContent;
          });
          
          // Heuristic: If result looks like a URL, switch to browser
          if (data.result.trim().startsWith('http')) {
             setType('browser');
             // TODO: Pass URL to browser if needed, currently browser manages own state
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
    onMutate: async () => {
    },
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

  // Run agent function - wrapped in useCallback to stabilize reference
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
    if (!hasGenerated) {
        const summary = prompt.slice(0, 25) + (prompt.length > 25 ? '...' : '');
        setCardTitle(summary);
        setHasGenerated(true);
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
    });
  }, [content, agentConfig, startSessionMutation, id, isAiWorking, hasGenerated]);

  // Handle file attachment
  const handleAttachFile = useCallback(async (filePath: string) => {
    try {
      const fileContent = await readFile(filePath);
      const attachmentText = `\n\n---\n**Attached File: ${filePath}**\n\`\`\`\n${fileContent}\n\`\`\`\n---\n\n`;
      setContent(prev => prev + attachmentText);
      setShowAttachModal(false);
    } catch (error) {
      console.error('Failed to attach file:', error);
      setError(`Failed to attach file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [readFile]);


  // Auto-creation logic
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentPath]);

  // The "Little Button" Menu options
  const menuItems = [
    { id: 'editor', icon: FileText, label: 'Write (Tiptap)' },
    { id: 'code', icon: Code, label: 'Code (Monaco)' },
    { id: 'browser', icon: Globe, label: 'Research (Browser)' },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
  ];

  const neonColor = getNeonColorForPath(currentPath);

  // View Switcher Component (Reused)
  const viewSwitcher = (
    <div className="flex items-center gap-1 bg-[var(--color-background)] rounded p-0.5 border border-[var(--color-border)]">
        {menuItems.map((item) => (
        <button
            key={item.id}
            onClick={() => {
            setType(item.id as ComponentType);
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

  // Determine if we are in "Universal Mode" (upgraded tools)
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
        
        {/* HEADER with File Controls - HIDDEN IN UNIVERSAL MODE */}
        {!isUniversalMode && (
        <div 
          className="flex-none h-8 border-b flex items-center justify-between px-2"
          style={{
            backgroundColor: theme.colors.cardHeaderBackground || theme.colors.backgroundSecondary,
            borderColor: theme.colors.cardBorder || theme.colors.border
          }}
        >
          
          {/* Left: VFS Badge + Title */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] overflow-hidden">
            {/* VFS Path Badge - Minimal */}
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
              {/* Tooltip on hover */}
              <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[9px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {currentPath}
              </div>
            </div>
            
            {/* Card Title */}
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
  
          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Run Button - Icon Only */}
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
  
            {/* Settings Button - Neon */}
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
  
            {/* View Switcher (Only for Editor/Code modes) */}
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
  
            {/* Component Swapper */}
            {viewSwitcher}
            
          </div>
        </div>
        )}
  
        {/* BODY */}
        <div className="flex-1 min-h-0 relative bg-[var(--color-background)]">

          {/* SETTINGS VIEW */}
          {viewMode === 'settings' && (
            <AgentSettings 
              config={{ ...agentConfig, adjustedParameters }}
              availableRoles={roles?.map(r => ({ id: r.id, name: r.name, category: r.category || '' })) || []}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          )}
  
          {/* EDITOR / CODE VIEW */}
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
  
          {/* FILE EXPLORER VIEW */}
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
  
          {/* OTHER VIEWS */}
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
        
        {/* Status Footer - HIDDEN IN UNIVERSAL MODE (To respect "full height" and new design?)
            Wait, prompt says "hide its own 'File Path / Title' header". Does not mention footer.
            However, UniversalCardWrapper has its own footer? No, it has front/back faces.
            I will KEEP the footer for now as it contains AI status and CardCustomButtons.
        */}
        <div className="flex-none p-2 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)]">
          {/* Single Row - Status Info and Action Buttons */}
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

            {/* Action Buttons - Inline */}
            <div className="flex gap-1.5 ml-auto">
              {/* Card Agent Prompt */}
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

              {/* Custom Buttons */}
              <CardCustomButtons
                cardId={id}
                buttons={[]} 
                onExecute={(button) => {
                  if (button.action === 'command') {
                    wsActions.sendMessage({ command: button.actionData });
                    setType('terminal');
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

      {/* File Attachment Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[600px] h-[500px] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-200">Attach File from VFS</h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* File Explorer */}
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

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-[var(--color-text-secondary)]">
              Click on a file to attach it to your chat
            </div>
          </div>
        </div>
      )}
    </>
  );
};

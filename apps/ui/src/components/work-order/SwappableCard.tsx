import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { FileText, Code, Globe, Terminal, Play, Paperclip, X, Settings } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js'; 
import { useCardVFS } from '../../hooks/useCardVFS.js';
import XtermTerminal from '../XtermTerminal.js';
import { BrowserCard } from '../BrowserCard.js';
import { AgentSettings, type CardAgentState } from '../settings/AgentSettings.js';
import { trpc } from '../../utils/trpc.js';
import { useWorkspaceStore, type CardData } from '../../stores/workspace.store.js';
import { useTheme } from '../../hooks/useTheme.js';
import { NEON_BUTTON_COLORS, getNeonColorForPath } from '../../utils/neonTheme.js';
import useIngestStore from '../../stores/ingest.store.js';
import useWebSocketStore from '../../stores/websocket.store.js';
import { SimpleErrorModal } from '../SimpleErrorModal.js';
import { CardAgentPrompt } from './CardAgentPrompt.js'; 
import { CardCustomButtons } from './CardCustomButtons.js';
import type { Role } from '@repo/common/agent';
import type { WorkspaceState } from '../../stores/workspace.store.js';

type ExtendedRole = Role & { 
  preferredModels?: { 
    model?: { modelId: string }; 
    adjustedParameters?: Record<string, unknown> 
  }[] 
};

type ComponentType = 'editor' | 'code' | 'browser' | 'terminal' | 'preview';

/**
 * SwappableCard - A multi-modal workspace component with performance-optimized state sync.
 */
export const SwappableCard = memo(({ id, roleId }: { id: string; roleId?: string }) => {
  const { theme } = useTheme();

  // STABLE PRIMITIVE SELECTORS
  const storedTitle = useWorkspaceStore(useCallback((s: WorkspaceState) => s.cards.find((c: CardData) => c.id === id)?.title, [id]));
  const storedType = useWorkspaceStore(useCallback((s: WorkspaceState) => s.cards.find((c: CardData) => c.id === id)?.type, [id]));
  const storedTargetDir = useWorkspaceStore(useCallback((s: WorkspaceState) => s.cards.find((c: CardData) => c.id === id)?.metadata?.targetDir as string | undefined, [id]));

  const updateCard = useWorkspaceStore((state) => state.updateCard);

  const { 
    files, 
    currentPath, 
    navigateTo: navigate, 
    mkdir, 
    refresh, 
    loadChildren, 
    readFile, 
    createFile 
  } = useCardVFS(id);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  
  const wsActions = useWebSocketStore(state => state.actions);
  const storeMessages = useWebSocketStore(state => state.messages || []);
  
  // SYNCED LOCAL STATE
  const [cardTitle, setCardTitle] = useState(storedTitle || "New Task");
  const [targetDir, setTargetDir] = useState(storedTargetDir || "./src");
  const [type, setType] = useState<ComponentType>((storedType as ComponentType) || 'editor');

  const handleSetType = useCallback((newType: ComponentType) => {
      setType(newType);
      if (newType !== storedType) {
          updateCard(id, { type: newType });
      }
  }, [id, storedType, updateCard]);

  const [viewMode, setViewMode] = useState<'editor' | 'files' | 'settings'>('editor');
  
  // DEBOUNCED SYNC EFFECTS
  useEffect(() => {
    if (storedTitle !== undefined && cardTitle !== storedTitle) {
      const timeout = setTimeout(() => {
        updateCard(id, { title: cardTitle });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [cardTitle, storedTitle, id, updateCard]);

  useEffect(() => {
    if (targetDir && storedTargetDir !== targetDir) {
       const timeout = setTimeout(() => {
          const currentMetadata = useWorkspaceStore.getState().cards.find(c => c.id === id)?.metadata;
          updateCard(id, { metadata: { ...currentMetadata, targetDir } });
       }, 500);
       return () => clearTimeout(timeout);
    }
  }, [targetDir, storedTargetDir, id, updateCard]);

  const hasRunOnce = useRef(!!storedTitle && storedTitle !== "New Task");
  const { data: roles } = trpc.role.list.useQuery(undefined, { retry: 1 });
  const { data: models } = trpc.model.list.useQuery(undefined, { retry: 1 });

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

  const hasSetInitialRole = useRef(false);
  useEffect(() => {
    if (roles && roles.length > 0 && !agentConfig.roleId && !hasSetInitialRole.current) {
      setAgentConfig(prev => ({ ...prev, roleId: roles[0].id }));
      hasSetInitialRole.current = true;
    }
  }, [roles, agentConfig.roleId]);

  const currentRole = roles?.find(r => r.id === agentConfig.roleId);
  const currentModelConfig = (currentRole as ExtendedRole | undefined)?.preferredModels?.find((pm: { model?: { modelId: string } }) => pm.model?.modelId === agentConfig.modelId);
  const adjustedParameters = currentModelConfig?.adjustedParameters;

  const [error, setError] = useState<string | null>(null);

  const startSessionMutation = trpc.agent.startSession.useMutation({
    onSuccess: (data) => {
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
          setContent(prev => prev + '\n\n' + data.result);
          if (data.result.trim().startsWith('http')) {
             handleSetType('browser');
          }
      }

      if (data.modelId) {
          setAgentConfig(prev => ({ ...prev, modelId: data.modelId, isLocked: true }));
      }
    },
    onError: (err) => setError(`Failed to start agent: ${err.message}`),
  });

  const isAiWorking = startSessionMutation.isLoading;

  const handleRunAgent = useCallback(() => {
    if (isAiWorking) return; 
    const tmp = document.createElement("DIV");
    tmp.innerHTML = content;
    const prompt = tmp.textContent || tmp.innerText || "";
    
    if (!prompt.trim()) { setError('Please enter a prompt'); return; }
    if (!agentConfig.roleId) { setError('Select a role'); return; }

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
      setContent(prev => prev + `\n\n---\n**Attached: ${filePath}**\n\`\`\`\n${fileContent}\n\`\`\`\n---\n\n`);
      setShowAttachModal(false);
    } catch (err) { setError(`Failed to attach: ${err instanceof Error ? err.message : 'Error'}`); }
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
                if (!activeFile) { setActiveFile(autoFileName); setContent(existing); }
            } catch {
                await createFile(autoFileName, `# Card ${id} Workspace\n\nAuto-generated session.`);
                if (!activeFile) { setActiveFile(autoFileName); setContent(`# Card ${id} Workspace\n\nAuto-generated session.`); }
            }
        } catch { console.error("FS Init Error"); }
        initializedRef.current = id;
    };
    void init();
  }, [id, currentPath, activeFile, readFile, createFile, mkdir]);

  const neonColor = getNeonColorForPath(currentPath);
  const menuItems = [
    { id: 'editor', icon: FileText, label: 'Editor' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'browser', icon: Globe, label: 'Browser' },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
  ];

  const viewSwitcher = (
    <div className="flex items-center gap-1 bg-[var(--color-background)] rounded p-0.5 border border-[var(--color-border)]">
        {menuItems.map((item) => (
        <button
            key={item.id}
            onClick={() => { handleSetType(item.id as ComponentType); setViewMode('editor'); }}
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
      <SimpleErrorModal isOpen={!!error} onClose={() => setError(null)} error={error} />
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
          style={{ backgroundColor: theme.colors.cardHeaderBackground || theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder || theme.colors.border }}
        >
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] overflow-hidden">
            <div className="group relative px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-help flex-none" style={{ backgroundColor: `${neonColor}20`, color: neonColor, border: `1px solid ${neonColor}60` }}>
              <span className="opacity-60 group-hover:opacity-100 transition-opacity">{currentPath.split('/').pop() || '/'}</span>
              <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity z-50">{currentPath}</div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-[var(--color-text)] truncate">{cardTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'editor' && type === 'editor' && (
              <>
                <button onClick={() => void handleRunAgent()} disabled={isAiWorking} className={`p-1.5 rounded transition-all ${NEON_BUTTON_COLORS.run.bg} ${NEON_BUTTON_COLORS.run.text}`} title="Run"><Play size={14} /></button>
                <button onClick={() => setShowAttachModal(true)} className={`p-1.5 rounded transition-all ${NEON_BUTTON_COLORS.attach.bg} ${NEON_BUTTON_COLORS.attach.text}`} title="Attach"><Paperclip size={14} /></button>
              </>
            )}
            <button onClick={() => setViewMode(viewMode === 'settings' ? 'editor' : 'settings')} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-secondary)]"><Settings size={14} /></button>
            {viewSwitcher}
          </div>
        </div>
        )}
  
        <div className="flex-1 min-h-0 relative bg-[var(--color-background)]">
          {viewMode === 'settings' && (
            <div className="flex flex-col h-full w-full bg-zinc-950 p-3 overflow-auto">
              <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Target Directory</label>
              <input value={targetDir} onChange={(e) => setTargetDir(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 mb-4 text-xs text-zinc-300" />
              <AgentSettings 
                config={{ ...agentConfig, adjustedParameters }} 
                availableRoles={roles?.map(r => ({ id: r.id, name: r.name, category: ((r as any).category as { name: string } | undefined)?.name || 'Uncategorized' })) || []}
                availableModels={models?.map((m: any) => ({ 
                  id: (m as { modelId: string }).modelId, 
                  name: (m as { name: string }).name, 
                  provider: (m as { provider: { type: string } }).provider.type, 
                  capabilities: { 
                    vision: (m as { hasVision: boolean }).hasVision, 
                    reasoning: (m as { hasReasoning: boolean }).hasReasoning, 
                    coding: (m as { hasCoding: boolean }).hasCoding 
                  }, 
                  supportsTools: (m as { supportsTools: boolean }).supportsTools, 
                  isUncensored: (m as { isUncensored: boolean }).isUncensored 
                })) || []}
                onUpdate={setAgentConfig}
                fileSystem={{ currentPath, onNavigate: (p) => void navigate(p) }}
              />
            </div>
          )}
          {viewMode === 'editor' && (type === 'editor' || type === 'code') && (
            activeFile ? <SmartEditor fileName={activeFile} content={content} onChange={setContent} isAiTyping={isAiWorking} onRun={handleRunAgent} /> : <div className="h-full flex items-center justify-center text-zinc-500">No file selected</div>
          )}
          {viewMode === 'files' && (
            <FileExplorer files={files} currentPath={currentPath} onNavigate={(p) => void navigate(p)} onCreateFolder={(p) => void mkdir(p)} onRefresh={() => { void refresh(); return undefined; }} onLoadChildren={loadChildren} onSelect={async (p) => { setActiveFile(p); setContent(await readFile(p)); setViewMode('editor'); }} />
          )}
          {viewMode === 'editor' && type === 'browser' && <BrowserCard headerEnd={viewSwitcher} />}
          {viewMode === 'editor' && type === 'terminal' && <XtermTerminal logs={storeMessages} workingDirectory={currentPath} onInput={(d) => wsActions.sendMessage({ command: d })} headerEnd={viewSwitcher} />}
        </div>
        
        <div className="flex-none p-2 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] text-[10px]">
          <div className="flex justify-between items-center px-1">
            <div className="text-zinc-500">Role: <span className="text-zinc-300">{roles?.find(r => r.id === agentConfig.roleId)?.name || 'None'}</span></div>
            <div className="flex gap-2">
              <CardAgentPrompt cardId={id} cardContext={{ currentPath, activeFile, content, type: type === 'preview' ? 'editor' : type }} onSubmit={(p) => startSessionMutation.mutate({ roleId: agentConfig.roleId, modelConfig: { modelId: agentConfig.modelId || undefined, temperature: agentConfig.temperature, maxTokens: agentConfig.maxTokens }, userGoal: p, cardId: id })} isLoading={isAiWorking} />
              <CardCustomButtons cardId={id} buttons={[]} onExecute={(b) => { if (b.action === 'command') wsActions.sendMessage({ command: b.actionData }); else if (b.action === 'url') window.open(b.actionData); }} onAddButton={() => {}} />
            </div>
          </div>
        </div>
      </div>
      {showAttachModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[600px] h-[500px] flex flex-col p-4">
             <div className="flex justify-between mb-4"><h3>Attach File</h3><button onClick={() => setShowAttachModal(false)}><X size={16}/></button></div>
             <FileExplorer files={files} currentPath={currentPath} onNavigate={(p) => void navigate(p)} onCreateFolder={(p) => void mkdir(p)} onRefresh={() => { void refresh(); return undefined; }} onLoadChildren={loadChildren} onSelect={(p) => void handleAttachFile(p)} />
          </div>
        </div>
      )}
    </>
  );
});

SwappableCard.displayName = 'SwappableCard';
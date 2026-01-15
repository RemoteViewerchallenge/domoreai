import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Code, Globe, Terminal, Fingerprint, Folder, X, FileText } from 'lucide-react';
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
import CompactRoleSelector from '../CompactRoleSelector.js';

import MonacoDiffEditor from '../MonacoDiffEditor.js';
import { cn } from '../../lib/utils.js';

// Helper to get filename from path
const getBasename = (path: string) => path.split('/').pop() || path;

export const SwappableCard = memo(({ id }: { id: string }) => {
    const {
        currentPath, navigateTo, readFile, writeFile, mkdir,
        files, refresh, createNode, ingestDirectory,
        loadChildren
    } = useCardVFS(id);

    const card = useWorkspaceStore(s => s.cards.find(c => c.id === id));

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
    const [showRolePicker, setShowRolePicker] = useState(false);

    const updateCard = useWorkspaceStore(s => s.updateCard);

    // Persistence
    useEffect(() => {
        const currentCard = useWorkspaceStore.getState().cards.find(c => c.id === id);
        updateCard(id, {
            metadata: {
                ...(currentCard?.metadata || {}),
                activeFile,
                url: browserUrl
            }
        });
    }, [activeFile, browserUrl, id, updateCard]);


    // 🟢 GOOD: Robust Default File Creation (No Crashes)
    useEffect(() => {
        if (!activeFile && viewMode === 'editor') {
            const initDefaultFile = async () => {
                const sessionsDir = `${currentPath}/sessions`;
                const filePath = `${sessionsDir}/card-${id}.md`;
                
                try {
                    // Try to write; if it fails, try making the directory first
                    // We assume mkdir is safe to call (vfs router should handle existence checks or return success)
                    await mkdir(sessionsDir); 
                } catch {
                    // Ignore if dir exists, proceed to write
                }

                try {
                   // Create empty file
                   await writeFile(filePath, ''); 
                   setActiveFile(filePath);
                } catch (e) {
                   console.error("Failed to create default session file", e);
                   // Fallback to root if folder creation failed entirely
                   setActiveFile(`${currentPath}/card-${id}.md`);
                }
            };
            
            void initDefaultFile();
        }
    }, [activeFile, viewMode, id, currentPath, writeFile, mkdir]);

    // Auto-switch view logic
    useEffect(() => {
        if (activeFile) {
            if (activeFile.startsWith('http')) {
                setBrowserUrl(prev => prev === activeFile ? prev : activeFile);
                setViewMode('browser');
            } else if (/\.(png|jpg|jpeg|gif|svg|html)$/i.test(activeFile)) {
                 setBrowserUrl(`file://${activeFile}`);
                 setViewMode('browser');
            } else {
                void readFile(activeFile).then(setContent).catch(() => setContent(''));
            }
        }
    }, [activeFile, readFile]);

    const handleSave = useCallback((val: string | undefined) => {
        if (val === undefined) return;
        setContent(val);
        if (activeFile) {
            // Main Save
            void writeFile(activeFile, val);
            
            // 🟢 GOOD: Background Backup (Hidden)
            // Save a copy to .nebula/backups for restoration if needed
            const backupPath = `${currentPath}/.nebula/backups/${getBasename(activeFile)}.bak`;
            // We use a fire-and-forget approach here, maybe debounce in real-world
            void writeFile(backupPath, val).catch(() => { /* Silent fail on backup is ok */ });
        }
    }, [activeFile, writeFile, currentPath]);

    const runAgent = useCallback(async (goal: string, roleIdOverride?: string) => {
        const effectiveRoleId = roleIdOverride || agentConfig.roleId;
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

    return (
        <div className="flex h-full w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden relative flex-col">
            
            {/* 1. Header with Clean Filename Display */}
            <div className="h-9 border-b border-[var(--border-color)] flex items-center px-2 bg-[var(--bg-secondary)] gap-2">
                <div className="flex-1 flex items-center bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] px-2 h-6" title={activeFile}>
                    <FileText size={10} className="text-[var(--text-muted)] mr-1.5" />
                    {/* 🟢 GOOD: Display only basename, but track full path */}
                    <input
                        value={getBasename(activeFile)} 
                        onChange={() => {
                            // Simple rename logic is complex; for now, let's treat it as a filter or visual
                            // If user really wants to change path, use File Explorer or Save As
                            // This read-only-ish view prevents "path confusion"
                        }}
                        readOnly
                        className="bg-transparent text-[10px] text-[var(--text-primary)] w-full outline-none font-mono placeholder:text-[var(--text-muted)] cursor-default"

                    />
                    <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">
                       {activeFile.includes('/sessions/') ? '(Session)' : ''}
                    </span>
                </div>

                <div className="flex-1" />

                <div className="flex gap-0.5">
                    {[
                        { id: 'files', icon: Folder },
                        { id: 'editor', icon: Code },
                        { id: 'terminal', icon: Terminal },
                        { id: 'browser', icon: Globe },
                        { id: 'role', icon: Fingerprint }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                                if (t.id === 'role') {
                                    setShowRolePicker(!showRolePicker);
                                } else {
                                    setViewMode(t.id as 'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config');
                                    setShowRolePicker(false);
                                }
                            }}
                            className={cn(
                                "p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)]",
                                (viewMode === t.id || (t.id === 'role' && showRolePicker)) && "text-[var(--color-primary)] bg-[var(--bg-primary)]"
                            )}
                        >
                            <t.icon size={12} />
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* View Toggles */}
                <div className="flex gap-0.5">
                    {[
                        { id: 'files', icon: Folder },
                        { id: 'editor', icon: Code },
                        { id: 'terminal', icon: Terminal },
                        { id: 'browser', icon: Globe },
                        { id: 'role', icon: Fingerprint }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                                if (t.id === 'role') {
                                    setShowRolePicker(!showRolePicker);
                                } else {
                                    setViewMode(t.id as 'editor' | 'diff' | 'terminal' | 'browser' | 'files' | 'config');
                                    setShowRolePicker(false);
                                }
                            }}
                            className={cn(
                                "p-1 rounded hover:bg-[var(--bg-primary)] text-[var(--text-muted)]",
                                (viewMode === t.id || (t.id === 'role' && showRolePicker)) && "text-[var(--color-primary)] bg-[var(--bg-primary)]"
                            )}
                        >
                            <t.icon size={12} />
                        </button>
                    ))}
                </div>
            </div>


            {/* 2. Content */}
            <div
                className="flex-1 relative overflow-hidden bg-[var(--bg-background)] select-text"
                onContextMenu={(e) => e.nativeEvent.stopImmediatePropagation()}
            >
                {viewMode === 'config' && (
                    <RoleEditorCard
                        id={id}
                        initialRoleId={agentConfig.roleId}
                        initialModelId={agentConfig.modelId}
                        initialTemperature={agentConfig.temperature}
                        initialMaxTokens={agentConfig.maxTokens}
                        onUpdateConfig={(cfg) => {
                            updateCard(id, {
                                roleId: cfg.roleId,
                                metadata: {
                                    ...(card?.metadata || {}),
                                    agentConfig: {
                                        ...agentConfig,
                                        roleId: cfg.roleId,
                                        modelId: cfg.modelId,
                                        temperature: cfg.temperature,
                                        maxTokens: cfg.maxTokens
                                    }
                                }
                            });
                        }}
                        onClose={() => setViewMode('editor')}
                    />
                )}
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
                            <span className="text-xs font-bold text-zinc-400">Diff View: {getBasename(activeFile)}</span>
                            <button onClick={() => setViewMode('editor')} className="text-[10px] text-blue-400 hover:underline">Close Diff</button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MonacoDiffEditor
                                original={`// Previous version\n${content}`}
                                modified={content + '\n// New changes'}
                                language="typescript"
                            />
                        </div>
                    </div>
                )}
                {viewMode === 'files' && <FileExplorer
                    files={files}
                    currentPath={currentPath}
                    onNavigate={(p) => void navigateTo(p)}
                    onSelect={(p) => { setActiveFile(p); if (!p.endsWith('/')) setViewMode('editor'); }}
                    onCreateNode={(t, n) => void createNode(t, n)}
                    onRefresh={() => void refresh()}
                    onEmbedDir={(p) => void ingestDirectory(p)}
                    onLoadChildren={loadChildren}
                    className="p-2"
                    activeContent={content}
                    onSaveContent={(path, text) => {
                        void (async () => {
                            await writeFile(path, text);
                            toast.success("Saved content to " + getBasename(path));
                            setActiveFile(path);
                            setViewMode('editor');
                        })();
                    }}
                />}
                {viewMode === 'terminal' && <SmartTerminal workingDirectory={currentPath} logs={terminalLogs} onInput={(msg) => void runAgent(msg)} />}
                {viewMode === 'browser' && <SmartBrowser url={browserUrl} onUrlChange={setBrowserUrl} />}

                {showRolePicker && (
                    <div className="absolute top-9 right-2 w-72 h-[350px] bg-zinc-950 border border-zinc-800 z-50 shadow-2xl rounded-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                        <div className="flex items-center justify-between p-2.5 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg">
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1.5 px-0.5">
                                <Fingerprint size={12} className="text-blue-500" />
                                Role Selector
                            </span>
                            <button onClick={() => setShowRolePicker(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-all">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <CompactRoleSelector
                                selectedRoleId={card?.roleId || ''}
                                onSelect={(roleId) => {
                                    updateCard(id, { roleId });
                                    setShowRolePicker(false);
                                }}
                                onEdit={() => {
                                    setShowRolePicker(false);
                                    setViewMode('config');
                                }}
                                className="border-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
SwappableCard.displayName = 'SwappableCard';
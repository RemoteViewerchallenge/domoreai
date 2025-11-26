import { useState, useEffect, useCallback } from 'react';
import { FileText, Code, FolderTree, MoreHorizontal, Globe, Terminal, FileCode, Settings, Play } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js'; 
import { useFileSystem } from '../../stores/FileSystemStore.js';
import ResearchBrowser from '../ResearchBrowser.js';
import TerminalLogViewer from '../TerminalLogViewer.js';
import { AgentSettings, type CardAgentState } from '../settings/AgentSettings.js';
import { trpc } from '../../utils/trpc.js';
// Removed unused useEditor import

type ComponentType = 'editor' | 'code' | 'browser' | 'terminal';

export const SwappableCard = ({ id, roleId }: { id: string; roleId?: string }) => {
  const { files, createFile, readFile } = useFileSystem();
  
  // Component Type State (for the main view switcher)
  const [type, setType] = useState<ComponentType>('editor');

  // View State (Editor vs File Tree vs Settings)
  const [viewMode, setViewMode] = useState<'editor' | 'files' | 'settings'>('editor');
  
  // File State
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isAiWorking, setIsAiWorking] = useState(false);

  // Agent Configuration (inherits from role, can be overridden per card)
  const [agentConfig, setAgentConfig] = useState<CardAgentState>({
    roleId: roleId || '',
    modelId: null,
    isLocked: false,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  });

  // Fetch available roles for the settings panel
  const { data: roles } = trpc.role.list.useQuery();
  
  // Fetch available models for the settings panel
  const { data: models } = trpc.model.list.useQuery();

  // Compute adjusted parameters for the current selection
  const currentRole = roles?.find(r => r.id === agentConfig.roleId);
  
  // We need to find the ModelConfig that matches the selected model (by provider model ID)
  // The role.preferredModels includes model relation.
  // We assume agentConfig.modelId is the provider's model ID (e.g. "gpt-4o")
  // We cast currentRole to any here because the union type of 'default role' vs 'prisma role' 
  // makes TS struggle with the 'preferredModels' existence, even though we added it to default.
  // The prisma generate might take a moment to propagate types.
  const currentModelConfig = (currentRole as any)?.preferredModels?.find((pm: { model?: { modelId: string } }) => pm.model?.modelId === agentConfig.modelId);
  const adjustedParameters = currentModelConfig?.adjustedParameters as Record<string, unknown> | undefined;

  // Agent session mutation
  const startSessionMutation = trpc.agent.startSession.useMutation({
    onSuccess: (data) => {
      console.log('[Card] Agent session started:', data);
      setIsAiWorking(true);
      // TODO: Listen for WebSocket events for this cardId
    },
    onError: (error) => {
      console.error('[Card] Failed to start agent session:', error);
      alert(`Failed to start agent: ${error.message}`);
    },
  });

  // Removed detached Tiptap editor hook

  // Run agent function - wrapped in useCallback to stabilize reference
  // Run agent function - wrapped in useCallback to stabilize reference
  const handleRunAgent = useCallback(() => {
    // Strip HTML to get plain text prompt
    const tmp = document.createElement("DIV");
    tmp.innerHTML = content;
    const prompt = tmp.textContent || tmp.innerText || "";
    
    if (!prompt.trim()) {
      alert('Please enter a prompt first');
      return;
    }

    if (!agentConfig.roleId) {
      alert('Please select a role in settings first');
      return;
    }

    // Start the agent session
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
  }, [content, agentConfig, startSessionMutation, id]);

  // Handle Enter key to run agent
  // Handle Enter key is now managed by SmartEditor via onRun prop

  // Auto-creation logic
  useEffect(() => {
    const autoFileName = `workspace/agents/card-${id}.md`;
    createFile(autoFileName, `# Card ${id} Workspace\n\nAuto-generated session.`);
    
    if (!activeFile) {
      setActiveFile(autoFileName);
      setContent(readFile(autoFileName));
    }
  }, [id, createFile, readFile, activeFile]);

  // The "Little Button" Menu options
  const menuItems = [
    { id: 'editor', icon: FileText, label: 'Write (Tiptap)' },
    { id: 'code', icon: Code, label: 'Code (Monaco)' },
    { id: 'browser', icon: Globe, label: 'Research (Browser)' },
    { id: 'terminal', icon: Terminal, label: 'Logs' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
      
      {/* HEADER with File Controls */}
      <div className="flex-none h-9 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3">
        
        {/* Left: Active File Name or Component Label */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {viewMode === 'settings' ? (
            <>
              <Settings size={14} className="text-cyan-500" />
              <span className="uppercase tracking-wider font-bold">Settings</span>
            </>
          ) : (type === 'editor' || type === 'code') ? (
            <>
              {activeFile?.endsWith('.md') ? <FileText size={14} className="text-cyan-500" /> : <FileCode size={14} className="text-yellow-500" />}
              <span className="font-bold text-zinc-200">{activeFile || 'Initializing...'}</span>
            </>
          ) : (
            <>
              {menuItems.find(m => m.id === type)?.icon({ size: 14 })}
              <span className="uppercase tracking-wider font-bold">
                {menuItems.find(m => m.id === type)?.label}
              </span>
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Run Button (only show in editor mode) */}
          {viewMode === 'editor' && type === 'editor' && (
            <button
              onClick={handleRunAgent}
              disabled={isAiWorking || !agentConfig.roleId}
              className="flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-700 text-green-400 hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] font-bold uppercase"
              title="Run Agent (Cmd/Ctrl + Enter)"
            >
              <Play size={12} />
              Run
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setViewMode(viewMode === 'settings' ? 'editor' : 'settings')}
            className={`p-1 rounded ${viewMode === 'settings' ? 'bg-cyan-900/30 text-cyan-400' : 'text-zinc-500 hover:text-cyan-400'}`}
            title="Toggle Settings"
          >
            <Settings size={14} />
          </button>

          {/* View Switcher (Only for Editor/Code modes) */}
          {(type === 'editor' || type === 'code') && viewMode !== 'settings' && (
            <div className="flex items-center gap-1 bg-zinc-950 rounded p-0.5 border border-zinc-800">
              <button 
                onClick={() => setViewMode('editor')}
                className={`p-1 rounded ${viewMode === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Editor View"
              >
                <Code size={14} />
              </button>
              <button 
                onClick={() => setViewMode('files')}
                className={`p-1 rounded ${viewMode === 'files' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Local File Explorer"
              >
                <FolderTree size={14} />
              </button>
            </div>
          )}

          {/* Component Swapper */}
          <div className="group relative">
            <button className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
              <MoreHorizontal size={16} />
            </button>
            
            <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none group-hover:pointer-events-auto">
              {menuItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setType(item.id as ComponentType);
                    setViewMode('editor');
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  <item.icon size={14} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 relative bg-black">
        
        {/* SETTINGS VIEW */}
        {viewMode === 'settings' && (
          <AgentSettings
            config={{ ...agentConfig, adjustedParameters }}
            availableRoles={roles?.map(r => ({ id: r.id, name: r.name })) || []}
            availableModels={models?.map((m: { modelId: string; name: string; provider: { type: string }; hasVision: boolean; hasReasoning: boolean; hasCoding: boolean; supportsTools: boolean; isUncensored: boolean; costPer1k: number }) => ({
                id: m.modelId, // Use provider's model ID
                name: m.name,
                provider: m.provider.type,
                capabilities: {
                    vision: m.hasVision,
                    reasoning: m.hasReasoning,
                    coding: m.hasCoding
                },
                supportsTools: m.supportsTools,
                isUncensored: m.isUncensored,
                costPer1k: m.costPer1k
            })) || []}
            onUpdate={setAgentConfig}
          />
        )}

        {/* EDITOR / CODE VIEW */}
        {viewMode === 'editor' && (type === 'editor' || type === 'code') && activeFile && (
          <SmartEditor 
            fileName={activeFile} 
            content={content} 
            onChange={setContent} 
            isAiTyping={isAiWorking}
            onRun={handleRunAgent}
          />
        )}

        {/* FILE EXPLORER VIEW */}
        {viewMode === 'files' && (
          <div className="h-full w-full p-2">
            <div className="text-[10px] uppercase text-zinc-500 mb-2 font-bold">Select file for Card {id}</div>
            <FileExplorer 
              files={files} 
              onSelect={(path) => {
                setActiveFile(path);
                setContent(readFile(path));
                setViewMode('editor'); 
              }} 
            />
          </div>
        )}

        {/* OTHER VIEWS */}
        {viewMode === 'editor' && type === 'browser' && <ResearchBrowser />}
        {viewMode === 'editor' && type === 'terminal' && <TerminalLogViewer messages={[]} />}

      </div>
      
      {/* Status Footer */}
      <div className="flex gap-2 p-1 bg-zinc-950 border-t border-zinc-800 justify-between px-2 text-[10px]">
        <div className="text-zinc-600">
          Role: <span className="text-zinc-400">{roles?.find(r => r.id === agentConfig.roleId)?.name || 'None'}</span> | 
          Temp: <span className="text-cyan-400">{agentConfig.temperature}</span> | 
          Tokens: <span className="text-cyan-400">{agentConfig.maxTokens}</span>
        </div>
        {isAiWorking && (
          <div className="text-green-400 animate-pulse">● AI Working...</div>
        )}
      </div>
    </div>
  );
};

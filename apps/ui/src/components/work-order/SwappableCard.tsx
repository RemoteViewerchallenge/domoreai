import { useState, useEffect } from 'react';
import { FileText, Code, FolderTree, MoreHorizontal, Globe, Terminal, FileCode } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js'; 
import { useFileSystem } from '../../stores/FileSystemStore.js'; // Import the brain
import ResearchBrowser from '../ResearchBrowser.js';
import TerminalLogViewer from '../TerminalLogViewer.js';
import type { CardAgentState } from '../settings/AgentSettings.js';

type ComponentType = 'editor' | 'code' | 'browser' | 'terminal';

export const SwappableCard = ({ id, roleId }: { id: string; roleId?: string }) => {
  const { files, createFile, readFile } = useFileSystem();
  
  // Component Type State (for the main view switcher)
  const [type, setType] = useState<ComponentType>('editor');

  // View State (Editor vs File Tree)
  const [viewMode, setViewMode] = useState<'editor' | 'files'>('editor');
  
  // File State
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isAiWorking, setIsAiWorking] = useState(false);

  // Agent Configuration (inherits from role, can be overridden per card)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [agentConfig, setAgentConfig] = useState<CardAgentState>({
    roleId: roleId || '',
    modelId: null,
    isLocked: false,
    temperature: 0.7, // Will be overridden by role defaults
    maxTokens: 2048,   // Will be overridden by role defaults
  });

  // TODO: Fetch role defaults and update agentConfig when roleId changes
  // useEffect(() => {
  //   if (roleId) {
  //     trpc.role.getById.useQuery({ id: roleId }).then(role => {
  //       setAgentConfig(prev => ({
  //         ...prev,
  //         roleId,
  //         temperature: role.defaultTemperature ?? prev.temperature,
  //         maxTokens: role.defaultMaxTokens ?? prev.maxTokens,
  //       }));
  //     });
  //   }
  // }, [roleId]);

  // --- AUTO-CREATION LOGIC ---
  useEffect(() => {
    // 1. Naming Convention: Each card gets a dedicated workspace file
    const autoFileName = `workspace/agents/card-${id}.md`;
    
    // 2. "Create" it in the VFS (Mock) if not exists
    // In a real app, this would be an async check
    createFile(autoFileName, `# Card ${id} Workspace\n\nAuto-generated session.`);
    
    // 3. Set it as active if none selected
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
           {(type === 'editor' || type === 'code') ? (
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
            {/* View Switcher (Only for Editor/Code modes) */}
            {(type === 'editor' || type === 'code') && (
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
                            setViewMode('editor'); // Reset view mode when switching component
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
        
        {/* MODE: EDITOR / CODE */}
        {(type === 'editor' || type === 'code') && (
            <>
                {viewMode === 'editor' && activeFile && (
                <SmartEditor 
                    fileName={activeFile} 
                    content={content} 
                    onChange={setContent} 
                    isAiTyping={isAiWorking}
                />
                )}

                {/* MODE: LOCAL FILE EXPLORER */}
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
            </>
        )}

        {type === 'browser' && <ResearchBrowser />}
        {type === 'terminal' && <TerminalLogViewer messages={[]} />}

      </div>
      
      {/* Debug Controls */}
      <div className="flex gap-2 p-1 bg-zinc-950 border-t border-zinc-800 justify-between px-2 text-[10px]">
         <div className="text-zinc-600">
           Role: <span className="text-zinc-400">{agentConfig.roleId || 'None'}</span> | 
           Temp: <span className="text-cyan-400">{agentConfig.temperature}</span> | 
           Tokens: <span className="text-cyan-400">{agentConfig.maxTokens}</span>
         </div>
         <button onClick={() => setIsAiWorking(!isAiWorking)} className="text-zinc-500 hover:text-white">Toggle AI</button>
      </div>
    </div>
  );
};

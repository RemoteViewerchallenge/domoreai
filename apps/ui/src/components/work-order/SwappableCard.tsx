import { useState, useEffect, useCallback, memo } from 'react';
import { 
  Code, Globe, Terminal, Play, Settings, Folder
} from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import MonacoEditor from '../MonacoEditor.js';
import { useCardVFS } from '../../hooks/useCardVFS.js';
import XtermTerminal from '../XtermTerminal.js';
import { BrowserCard } from '../BrowserCard.js';
import { SuperAiButton } from '../ui/SuperAiButton.js';
import { FileExplorer } from '../FileExplorer.js';
import { AgentSettings } from '../settings/AgentSettings.js'; // Ensure this import exists

export const SwappableCard = memo(({ id }: { id: string }) => {
  const { 
    currentPath, navigateTo, readFile, writeFile, 
    files, refresh, createNode, ingestDirectory, 
    loadChildren 
  } = useCardVFS(id);
  
  // State
  const [activeFile, setActiveFile] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'terminal' | 'browser' | 'files'>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [editorType, setEditorType] = useState<'smart' | 'monaco'>('smart');

  // Auto-detect code files
  useEffect(() => {
    if (activeFile.match(/\.(tsx?|jsx?|json|py|css|html)$/)) {
        setEditorType('monaco');
    } else {
        setEditorType('smart');
    }
  }, [activeFile]);

  // Load Content
  useEffect(() => {
    if (activeFile && viewMode === 'editor') {
        readFile(activeFile).then(setContent).catch(() => setContent('')); 
    }
  }, [activeFile, readFile, viewMode]);

  const handleSave = useCallback(async (val: string) => {
      setContent(val);
      if (activeFile) await writeFile(activeFile, val);
  }, [activeFile, writeFile]);

  const handleRunAgent = useCallback(() => {
      console.log('Running agent...');
      // Future: Trigger actual AI run or code execution
  }, []);

  return (
    <div className="flex h-full w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl relative group">
      


      {/* 2. Main Work Area */}
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
                
                {/* THE SUPER AI BUTTON (Unified) */}
                <SuperAiButton 
                    contextId={`card_${id}`} 
                    side="left"
                    expandUp={false} // Expands down since it's in header
                />

                {/* Settings Toggle */}
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 rounded transition-colors ${showSettings ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white'}`}
                    title="Agent Settings"
                >
                    <Settings size={14} />
                </button>

                {/* Run Agent Button */}
                <button 
                    onClick={handleRunAgent}
                    className="p-1.5 rounded hover:bg-green-900/30 text-green-500 transition-colors"
                    title="Run Agent"
                >
                    <Play size={14} fill="currentColor" />
                </button>

                <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

                {/* View Switcher */}
                <div className="flex bg-black/40 rounded p-0.5">
                    <button onClick={() => setViewMode('files')} className={`p-1.5 rounded ${viewMode === 'files' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><Folder size={14}/></button>
                    <button onClick={() => setViewMode('editor')} className={`p-1.5 rounded ${viewMode === 'editor' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><Code size={14}/></button>
                    <button onClick={() => setViewMode('terminal')} className={`p-1.5 rounded ${viewMode === 'terminal' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><Terminal size={14}/></button>
                    <button onClick={() => setViewMode('browser')} className={`p-1.5 rounded ${viewMode === 'browser' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}><Globe size={14}/></button>
                </div>
             </div>
          </div>

          {/* Content Layer */}
          <div className="flex-1 relative bg-black/50 overflow-hidden">
             
             {/* Settings Overlay */}
             {showSettings && (
                 <div className="absolute top-0 right-0 w-64 h-full bg-zinc-900 border-l border-zinc-800 z-20 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
                     <AgentSettings cardId={id} />
                 </div>
             )}

             {/* Editor Layer */}
             {viewMode === 'editor' && (
                 editorType === 'monaco' 
                 ? <MonacoEditor fileName={activeFile} content={content} onChange={handleSave} />
                 : <SmartEditor fileName={activeFile} content={content} onChange={handleSave} onRun={handleRunAgent} />
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
                            if (!path.endsWith('/')) { // Simple check, might need robust isFile check
                                setViewMode('editor');
                            }
                        }}
                        onCreateNode={createNode}
                        onRefresh={refresh}
                        onEmbedDir={ingestDirectory}
                        onLoadChildren={loadChildren}
                        className="p-2"
                    />
                </div>
              )}
             {viewMode === 'terminal' && <XtermTerminal workingDirectory={currentPath} />}
             {viewMode === 'browser' && <BrowserCard />}

          </div>
      </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
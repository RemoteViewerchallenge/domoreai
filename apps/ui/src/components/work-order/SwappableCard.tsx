import { useState, useEffect, useCallback, memo } from 'react';
import { Code, Globe, Terminal, Folder } from 'lucide-react';
import SmartEditor from '../SmartEditor.js'; 
import { FileExplorer } from '../FileExplorer.js';
import { useCardVFS } from '../../hooks/useCardVFS.js';
import XtermTerminal from '../XtermTerminal.js';
import { BrowserCard } from '../BrowserCard.js';
import { SuperAiButton } from '../ui/SuperAiButton.js'; // The Universal Spark
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import useWebSocketStore from '../../stores/websocket.store.js';
import type { WorkspaceState, CardData } from '../../stores/workspace.store.js';

export const SwappableCard = memo(({ id }: { id: string; roleId?: string }) => {
  const updateCard = useWorkspaceStore((state) => state.updateCard);
  
  // STABLE PRIMITIVE SELECTORS
  const storedType = useWorkspaceStore(useCallback((s: WorkspaceState) => s.cards.find((c: CardData) => c.id === id)?.type, [id]));
  
  // VFS Hook
  const { 
    files, 
    currentPath, 
    navigateTo, 
    refresh, 
    loadChildren, 
    createNode, 
    ingestDirectory, 
    readFile 
  } = useCardVFS(id);
  
  // WebSocket State for Terminal
  const wsActions = useWebSocketStore(state => state.actions);
  const storeMessages = useWebSocketStore(state => state.messages || []);

  // State
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [type, setType] = useState<'editor' | 'terminal' | 'browser' | 'files'>((storedType as 'editor' | 'terminal' | 'browser' | 'files') || 'editor');

  // Sync type with store
  useEffect(() => {
    if (storedType && (storedType as 'editor' | 'terminal' | 'browser' | 'files') !== type) {
      setType(storedType as 'editor' | 'terminal' | 'browser' | 'files');
    }
  }, [storedType, type]);

  const handleSetType = (newType: 'editor' | 'terminal' | 'browser' | 'files') => {
    setType(newType);
    updateCard(id, { type: newType });
  };

  // Auto-Save / Auto-Commit Simulation
  const handleContentChange = useCallback((newContent: string) => {
      setContent(newContent);
      // TODO: Debounce call to "trpc.git.commit" here for "Rule of Evolution"
  }, []);

  const handleFileSelect = async (path: string) => {
    const fileContent = await readFile(path);
    setActiveFile(path);
    setContent(fileContent);
    handleSetType('editor');
  };

  return (
    <div className="flex flex-col h-full w-full rounded border border-zinc-800 overflow-hidden bg-zinc-950">
      
      {/* Header: The "Spark" & Navigation */}
      <div className="flex-none h-9 border-b border-zinc-800 flex items-center justify-between px-2 bg-zinc-900/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
           {/* Universal Spark - Knows this Card's Context */}
           <SuperAiButton 
              contextId={`card_${id}`} 
              className="shadow-none border-none hover:bg-white/10"
           />
           
           {/* Editable Path / Breadcrumb */}
           <div className="flex items-center bg-black/40 rounded px-2 py-0.5 border border-zinc-800 max-w-[200px]">
              <span className="text-[10px] text-zinc-500 font-mono mr-2">/</span>
              <input 
                className="bg-transparent text-xs text-zinc-300 focus:outline-none w-full font-mono"
                value={activeFile || 'Untitled'}
                onChange={(e) => setActiveFile(e.target.value)}
                placeholder="filename..."
              />
           </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 rounded p-0.5 border border-zinc-800">
           <button onClick={() => handleSetType('files')} className={`p-1 rounded ${type === 'files' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Explorer"><Folder size={12}/></button>
           <button onClick={() => handleSetType('editor')} className={`p-1 rounded ${type === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Editor"><Code size={12}/></button>
           <button onClick={() => handleSetType('browser')} className={`p-1 rounded ${type === 'browser' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Browser"><Globe size={12}/></button>
           <button onClick={() => handleSetType('terminal')} className={`p-1 rounded ${type === 'terminal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`} title="Terminal"><Terminal size={12}/></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
         {type === 'files' && (
            <FileExplorer 
               files={files}
               currentPath={currentPath}
               onSelect={(p) => { void handleFileSelect(p); }}
               onNavigate={navigateTo}
               onRefresh={() => { void refresh(); }}
               onLoadChildren={loadChildren}
               onCreateNode={(t, n) => { void createNode(t, n); }}
               onEmbedDir={(p) => { void ingestDirectory(p); }}
            />
         )}
         {type === 'editor' && (
            <SmartEditor 
              fileName={activeFile || 'scratchpad.md'} 
              content={content} 
              onChange={handleContentChange} 
            />
         )}
         {type === 'terminal' && (
            <XtermTerminal 
              logs={storeMessages} 
              workingDirectory={currentPath} 
              onInput={(d) => wsActions.sendMessage({ command: d })} 
            />
         )}
         {type === 'browser' && <BrowserCard />}
      </div>
    </div>
  );
});

SwappableCard.displayName = 'SwappableCard';
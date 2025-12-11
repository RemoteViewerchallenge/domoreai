import React, { useState } from 'react';
import { callVoid } from '../../lib/callVoid.js';
import { Folder, FileText, ChevronRight, ChevronDown, ArrowUp, RefreshCw, Plus, Home } from 'lucide-react';
import type { VFile } from '../../stores/FileSystemTypes.js';

interface FileExplorerProps {
  files: VFile[];
  onSelect: (path: string) => void;
  className?: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onCreateFolder?: (path: string) => void;
  onRefresh?: () => void;
  onEmbedDir?: () => void;
  onLoadChildren?: (path: string) => Promise<VFile[]>;
}

// Recursive Tree Node
const FileNode = ({ 
  node, 
  onSelect, 
  onNavigate,
  onLoadChildren,
  depth = 0 
}: { 
  node: VFile, 
  onSelect: (p: string) => void,
  onNavigate?: (p: string) => void,
  onLoadChildren?: (path: string) => Promise<VFile[]>,
  depth: number 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<VFile[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);
  const paddingLeft = depth * 12 + 12;

  const handleToggle = async () => {
    if (node.type !== 'directory') return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Load children when expanding if not already loaded
    if (newIsOpen && children.length === 0 && onLoadChildren) {
      setIsLoading(true);
      try {
        const loadedChildren = await onLoadChildren(node.path);
        setChildren(loadedChildren);
      } catch (err) {
        console.error('Failed to load children:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (node.type === 'file') {
    return (
      <div 
        onClick={() => void onSelect(node.path)}
        className="flex items-center gap-2 py-1 hover:bg-zinc-800 cursor-pointer text-[var(--color-text-secondary)] hover:text-cyan-400 text-xs"
        style={{ paddingLeft }}
      >
        <FileText size={13} />
        <span className="truncate">{node.path.split('/').pop()}</span>
      </div>
    );
  }

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 hover:bg-zinc-800 cursor-pointer text-zinc-300 text-xs font-bold"
        style={{ paddingLeft }}
      >
        <span onClick={() => callVoid(handleToggle)} className="flex items-center cursor-pointer">
          {isLoading ? (
            <div className="w-[13px] h-[13px] border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
          ) : isOpen ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronRight size={13} />
          )}
        </span>
        <Folder 
          size={13} 
          className="text-purple-400" 
          onClick={() => callVoid(onNavigate, node.path)}
        />
        <span 
          onClick={() => callVoid(onNavigate, node.path)}
          className="flex-1 text-left hover:text-cyan-400"
        >
          {node.path.split('/').pop()}
        </span>
      </div>
      {isOpen && children.map(child => (
        <FileNode 
          key={child.path} 
          node={child} 
          onSelect={onSelect} 
          onNavigate={onNavigate}
          onLoadChildren={onLoadChildren}
          depth={depth + 1} 
        />
      ))}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  onSelect, 
  className,
  currentPath,
  onNavigate,
  onCreateFolder,
  onRefresh,
  onEmbedDir,
  onLoadChildren
}) => {
  const [pathInput, setPathInput] = useState(currentPath || '');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Update local input when prop changes
  React.useEffect(() => {
    setPathInput(currentPath || '');
  }, [currentPath]);

  const handleUp = () => {
    if (!currentPath || !onNavigate) return;
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    onNavigate(parent);
  };

  const handleNavigate = () => {
    if (onNavigate) onNavigate(pathInput);
  };

  const handleCreateFolder = () => {
    if (onCreateFolder && newFolderName.trim()) {
      onCreateFolder(`${currentPath}/${newFolderName.trim()}`);
      setIsCreating(false);
      setNewFolderName('');
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
       {/* Toolbar */}
       <div className="flex flex-col gap-2 p-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-1">
                 <button onClick={() => callVoid(handleUp)} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white" title="Go Up">
                <ArrowUp size={14} />
             </button>
                 <button onClick={() => callVoid(onNavigate, '/home/guy')} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white" title="Home">
                <Home size={14} />
             </button>
                 <button onClick={() => callVoid(onRefresh)} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-white" title="Refresh">
                <RefreshCw size={14} />
             </button>
             <div className="flex-1 relative">
                <input 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                />
             </div>
             <button onClick={() => callVoid(() => setIsCreating(!isCreating))} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-green-400" title="New Folder">
                <Plus size={14} />
             </button>
             <button onClick={() => callVoid(onEmbedDir)} className="p-1 hover:bg-zinc-800 rounded text-[var(--color-text-secondary)] hover:text-yellow-400" title="Embed Directory">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
             </button>
          </div>
          
          {/* New Folder Input */}
          {isCreating && (
            <div className="flex items-center gap-2 animate-in slide-in-from-top-1">
               <Folder size={14} className="text-purple-400" />
               <input 
                  autoFocus
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-purple-500 outline-none"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
               />
            </div>
          )}
       </div>

       {/* File List */}
       <div className="flex-1 overflow-y-auto p-1">
          {files.length === 0 ? (
            <div className="text-center text-zinc-600 text-xs mt-4 italic">Empty directory</div>
          ) : (
            files.map(f => (
              <FileNode 
                key={f.path} 
                node={f} 
                onSelect={onSelect} 
                onNavigate={onNavigate}
                onLoadChildren={onLoadChildren}
                depth={0} 
              />
            ))
          )}
       </div>
    </div>
  );
};

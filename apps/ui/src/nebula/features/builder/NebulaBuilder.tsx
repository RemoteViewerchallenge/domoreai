import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useBuilderStore } from '../../../stores/builder.store.js';
import { ComponentManifest, type ComponentCategory } from '../../registry.js';
import { Canvas as BuilderCanvas } from '../../../components/nebula/system/Canvas.js';
import { PropertyPanel } from '../../../components/nebula/system/PropertyPanel.js';
import { BuilderToolbar } from '../../features/navigation/toolbars/BuilderToolbar.js';
import type { NebulaTree } from '@repo/nebula'; 
import { X, FolderOpen, Code, RefreshCw, Layers, FileCode, Plus, Search, Bot, Box } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { useVFS } from '../../../hooks/useVFS.js';
import { SuperAiButton } from '../../../components/ui/SuperAiButton.js';
import { toast } from 'sonner';
import { FileExplorer } from '../../../components/FileExplorer.js';
import { trpc } from '../../../utils/trpc.js';

// --- TYPES ---
interface NebulaBuilderProps {
  initialTree: NebulaTree; 
  onSave: (newTree: NebulaTree) => void;
}

// --- MAIN COMPONENT ---
export const NebulaBuilder = ({ initialTree, onSave }: NebulaBuilderProps) => {
  const [tree, setTree] = useState<NebulaTree>(initialTree);
  const [sidebarTab, setSidebarTab] = useState<'library' | 'assistant' | 'files'>('library');
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [codeBuffer, setCodeBuffer] = useState('');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');

  const { setIsDirty, saveTriggered, viewport } = useBuilderStore();
  const vfs = useVFS('', '/'); // Start at root (which now defaults to /home/guy/mono in backend)

  // TRPC Mutations
  const parseJsxMutation = trpc.nebula.parseJsx.useMutation();
  const generateCodeMutation = trpc.nebula.generateCode.useMutation();

  // --- ACTIONS ---

  const handleSave = useCallback(() => {
    onSave(tree);
    setIsDirty(false);
    toast("Layout Saved", { description: "Nebula tree persisted to disk." });
  }, [tree, onSave, setIsDirty]);

  // Sync save button from toolbar
  useEffect(() => {
    if (saveTriggered > 0) handleSave();
  }, [saveTriggered, handleSave]);

  // Drag Start
  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('nebula/type', componentType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // VFS Import
  const handleVfsSelect = async (path: string) => {
    const fileName = path.split('/').pop() || '';
    if (!/\.(tsx|jsx|ts|js)$/.test(fileName)) {
        toast.error("Invalid File Type", { description: "Please select a React/TS files." });
        return;
    }

    try {
        const content = await vfs.readFile(path);
        const newTree = await parseJsxMutation.mutateAsync({ code: content });
        setTree(newTree);
        setCurrentFile(path.split('/').pop() || path);
        setIsDirty(true);
        toast("Component Imported", { description: `Successfully parsed ${path} into Nebula Tree.` });
    } catch (err) {
        toast.error("Parse Error", { description: (err as Error).message });
    }
  };

  // Export
  const getExportedCode = useCallback(async () => {
    const result = await generateCodeMutation.mutateAsync({ tree });
    return result.code;
  }, [tree, generateCodeMutation]);

  const handleSaveJson = async () => {
    try {
      const json = JSON.stringify(tree, null, 2);
      await vfs.writeFile('nebula-project.json', json);
      toast.success("JSON Exported", { description: "Saved as nebula-project.json to VFS Root." });
    } catch (err) {
      toast.error("Export Failed", { description: (err as Error).message });
    }
  };

  // AI Context Getter
  const getAiContext = useCallback(() => {
     return {
         tree: tree,
         activeViewport: viewport,
         currentFile: currentFile
     };
  }, [tree, viewport, currentFile]);

  const handleAiSuccess = (response: any) => {
      console.log("AI Response:", response);
      if (response?.tree) {
          setTree(response.tree);
          toast("AI Generation Complete", { description: "Applied layout changes from Agent." });
      }
  };

  // Filter Components
  const componentList = useMemo(() => Object.entries(ComponentManifest)
    .filter(([_key, def]) => {
      if (def.meta.hidden) return false;
      const matchesSearch = _key.toLowerCase().includes(searchQuery.toLowerCase()) || def.meta.label.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeCategory === 'all') return def.meta.category !== 'system';
      return def.meta.category === activeCategory;
    }), [activeCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 overflow-hidden font-sans">
      
      {/* 1. TOP BAR */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-950/50 backdrop-blur shrink-0 justify-between">
        <div className="flex items-center gap-4">
            <BuilderToolbar />
            {currentFile && (
                <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
                    <FileCode size={12} className="text-indigo-400" />
                    {currentFile}
                </div>
            )}
        </div>
         <div className="flex items-center gap-2 h-full">
            <button 
              onClick={() => { void handleSaveJson(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 rounded-sm text-[10px] uppercase font-bold text-zinc-500 hover:text-amber-400 transition-colors border border-transparent hover:border-zinc-700"
            >
               <Layers size={12} /> Save JSON
            </button>
            <button 
              onClick={() => { void (async () => { const code = await getExportedCode(); setCodeBuffer(code); setShowCodeModal(true); })(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 rounded-sm text-[10px] uppercase font-bold text-zinc-500 hover:text-indigo-400 transition-colors border border-transparent hover:border-zinc-700"
            >
               <Code size={12} /> View Code
            </button>
            <div className="h-4 w-px bg-zinc-800 mx-2" />
            <SuperAiButton 
                contextGetter={getAiContext}
                onSuccess={handleAiSuccess}
                defaultRoleId="nebula-architect"
                className="z-50 scale-90"
            />
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. LEFT SIDEBAR (The Cockpit) */}
        <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900 shrink-0">
           
           {/* Sidebar Tabs */}
           <div className="flex border-b border-zinc-800">
              <button 
                onClick={() => setSidebarTab('library')}
                className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border-b-2",
                    sidebarTab === 'library' 
                        ? "text-zinc-100 border-indigo-500 bg-zinc-800/50" 
                        : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                  <Box size={14} /> Library
              </button>
              <button 
                onClick={() => setSidebarTab('assistant')}
                className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border-b-2",
                    sidebarTab === 'assistant' 
                        ? "text-zinc-100 border-purple-500 bg-zinc-800/50" 
                        : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                  <Bot size={14} /> AI
              </button>
              <button 
                onClick={() => setSidebarTab('files')}
                className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border-b-2",
                    sidebarTab === 'files' 
                        ? "text-zinc-100 border-amber-500 bg-zinc-800/50" 
                        : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                  <FolderOpen size={14} /> Files
              </button>
           </div>

           {/* A. LIBRARY TAB */}
           {sidebarTab === 'library' && (
               <>
                <div className="p-3 border-b border-zinc-800">
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-600" />
                        <input 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 pl-8 py-2 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-zinc-700 text-zinc-300 transition-colors" 
                        placeholder="Search components..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex gap-1 p-2 border-b border-zinc-800 overflow-x-auto no-scrollbar shrink-0 bg-zinc-950/30">
                    {(['all', 'layout', 'atom', 'molecule', 'data'] as const).map(cat => (
                        <button
                        key={cat}
                        onClick={() => setActiveCategory(cat as unknown as ComponentCategory | 'all')}
                        className={cn(
                            "px-3 py-1 rounded-sm text-[10px] uppercase font-bold whitespace-nowrap border transition-all",
                            activeCategory === cat 
                            ? "bg-zinc-800 text-zinc-100 border-zinc-600" 
                            : "border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30"
                        )}
                        >
                        {cat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {componentList.map(([type, def]) => (
                        <div 
                        key={type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type)}
                        className="group flex items-center justify-between p-2 rounded-sm hover:bg-zinc-800 border border-transparent hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all select-none"
                        >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-indigo-400 transition-colors shadow-sm">
                                <Layers size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100">{def.meta.label}</span>
                                <span className="text-[9px] text-zinc-600 uppercase">{def.meta.category}</span>
                            </div>
                        </div>
                        <Plus size={12} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                    {componentList.length === 0 && (
                        <div className="text-center py-12 text-[10px] text-zinc-600 uppercase tracking-widest">No Components Found</div>
                    )}
                </div>
               </>
           )}

           {/* B. AI ASSISTANT TAB */}
           {sidebarTab === 'assistant' && (
               <div className="flex flex-col h-full bg-zinc-900/50">
                   <div className="flex-1 p-4 overflow-y-auto">
                       <div className="p-4 rounded border border-purple-500/20 bg-purple-500/5 mb-4">
                           <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <Bot size={14}/> Active Context
                           </h4>
                           <div className="text-[10px] text-zinc-400 space-y-1 font-mono">
                               <div className="flex justify-between">
                                   <span>Tree Nodes:</span>
                                   <span className="text-zinc-200">{(JSON.stringify(tree).length / 1024).toFixed(1)} KB</span>
                               </div>
                               <div className="flex justify-between">
                                   <span>Viewport:</span>
                                   <span className="text-zinc-200 uppercase">{viewport}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span>Active File:</span>
                                   <span className="text-zinc-200 truncate max-w-[100px]">{currentFile || 'None'}</span>
                               </div>
                           </div>
                       </div>
                       
                       <div className="text-xs text-zinc-500 leading-relaxed text-center mt-8">
                           "I can generate layouts, refactor components, or analyze your current tree. Select a specialized Role below."
                       </div>
                   </div>

                   {/* Prompt Area */}
                   <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                       <div className="relative">
                           <textarea
                               className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs text-zinc-300 focus:border-purple-500 focus:outline-none resize-none custom-scrollbar mb-2"
                               placeholder="Describe your UI needs (e.g., 'Add a 3-column grid with cards')..."
                               value={aiPrompt}
                               onChange={e => setAiPrompt(e.target.value)}
                           />
                           
                           <div className="flex justify-between items-center">
                               <span className="text-[10px] text-zinc-600 uppercase font-bold">Model: Nebula-70B</span>
                               <SuperAiButton 
                                    contextGetter={getAiContext}
                                    onSuccess={handleAiSuccess}
                                    defaultPrompt={aiPrompt}
                                    className="z-50"
                                    defaultRoleId="nebula-architect"
                               />
                           </div>
                       </div>
                   </div>
               </div>
           )}

           {/* C. FILES TAB (Rule 3 Fix) */}
           {sidebarTab === 'files' && (
               <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                   <div className="p-2 border-b border-zinc-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        <span>Project Files</span>
                        <button onClick={() => { void vfs.refresh(); }} className="hover:text-zinc-200 transition-colors"><RefreshCw size={10} /></button>
                   </div>
                   <div className="flex-1 overflow-hidden">
                        {vfs.isLoading ? (
                            <div className="flex items-center justify-center h-full text-[10px] text-zinc-600 uppercase font-bold">
                                <RefreshCw size={12} className="animate-spin mr-2" /> Loading...
                            </div>
                        ) : (
                            <FileExplorer 
                                files={vfs.files}
                                onSelect={(path) => { void handleVfsSelect(path); }}
                                onNavigate={(path) => vfs.navigateTo(path)}
                                currentPath={vfs.currentPath}
                                onRefresh={() => { void vfs.refresh(); }}
                                onLoadChildren={vfs.listDir}
                                className="border-0"
                            />
                        )}
                   </div>
               </div>
           )}
        </div>

        {/* 3. CENTER (Canvas) */}
        <div className="flex-1 bg-zinc-950 flex flex-col relative overflow-hidden">
           {/* Canvas Wrapper */}
           <div className="flex-1 overflow-auto p-12 flex justify-center bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] custom-scrollbar">
              <div 
                className={cn(
                  "transition-all duration-500 shadow-2xl bg-zinc-900 border border-zinc-800 ring-4 ring-zinc-950 rounded-sm origin-top",
                  viewport === 'mobile' ? 'w-[390px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full max-w-5xl'
                )}
                style={{ minHeight: '800px' }}
              >
                 <BuilderCanvas 
                    tree={tree} 
                    setTree={(t: NebulaTree) => { setTree(t); setIsDirty(true); }}
                 />
              </div>
           </div>
        </div>

        {/* 4. RIGHT SIDEBAR (Properties) */}
        <div className="w-72 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 z-10">
           <PropertyPanel 
             tree={tree}
             setTree={(t: NebulaTree) => { setTree(t); setIsDirty(true); }}
           />
        </div>

      </div>

      {/* EXPORT MODAL */}
      {showCodeModal && (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-12 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                 <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2 tracking-widest uppercase">
                    <Code size={14} className="text-indigo-500" />
                    Nebula Engine: Generated Code
                 </h3>
                 <button onClick={() => setShowCodeModal(false)} className="text-zinc-500 hover:text-white p-2 transition-colors"><X size={18}/></button>
              </div>
              <div className="flex-1 relative bg-zinc-950">
                 <textarea 
                   className="w-full h-full bg-transparent p-6 font-mono text-xs text-zinc-400 focus:text-zinc-200 focus:outline-none resize-none leading-relaxed overflow-auto custom-scrollbar"
                   value={codeBuffer}
                   readOnly
                   spellCheck={false}
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

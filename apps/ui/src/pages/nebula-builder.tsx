import React, { useState } from 'react';
import { NebulaOps, DEFAULT_NEBULA_TREE } from '@repo/nebula';
import type { NebulaTree } from '@repo/nebula';
import { NebulaRenderer } from '../features/nebula-renderer/NebulaRenderer.js';
import { NebulaComponentMap } from '@/nebula/component-map.js';
import { Button } from '@/components/ui/button.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Sparkles, Code, Play, Send, Upload, ChevronRight, ChevronDown, Layout, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeEditorPanel } from '@/components/nebula/ThemeEditorPanel.js';

import { trpc } from '@/utils/trpc.js';
import { Textarea } from '@/components/ui/textarea.js';
import CompactRoleSelector from '@/components/CompactRoleSelector.js';
import { ComponentLibrary } from '@/nebula/library.js';
import { ScrollArea } from '@/components/ui/scroll-area.js';
import { Input } from '@/components/ui/input.js';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog.js';
import { 
  Search, Plus, 
  Info, Settings2
} from 'lucide-react';
import { Slider } from '@/components/ui/slider.js';
import type { NodeType } from '@repo/nebula';

// Tree Node Component
const TreeNode = ({ nodeId, tree, level }: { nodeId: string; tree: NebulaTree; level: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const node = tree.nodes[nodeId];
  
  if (!node) return null;
  
  const hasChildren = node.children.length > 0;
  const indent = level * 12;
  
  return (
    <div>
      <div 
        className="flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer text-xs"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : (
          <span className="w-3" />
        )}
        <span className="font-mono text-blue-400">{node.type}</span>
        <span className="text-muted-foreground">#{node.id}</span>
        {node.props.className && (
          <span className="text-green-400 text-[10px]">.{node.props.className.split(' ')[0]}</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(childId => (
            <TreeNode key={childId} nodeId={childId} tree={tree} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};



export default function NebulaBuilderPage() {
  const [tree, setTree] = useState<NebulaTree>(DEFAULT_NEBULA_TREE);
  const [prompt, setPrompt] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<{status: string, message: string, logs?: string[]} | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('structure');
  const [searchQuery, setSearchQuery] = useState('');
  const [customCompType, setCustomCompType] = useState('');
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  const ops = new NebulaOps(tree, setTree);

  const targetParentId = selectedNodeId || tree.rootId;
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (data: any) => {
          console.log('[Nebula UI] Dispatch success! Full response:', data);
          if (data.success) {
              toast.success(`Command Sent! ID: ${data.executionId}`);
              setLastResponse({
                 status: 'success',
                 message: `Successfully dispatched to ${selectedRoleId}. Output: ${typeof data.output === 'string' ? data.output : 'JSON Response Received'}`,
                 logs: data.logs
              });
              setPrompt(''); 

              // Apply Nebula UI actions if present
              const applyAction = (obj: unknown) => {
                console.log('[Nebula UI] Checking object for ui_action:', obj);
                if (obj && typeof obj === 'object' && 'ui_action' in obj && (obj.ui_action as any).tool === 'nebula') {
                    const { action, ...args } = (obj as { ui_action: { action: string } }).ui_action;
                    console.log('[Nebula UI] Found nebula action:', action, 'with args:', args);
                    const nebulaOps = ops as unknown as Record<string, (args: any) => any>;
                    if (typeof nebulaOps[action] === 'function') {
                        console.log(`[Nebula UI] Applying AI action: ${action}`, args);
                        try {
                            const result = nebulaOps[action](args);
                            console.log(`[Nebula UI] Action ${action} completed. Result:`, result);
                        } catch (err) {
                            console.error(`[Nebula UI] Failed to apply action: ${action}`, err);
                            toast.error(`UI Error: Failed to execute ${action}`);
                        }
                    } else {
                        console.error(`[Nebula UI] Action ${action} is not a function on nebulaOps`);
                    }
                } else {
                    console.log('[Nebula UI] Object does not contain nebula ui_action');
                }
              };

              if (Array.isArray(data.output)) {
                  data.output.forEach(applyAction);
              } else {
                  applyAction(data.output);
              }
          } else {
              toast.error(`Execution Failed: ${data.message}`);
              setLastResponse({
                  status: 'error',
                  message: data.message,
                  logs: data.logs
              });
          }
      },
      onError: (err: any) => {
          toast.error(`Failed to dispatch: ${err.message}`);
          setLastResponse({
             status: 'error',
             message: `Error: ${err.message}`
          });
      }
  });

  // AI Handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Nebula] handleFileUpload called');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('[Nebula] No file selected');
      return;
    }

    console.log('[Nebula] File selected:', file.name, file.size, 'bytes');

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('[Nebula] FileReader onload triggered');
      const content = e.target?.result as string;
      console.log('[Nebula] File content length:', content?.length);
      console.log('[Nebula] First 100 chars:', content?.substring(0, 100));
      
      try {
        console.log('[Nebula] Calling ops.ingest with parentId:', tree.rootId);
        const nodeId = ops.ingest(tree.rootId, content);
        console.log('[Nebula] Ingest returned nodeId:', nodeId);
        toast.success(`Imported ${file.name} successfully!`);
      } catch (error) {
        console.error('[Nebula] Ingest error:', error);
         toast.error(`Failed to import ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    reader.onerror = (error) => {
      console.error('[Nebula] FileReader error:', error);
      toast.error(`Failed to read ${file.name}`);
    };
    
    console.log('[Nebula] Starting file read...');
    reader.readAsText(file);
  };

  const handleAiCommand = (promptText: string) => {
     // Check if role is selected
     if (!selectedRoleId) {
         toast.error("Please select a role first.");
         return;
     }
     
     if (!promptText.trim()) return;

     setLastResponse(null);
     
     // Call the orchestrator dispatch via mutation hook
     dispatchMutation.mutate({
         prompt: promptText,
         roleId: selectedRoleId
     });
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBfiWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none" />
      
      {/* Compact Header */}
      <header className="h-12 border-b border-white/10 flex items-center px-3 justify-between bg-slate-900/50 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Nebula</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="file" accept=".tsx,.jsx,.ts,.js" onChange={handleFileUpload} className="hidden" id="file-upload" />
          <label htmlFor="file-upload">
            <Button variant="ghost" size="sm" className="h-8 text-xs cursor-pointer" asChild>
              <span><Upload className="w-3 h-3 mr-1.5" />Import</span>
            </Button>
          </label>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            const json = JSON.stringify(tree, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nebula-tree.json';
            a.click();
          }}>
            <Code className="w-3 h-3 mr-1.5"/>Export
          </Button>
          <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30">
            <Play className="w-3 h-3 mr-1.5"/>Preview
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left: Compact Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-slate-900/30 backdrop-blur-xl flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full h-9 bg-slate-800/50 m-1.5 p-0.5 gap-0.5">
              <TabsTrigger value="structure" className="flex-1 text-[10px] h-full data-[state=active]:bg-purple-600">Tree</TabsTrigger>
              <TabsTrigger value="components" className="flex-1 text-[10px] h-full data-[state=active]:bg-purple-600">Add</TabsTrigger>
              <TabsTrigger value="theme" className="flex-1 text-[10px] h-full data-[state=active]:bg-purple-600">Theme</TabsTrigger>
            </TabsList>

            <TabsContent value="structure" className="flex-1 p-2 overflow-auto m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="space-y-0.5 text-[11px]">
                <TreeNode nodeId={tree.rootId} tree={tree} level={0} />
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <h4 className="font-semibold text-[9px] mb-1.5 uppercase text-purple-400 tracking-wider">Imports</h4>
                <div className="bg-black/40 text-green-400 font-mono text-[9px] p-1.5 rounded border border-white/5">
                  {tree.imports && tree.imports.length > 0 
                    ? tree.imports.map((imp, i) => <div key={i} className="truncate">{imp}</div>) 
                    : <span className="text-neutral-600">None</span>
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="components" className="flex-1 overflow-hidden flex flex-col m-0 data-[state=active]:flex">
              <div className="p-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-7 h-7 text-[11px] bg-black/20 border-white/10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="text-[9px] text-purple-400 font-mono">
                  Target: <span className="text-blue-400">#{targetParentId === tree.rootId ? 'ROOT' : targetParentId}</span>
                </div>
              </div>

              <ScrollArea className="flex-1 px-2">
                <div className="space-y-3 pb-2">
                  {ComponentLibrary.map(category => {
                    const filteredComps = category.components.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (filteredComps.length === 0) return null;
                    return (
                      <section key={category.name}>
                        <h4 className="text-[9px] uppercase font-bold text-purple-400/70 mb-1 px-0.5 tracking-wider">{category.name}</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {filteredComps.map(comp => (
                            <Button 
                              key={comp} 
                              variant="outline" 
                              size="sm" 
                              className="justify-start text-[10px] h-6 px-1.5 bg-slate-800/50 hover:bg-purple-600/20 border-white/10 hover:border-purple-500/50 transition-all" 
                              onClick={() => ops.addNode(targetParentId, { type: comp as NodeType, props: comp === 'Text' ? { content: 'Edit me' } : {} })}
                            >
                              {comp}
                            </Button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                  <section>
                    <h4 className="text-[9px] uppercase font-bold text-pink-400/70 mb-1 px-0.5 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />Logic
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="outline" size="sm" className="text-[10px] h-6 bg-slate-800/50 border-white/10" onClick={() => ops.addNode(targetParentId, { type: 'Loop', logic: { loopData: 'items', iterator: 'item' } })}>Loop</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-6 bg-slate-800/50 border-white/10" onClick={() => ops.addNode(targetParentId, { type: 'Condition', logic: { condition: 'isActive' } })}>If</Button>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="theme" className="flex-1 p-0 overflow-auto m-0">
              <ThemeEditorPanel />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 p-4 flex items-center justify-center overflow-auto">
          <div className="w-full max-w-5xl min-h-[500px] bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            <NebulaRenderer 
              key={tree.rootId}
              tree={tree} 
              nodeId={tree.rootId}
              componentMap={NebulaComponentMap} 
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </div>
        </main>

                           <span>Component type</span>
                           <span className="font-mono text-blue-500">#{selectedNodeId}</span>
                         </div>
                         <div className="text-sm font-bold flex items-center gap-2">
                            {tree.nodes[selectedNodeId].type}
                            <Info className="w-3 h-3 text-muted-foreground" />
                         </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                            <ChevronDown className="w-3 h-3" /> Actions
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => {
                                 const node = tree.nodes[selectedNodeId];
                                 if (node && node.parentId) {
                                   const parent = tree.nodes[node.parentId];
                                   const idx = parent.children.indexOf(selectedNodeId);
                                   if (idx > 0) {
                                     ops.moveNode(selectedNodeId, node.parentId, idx - 1);
                                   }
                                 }
                              }}
                            >
                              Move Up
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => {
                                 const node = tree.nodes[selectedNodeId];
                                 if (node && node.parentId) {
                                   const parent = tree.nodes[node.parentId];
                                   const idx = parent.children.indexOf(selectedNodeId);
                                   if (idx < parent.children.length - 1) {
                                     ops.moveNode(selectedNodeId, node.parentId, idx + 1);
                                   }
                                 }
                              }}
                            >
                              Move Down
                            </Button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                            <Palette className="w-3 h-3" /> Styles & Layout
                          </h4>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                               <label className="text-[10px] font-medium text-muted-foreground">Width</label>
                               <span className="text-[10px] font-mono">{tree.nodes[selectedNodeId].style?.width || 'auto'}</span>
                            </div>
                            <Slider 
                              defaultValue={[100]} 
                              max={100} 
                              step={5}
                              onValueChange={(val) => {
                                const style = tree.nodes[selectedNodeId].style || {};
                                ops.updateNode(selectedNodeId, { style: { ...style, width: val[0] === 100 ? 'w-full' : `w-[${val[0]}%]` } });
                              }}
                            />
                          </div>
                          
                          <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-medium text-muted-foreground">Padding</label>
                                <span className="text-[10px] font-mono">{tree.nodes[selectedNodeId].style?.padding || 'p-0'}</span>
                             </div>
                             <Slider 
                               defaultValue={[4]} 
                               max={24} 
                               step={1}
                               onValueChange={(val) => {
                                 const style = tree.nodes[selectedNodeId].style || {};
                                 ops.updateNode(selectedNodeId, { style: { ...style, padding: `p-${val[0]}` } });
                               }}
                             />
                          </div>
                       </div>

                       <div className="space-y-4 pt-4 border-t">
                          <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                            <Settings2 className="w-3 h-3" /> Properties & Content
                          </h4>
                          
                          {tree.nodes[selectedNodeId].type === 'Text' && (
                             <div className="space-y-2 px-1">
                                <label className="text-[10px] font-medium text-muted-foreground">TEXT CONTENT</label>
                                <Textarea 
                                   className="text-xs min-h-[80px]"
                                   value={tree.nodes[selectedNodeId].props.content || ''}
                                   onChange={(e) => ops.updateNode(selectedNodeId, { props: { ...tree.nodes[selectedNodeId].props, content: e.target.value } })}
                                />
                             </div>
                          )}

                          <div className="space-y-2 px-1">
                             <label className="text-[10px] font-medium text-muted-foreground">PROPS (JSON)</label>
                             <Textarea 
                                className="text-[10px] font-mono min-h-[120px] bg-neutral-900 text-green-400"
                                defaultValue={JSON.stringify(tree.nodes[selectedNodeId].props || {}, null, 2)}
                                onBlur={(e) => {
                                   try {
                                      const newProps = JSON.parse(e.target.value);
                                      ops.updateNode(selectedNodeId, { props: newProps });
                                      toast.success('Props updated');
                                   } catch (_err) {
                                      toast.error('Invalid JSON');
                                   }
                                }}
                             />
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="bg-muted/30 p-4 rounded text-xs text-muted-foreground italic text-center">
                       Select any component on the canvas to edit its properties.
                     </div>
                   )}
                </div>
            </div>

           {/* AI Chat Interface */}
           <div className="h-auto border-t bg-muted/30 p-4 flex flex-col gap-2 relative">
               <div className="flex items-center gap-2 mb-2">
                   <Sparkles className="w-4 h-4 text-purple-500" />
                   <span className="text-sm font-semibold">Nebula Architect</span>
               </div>

               <div className="mb-2 border rounded-md overflow-hidden bg-background">
                  <CompactRoleSelector 
                    selectedRoleId={selectedRoleId} 
                    onSelect={(id: string) => setSelectedRoleId(id)} 
                  />
               </div>
               
               <Textarea 
                 placeholder="Describe the UI layout or changes you want..."
                 className="min-h-[120px] text-xs font-mono resize-none bg-background/50 focus:bg-background transition-colors"
                 value={prompt}
                 onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                 onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if(prompt.trim()) handleAiCommand(prompt);
                    }
                 }}
               />

               <Button 
                   size="sm" 
                   className="w-full gap-2"
                   onClick={() => handleAiCommand(prompt)}
                   disabled={!prompt.trim() || dispatchMutation.isLoading}
                >
                  {dispatchMutation.isLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                  ) : (
                      <>
                        <Send className="w-3 h-3" />
                         Execute Instructions
                      </>
                  )}
               </Button>
               
               <div className="text-[10px] text-muted-foreground text-center mt-1">
                  Using role: {selectedRoleId ? <span className="font-mono text-purple-400">{selectedRoleId}</span> : <span className="text-red-400 font-bold">None Selected</span>}
               </div>
               
               {lastResponse && (
                  <div className={`mt-2 p-2 rounded text-[10px] border flex flex-col gap-1 ${lastResponse.status === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                      <div className="font-semibold">{lastResponse.message}</div>
                      {lastResponse.logs && lastResponse.logs.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-current/20 font-mono opacity-80 whitespace-pre-wrap max-h-32 overflow-auto">
                              {lastResponse.logs.join('\n')}
                          </div>
                      )}
                  </div>
               )}
           </div>
        </aside>
      </div>
    </div>
  );
}

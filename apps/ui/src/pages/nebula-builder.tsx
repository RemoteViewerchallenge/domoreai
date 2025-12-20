import React, { useState } from 'react';
import { NebulaOps, DEFAULT_NEBULA_TREE } from '@repo/nebula';
import type { NebulaTree } from '@repo/nebula';
import { NebulaRenderer } from '../features/nebula-renderer/NebulaRenderer.js';
import { Button } from '@/components/ui/button.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Sparkles, Code, Play, Send, Upload, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeEditorPanel } from '@/components/nebula/ThemeEditorPanel.js';

import { trpc } from '@/utils/trpc.js';
import { Textarea } from '@/components/ui/textarea.js';
import CompactRoleSelector from '@/components/CompactRoleSelector.js';

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
  const [activeTab, setActiveTab] = useState('structure');

  // tRPC Mutation
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
              const applyAction = (obj: any) => {
                console.log('[Nebula UI] Checking object for ui_action:', obj);
                if (obj && obj.ui_action && obj.ui_action.tool === 'nebula') {
                    const { action, ...args } = obj.ui_action;
                    console.log('[Nebula UI] Found nebula action:', action, 'with args:', args);
                    const nebulaOps = ops as any;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
          toast.error(`Failed to dispatch: ${err.message}`);
          setLastResponse({
             status: 'error',
             message: `Error: ${err.message}`
          });
      }
  });

  // Initialize Engine
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ops = new NebulaOps(tree, setTree);

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
        toast.error(`Failed to import ${file.name}: ${error}`);
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
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 justify-between bg-card">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Nebula <span className="text-muted-foreground font-normal">Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".tsx,.jsx,.ts,.js"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import File
              </span>
            </Button>
          </label>
           <Button variant="outline" size="sm" onClick={() => {
              const json = JSON.stringify(tree, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'nebula-tree.json';
              a.click();
           }}>
             <Code className="w-4 h-4 mr-2"/> Export
           </Button>
           <Button variant="ghost" size="sm" onClick={() => {
                // MOCK INGESTION DEMO
                const mockImports = [
                   "import { User } from '@/types'",
                   "import { format } from 'date-fns'"
                ];
                setTree(prev => ({
                    ...prev,
                    imports: mockImports
                }));
                toast.success('Mock Ingested imports!');
           }}>
             Ingest Demo
           </Button>
           <Button size="sm"><Play className="w-4 h-4 mr-2"/> Preview</Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sidebar (Tools & Structure) */}
        <aside className="w-80 border-r bg-muted/20 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b">
                <TabsList className="w-full">
                    <TabsTrigger value="structure" className="flex-1">Structure</TabsTrigger>
                    <TabsTrigger value="components" className="flex-1">Components</TabsTrigger>
                    <TabsTrigger value="theme" className="flex-1">Theme</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="structure" className="flex-1 p-4 overflow-auto">
                {/* Recursive Tree View */}
                <div className="space-y-1">
                  <TreeNode 
                    nodeId={tree.rootId} 
                    tree={tree} 
                    level={0}
                  />
                </div>
                
                {/* Imports Section */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold text-xs mb-2 uppercase text-muted-foreground">Page Imports</h4>
                  <div className="bg-neutral-900 text-green-400 font-mono text-[10px] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {tree.imports && tree.imports.length > 0 
                      ? tree.imports.map((imp, i) => <div key={i}>{imp}</div>) 
                      : <span className="text-neutral-500">No imports detected</span>
                    }
                  </div>
                </div>
            </TabsContent>
            <TabsContent value="components" className="flex-1 p-4">
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start" onClick={() => ops.addNode(tree.rootId, { type: 'Box', props: { className: 'p-4 border rounded' } })}>Container</Button>
                    <Button variant="outline" className="justify-start" onClick={() => ops.addNode(tree.rootId, { type: 'Box', props: { className: 'p-6 shadow-lg rounded-xl bg-card' } })}>Card</Button>
                    <Button variant="outline" className="justify-start" onClick={() => ops.addNode(tree.rootId, { type: 'Text', props: { content: 'Hello World', type: 'h2' } })}>Text</Button>
                    <Button variant="outline" className="justify-start" onClick={() => ops.addNode(tree.rootId, { type: 'Button', props: { children: 'Click Me' } })}>Button</Button>
                 </div>
            </TabsContent>
            <TabsContent value="theme" className="flex-1 p-0 overflow-auto">
                 <ThemeEditorPanel />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Center: Canvas (The Renderer) */}
        <main className="flex-1 bg-neutral-100/50 p-8 flex items-center justify-center overflow-auto relative">
           {/* The Stage */}
           <div className="w-full max-w-4xl min-h-[600px] bg-white shadow-xl rounded-xl border overflow-hidden relative">
              <NebulaRenderer tree={tree} />
           </div>
        </main>

        {/* Right: AI & Properties */}
        <aside className="w-96 border-l bg-card flex flex-col">
           <div className="flex-1 overflow-auto p-4">
               <h3 className="font-semibold mb-4">Properties</h3>
               <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded text-xs text-muted-foreground">
                    Select a node to edit properties.
                  </div>
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

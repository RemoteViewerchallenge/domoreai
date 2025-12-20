import React, { useState } from 'react';
import { NebulaOps, NebulaRenderer, DEFAULT_NEBULA_TREE, type NebulaTree, type NebulaNode } from '@repo/nebula';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Layout, Code, Play } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { ThemeEditorPanel } from '@/components/nebula/ThemeEditorPanel';

import { SuperAiButton } from '@/components/ui/SuperAiButton';

export default function NebulaBuilderPage() {
  const [tree, setTree] = useState<NebulaTree>(DEFAULT_NEBULA_TREE);

  // Initialize Engine
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ops = new NebulaOps(tree, setTree);

  // AI Handler for SuperAiButton
  const handleAiCommand = (prompt: string) => {
     // In a real implementation we would call the mutation here
     // But SuperAiButton handles dispatch via trpc.orchestrator.dispatch
     // We can listen to changes or inject context via the store if needed.
     // For now, we'll just show a toast that it was received.
     toast.info(`AI Command Received: ${prompt}`);
     // TODO: Actually hook up the Nebula Agent
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
           <Button size="sm"><Play className="w-4 h-4 mr-2"/> Preview</Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Sidebar (Tools & Structure) */}
        <aside className="w-80 border-r bg-muted/20 flex flex-col">
          <Tabs defaultValue="structure" className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b">
                <TabsList className="w-full">
                    <TabsTrigger value="structure" className="flex-1">Structure</TabsTrigger>
                    <TabsTrigger value="components" className="flex-1">Components</TabsTrigger>
                    <TabsTrigger value="theme" className="flex-1">Theme</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="structure" className="flex-1 p-4">
                <div className="text-sm text-muted-foreground">Tree View Placeholder (Use AI to build)</div>
                {/* We would render a recursive tree list here */}
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
                   <span className="text-sm font-semibold">Nebula AI Config</span>
                   <div className="flex-1" />
                   {/* We place the SuperAiButton which manages the chat */}
                   <SuperAiButton 
                      contextId="nebula-builder" 
                      className="relative" 
                      expandUp={true}
                      side="left"
                      onGenerate={handleAiCommand}
                   />
               </div>
               <div className="text-xs text-muted-foreground">
                  Click the sparkle button to command the Nebula Architect.
               </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

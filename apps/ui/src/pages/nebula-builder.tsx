import React, { useState } from 'react';
import { NebulaOps } from '@repo/nebula/src/engine/NebulaOps.js';
import { NebulaRenderer } from '@repo/nebula/src/react/NebulaRenderer.js';
import { DEFAULT_NEBULA_TREE } from '@repo/nebula/src/engine/defaults.js';
import { NebulaTree, NebulaNode } from '@repo/nebula/src/core/types.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Layout, Code, Play } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { ThemeEditorPanel } from '@/components/nebula/ThemeEditorPanel';

export default function NebulaBuilderPage() {
  const [tree, setTree] = useState<NebulaTree>(DEFAULT_NEBULA_TREE);
  const [prompt, setPrompt] = useState('');

  // Initialize Engine
  const ops = new NebulaOps(tree);

  // AI Agent Mutation
  const agentMutation = trpc.agent.chat.useMutation({
    onSuccess: (data) => {
        // In a real implementation, the AI would return JSON operations
        // For now, we simulate a response or handle the text
        toast.success("AI Agent finished thinking");
        console.log("AI Response:", data);
    },
    onError: (err) => {
        toast.error(`AI Error: ${err.message}`);
    }
  });

  const handleSendPrompt = () => {
    if(!prompt.trim()) return;

    // 1. Dispatch to AI (Simulated for this UI skeleton)
    agentMutation.mutate({
        message: `Current Tree State: ${JSON.stringify(tree)}. User Request: ${prompt}`,
        agentId: 'nebula-architect' // Hypothetical agent
    });

    // 2. Optimistic / Manual Update (Example)
    // ops.addNode(tree.rootId, { type: 'Card', props: { children: 'AI Generated' } });
    // setTree(ops.getTree()); // Update state
    setPrompt('');
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
           <Button variant="outline" size="sm"><Code className="w-4 h-4 mr-2"/> Export</Button>
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
                <div className="text-sm text-muted-foreground">Tree View Placeholder</div>
                {/* We would render a recursive tree list here */}
            </TabsContent>
            <TabsContent value="components" className="flex-1 p-4">
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start">Container</Button>
                    <Button variant="outline" className="justify-start">Card</Button>
                    <Button variant="outline" className="justify-start">Text</Button>
                    <Button variant="outline" className="justify-start">Button</Button>
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
                  <div className="space-y-2">
                      <label className="text-xs font-medium">Background</label>
                      <Input placeholder="bg-white" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-medium">Padding</label>
                      <Input placeholder="p-4" />
                  </div>
               </div>
           </div>

           {/* AI Chat Interface */}
           <div className="h-1/3 border-t bg-muted/30 p-4 flex flex-col gap-2">
               <div className="flex items-center gap-2 mb-2">
                   <Sparkles className="w-4 h-4 text-purple-600" />
                   <span className="text-sm font-semibold">Nebula AI</span>
               </div>
               <div className="flex-1 bg-background border rounded-md p-2 text-xs text-muted-foreground overflow-auto">
                   Hello! I am ready to help you build. Describe what you want.
               </div>
               <div className="flex gap-2">
                   <Input
                     value={prompt}
                     onChange={e => setPrompt(e.target.value)}
                     placeholder="Add a hero section..."
                     className="bg-background"
                     onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
                   />
                   <Button size="icon" onClick={handleSendPrompt}>
                       <Sparkles className="w-4 h-4" />
                   </Button>
               </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

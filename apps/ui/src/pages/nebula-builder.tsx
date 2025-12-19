// @Role: Frontend Architect
// @Task: Build the Nebula Builder Page
// @Context: This page visualizes the JSON Tree side-by-side with the rendered UI.
// It acts as the "Host" for the AI Agent's operations.

import { useMemo, useState } from 'react';
import { NebulaOps, NebulaRenderer, AstTransformer } from '@repo/nebula';
import type { NebulaTree } from '@repo/nebula';
import MonacoEditor from '../components/MonacoEditor.js';
import { Button } from '../components/ui/button.js';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { Play, RotateCcw, Code, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.js';
import { Textarea } from '../components/ui/textarea.js';

// Initial Empty State
const INITIAL_TREE: NebulaTree = {
  rootId: 'root',
  version: 1,
  nodes: {
    'root': {
      id: 'root',
      type: 'Box',
      props: { className: 'h-full w-full bg-background p-8' },
      style: {},
      layout: { mode: 'flex', direction: 'column', gap: 'gap-4' },
      children: [],
      meta: { label: 'Canvas Root', locked: true }
    }
  }
};

export default function NebulaBuilderPage() {
  const [tree, setTree] = useState<NebulaTree>(INITIAL_TREE);
  const [activeTab, setActiveTab] = useState('preview');
  const [importCode, setImportCode] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Initialize the Engine
  // We use useMemo to ensure the Ops engine instance is stable
  const ops = useMemo(() => new NebulaOps(INITIAL_TREE, (newTree) => {
    setTree(newTree); // Reactivity binding: Engine Update -> React State
  }), []);

  // -- AI SIMULATION HELPERS --
  // These simulate what the AI Agent does via "Code Mode"
  const runAiSimulation = () => {
    // 1. Create a Navbar
    const navId = ops.addNode('root', {
      type: 'Box',
      layout: { mode: 'flex', justify: 'between', align: 'center', gap: 'gap-4' },
      style: { padding: 'p-4', border: 'border-b', background: 'bg-card' }
    });

    // 2. Add Logo Text
    ops.addNode(navId, {
      type: 'Text',
      props: { content: 'Nebula AI', type: 'h2', className: 'font-bold text-xl' }
    });

    // 3. Add a Hero Section Container
    const heroId = ops.addNode('root', {
      type: 'Box',
      layout: { mode: 'flex', direction: 'column', align: 'center', justify: 'center', gap: 'gap-6' },
      style: { padding: 'p-20', background: 'bg-secondary/20', radius: 'rounded-lg' }
    });

    // 4. Add Headline
    ops.addNode(heroId, {
      type: 'Text',
      props: { content: 'Built by Recursive JSON', type: 'h1', className: 'text-4xl font-extrabold tracking-tight' }
    });

    // 5. Add Buttons Row
    const buttonRow = ops.addNode(heroId, {
        type: 'Box',
        layout: { mode: 'flex', gap: 'gap-4' }
    });

    ops.addNode(buttonRow, { type: 'Button', props: { children: 'Get Started', variant: 'default' }});
    ops.addNode(buttonRow, { type: 'Button', props: { children: 'View Specs', variant: 'outline' }});
  };

  // -- IMPORT HANDLER --
  const handleImport = () => {
    try {
      const transformer = new AstTransformer();
      const fragment = transformer.parse(importCode);
      
      if (fragment) {
        // Add the parsed fragment to the root
        ops.ingestTree('root', fragment); 
        
        setImportCode('');
        setIsImportOpen(false);
      }
    } catch (e: unknown) {
      console.error("Failed to parse JSX", e);
      alert("Invalid JSX: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* HEADER */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
          <span className="font-semibold">Nebula Engine</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">v0.1.0</span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTree(INITIAL_TREE)}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button size="sm" onClick={runAiSimulation}>
            <Play className="w-4 h-4 mr-2" /> Run AI Simulation
          </Button>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Code className="w-4 h-4 mr-2" /> Import Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Ingest React/JSX Code</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 px-6">
                <Textarea 
                  placeholder="Paste standard JSX here (e.g. <div className='flex'><Button>Hi</Button></div>)" 
                  className="h-[300px] font-mono text-xs"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                />
                <Button onClick={handleImport}>Explode & Render</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: The "Brain" (JSON Spec) */}
        <div className="w-1/3 border-r flex flex-col bg-slate-950">
          <div className="p-2 border-b border-white/10 text-xs font-mono text-muted-foreground flex justify-between">
            <span>CURRENT_STATE.json</span>
            <span className="text-green-500">Connected</span>
          </div>
          <div className="flex-1 relative">
             <MonacoEditor
               value={JSON.stringify(tree, null, 2)}
               language="json"
               onChange={() => {}} // Read-only for now, bi-directional editing is Task 7
               className="h-full w-full"
             />
          </div>
        </div>

        {/* RIGHT: The "Face" (Renderer) */}
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 flex flex-col relative">
          <div className="absolute top-4 right-4 z-10 flex bg-background rounded-lg border p-1 shadow-sm">
             <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="preview" className="text-xs"><Eye className="w-3 h-3 mr-1"/> Preview</TabsTrigger>
                  <TabsTrigger value="wireframe" className="text-xs"><Code className="w-3 h-3 mr-1"/> Wireframe</TabsTrigger>
                </TabsList>
             </Tabs>
          </div>

          <div className="flex-1 p-8 overflow-auto flex justify-center">
            {/* The Stage */}
            <div className="w-full max-w-5xl h-full bg-background border shadow-xl rounded-lg overflow-hidden transition-all duration-300">
               {activeTab === 'preview' ? (
                 <NebulaRenderer tree={tree} />
               ) : (
                 <pre className="p-4 text-xs text-muted-foreground">Wireframe Mode Not Implemented</pre>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useContext, createContext, useEffect } from "react";
import type { NebulaTree } from "@repo/nebula"; // Ensure @repo/nebula types are available
import { cn } from "../../lib/utils.js";
import { resolveComponent } from "../../nebula/component-map.js";
import { SuperAiButton } from "../../components/ui/SuperAiButton.js";
import { Eye, EyeOff } from "lucide-react";

// --- CONTEXT FOR AI OVERLAY & FORM BINDINGS ---
interface NebulaContextType {
  showAiOverlay: boolean;
  toggleAiOverlay: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bindings: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setBinding: (key: string, value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleAction: (action: string, payload?: any) => void;
}

export const NebulaContext = createContext<NebulaContextType>({
  showAiOverlay: true,
  toggleAiOverlay: () => {},
  bindings: {},
  setBinding: () => {},
  handleAction: () => {},
});

// --- THE ROOT CONTAINER ---
interface NebulaRootProps {
  tree: NebulaTree;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialBindings?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction?: (action: string, payload?: any, bindings?: Record<string, any>) => void;
}

export const NebulaRendererRoot: React.FC<NebulaRootProps> = ({ tree, initialBindings = {}, onAction }) => {
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [bindings, setBindings] = useState(initialBindings);

  const setBinding = (key: string, value: any) => {
    setBindings(prev => ({ ...prev, [key]: value }));
  };

  const handleAction = (action: string, payload?: any) => {
      onAction?.(action, payload, bindings);
  };

  return (
    <NebulaContext.Provider value={{ 
        showAiOverlay, 
        toggleAiOverlay: () => setShowAiOverlay(!showAiOverlay),
        bindings,
        setBinding,
        handleAction
    }}>
      
      {/* 1. RENDER THE ACTUAL UI TREE */}
      <div className="w-full h-full relative isolate">
         <NebulaNodeRenderer tree={tree} nodeId={tree.rootId} />
      </div>

      {/* 2. GLOBAL AI TOGGLE (Bottom Left) */}
      <div className="fixed bottom-4 left-4 z-[99999] pointer-events-auto">
         <button 
           onClick={() => setShowAiOverlay(!showAiOverlay)}
           className={cn(
             "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl transition-all border backdrop-blur-md",
             showAiOverlay 
               ? "bg-purple-600/90 text-white border-purple-400" 
               : "bg-zinc-800/90 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
           )}
         >
           {showAiOverlay ? <Eye size={14}/> : <EyeOff size={14}/>}
           {showAiOverlay ? "AI HUD: ON" : "AI HUD: OFF"}
         </button>
      </div>

    </NebulaContext.Provider>
  );
};

// --- LOCAL TYPE DEFINITION ---
interface RendererNode {
  id: string;
  type: string;
  componentName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
  children?: string[];
  style?: React.CSSProperties;
  className?: string; // Extended property
  meta?: {
    aiConfig?: { defaultRole?: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// --- RECURSIVE NODE RENDERER ---
const NebulaNodeRenderer = ({ tree, nodeId }: { tree: NebulaTree, nodeId: string }) => {
  // Cast to RendererNode to support extra properties like className and nested meta
  const node = tree.nodes[nodeId] as unknown as RendererNode;
  const { showAiOverlay, bindings, setBinding, handleAction } = useContext(NebulaContext);
  if (!node) return null;

  // Resolve Style (Map generic tokens to CSS)
  const style: React.CSSProperties = {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     ...node.style as any, // Cast for speed
     position: 'relative', // Necessary for normal flow
  };

  // Determine Component to Render
  let ComponentToRender = resolveComponent('Box'); // Default
  let childrenToRender: React.ReactNode = null;

  if (node.type === "Component" && node.componentName) {
    // IT IS A BLACK BOX (AgentWorkbench, etc.)
    ComponentToRender = resolveComponent(node.componentName);
  } else if (node.type === "Text") {
    // IT IS TEXT
    ComponentToRender = resolveComponent('Text');
  } 
  
  // Handle Children (Recursion)
  if (node.children && node.children.length > 0) {
    childrenToRender = node.children.map(childId => (
      <NebulaNodeRenderer key={childId} tree={tree} nodeId={childId} />
    ));
  } else if (node.type === 'Text') {
    childrenToRender = null; // Text component handles content via props
  }

  // --- AUTOMAGIC DATA BINDING ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalProps: any = { ...node.props, id: node.id };
  
  // 1. Value Binding
  if (finalProps['data-binding']) {
      const key = finalProps['data-binding'];
      finalProps.value = bindings[key] || '';
      
      // Handle standard inputs
      finalProps.onChange = (e: any) => {
          const val = e.target ? e.target.value : e; // Support generic 'onChange' components too
          setBinding(key, val);
      };
      // Handle badge/button selection logic if needed (simple toggle or set)
      if (node.componentName === 'Badge') {
           finalProps.onClick = () => setBinding(key, finalProps['data-value']);
           // Highlight if selected
           if (bindings[key] === finalProps['data-value']) {
               finalProps.className = cn(finalProps.className, "bg-purple-600 text-white border-purple-400");
           }
      }
  }

  // 2. Action Binding
  if (finalProps['data-action']) {
      finalProps.onClick = () => handleAction(finalProps['data-action']);
  }

  return (
    <>
      <div 
        id={node.id}
        className={cn("group/node relative flex flex-col", node.className)} // Flex col default for safety
        style={style}
      >
        {/* RENDER THE COMPONENT */}
        <ComponentToRender {...finalProps}>
           {childrenToRender}
        </ComponentToRender>

        {/* AI OVERLAY BUTTON (Only on Hover, High Z-Index) */}
        {showAiOverlay && (
          <div className="absolute -top-3 -right-3 z-[100] opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-auto">
             <SuperAiButton 
                contextId={node.id}
                defaultRoleId={node.meta?.aiConfig?.defaultRole || 'developer'} 
                side="right" // Expand right to avoid clipping
                className="scale-75 shadow-xl"
              />
          </div>
        )}
        
        {/* SELECTION BORDER (Visual Debugger) */}
        {showAiOverlay && (
          <div className="absolute inset-0 border border-purple-500/0 group-hover/node:border-purple-500/30 pointer-events-none rounded transition-colors" />
        )}
      </div>
    </>
  );
};

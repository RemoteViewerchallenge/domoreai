import React, { useState, useContext, createContext, useMemo } from "react";
import type { NebulaTree, NebulaNode } from "@repo/nebula";
import { cn } from "../../lib/utils.js";
import { resolveComponent, ComponentManifest } from "../../nebula/registry.js";
import { SuperAiButton } from "../../components/ui/SuperAiButton.js";
import { Eye, EyeOff } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { useWorkspaceStore } from "../../stores/workspace.store.js";

// --- THE CONTEXT FOR STATE & ACTIONS ---
interface NebulaContextType {
  showAiOverlay: boolean;
  toggleAiOverlay: () => void;
  bindings: Record<string, unknown>;
  setBinding: (key: string, value: unknown) => void;
  handleAction: (action: string, payload?: unknown) => void;
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
  initialBindings?: Record<string, unknown>;
  onAction?: (action: string, payload?: unknown, bindings?: Record<string, unknown>) => void;
}

export const NebulaRendererRoot: React.FC<NebulaRootProps> = ({ tree, initialBindings = {}, onAction }) => {
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [bindings, setBindings] = useState<Record<string, unknown>>(initialBindings);

  const setBinding = (key: string, value: unknown) => {
    setBindings(prev => ({ ...prev, [key]: value }));
  };

  const { addCard } = useWorkspaceStore();

  const handleAction = (action: string, payload?: unknown) => {
      if (action === 'workbench:spawn-card') {
          const { roleId, column = 0 } = (payload as { roleId?: string, column?: number }) || {};
          addCard({ 
              id: String(Date.now()), 
              roleId: roleId || 'developer', 
              column: column 
          });
      }
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
      <div className="w-full h-full relative isolate">
         <NebulaRenderer node={tree.nodes[tree.rootId]} tree={tree} />
      </div>

      {/* Global AI HUD Toggle */}
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

// --- LOCAL TYPE EXTENSION ---
interface ExtendedNebulaNode extends Omit<NebulaNode, 'type' | 'children'> {
  type: string; // Allow string for component names
  className?: string;
  children?: (string | NebulaNode | ExtendedNebulaNode)[];
}

// --- CONSOLIDATED RECURSIVE RENDERER ---
export const NebulaRenderer: React.FC<{ node: NebulaNode; tree: NebulaTree }> = ({ node: baseNode, tree }) => {
  const node = baseNode as unknown as ExtendedNebulaNode;
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { showAiOverlay, bindings, setBinding, handleAction } = useContext(NebulaContext);

  // 1. Prepare Hooks FIRST (Rules of Hooks)
  const ComponentToRender = useMemo(() => {
     const type = (node.type === 'Component' && node.componentName) ? node.componentName : node.type;
     return resolveComponent(type);
  }, [node.type, node.componentName]);

  const finalProps = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ref: _ref, key: _key, ...restProps } = (node.props || {}) as Record<string, unknown>;
    
    const props: Record<string, unknown> = {
      ...restProps,
      id: node.id,
      className: node.className 
    };

    if (node.responsive?.mode) {
      props.layoutMode = isMobile ? node.responsive.mode.mobile : node.responsive.mode.desktop;
    }

    if (typeof props['data-binding'] === 'string') {
      const key = props['data-binding'];
      props.value = bindings[key] ?? '';
      
      props.onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | number | boolean) => {
          const val = (e && typeof e === 'object' && 'target' in e) 
            ? (e.target as HTMLInputElement | HTMLTextAreaElement).value 
            : e; 
          setBinding(key, val);
      };

      if (node.type === 'Badge' || node.componentName === 'Badge') {
           props.onClick = () => setBinding(key, props['data-value']);
           if (bindings[key] === props['data-value']) {
               props.className = cn(props.className as string, "bg-purple-600 text-white border-purple-400");
           }
      }
    }

    if (typeof props['data-action'] === 'string') {
      props.onClick = () => handleAction(props['data-action'] as string);
    }

    // --- SLOT RESOLUTION ---
    const manifest = ComponentManifest[node.type] || ComponentManifest[node.componentName || ''];
    if (manifest?.meta?.slots) {
      manifest.meta.slots.forEach(slotName => {
        const slotValue = props[slotName];
        if (slotValue) {
          const slotNode = typeof slotValue === 'string' ? tree.nodes[slotValue] : (slotValue as NebulaNode);
          if (slotNode) {
            props[slotName] = <NebulaRenderer key={slotNode.id} node={slotNode} tree={tree} />;
          }
        }
      });
    }

    return props;
  }, [node.props, node.id, node.className, node.responsive, node.type, node.componentName, isMobile, bindings, setBinding, handleAction, tree]);

  const childrenToRender = useMemo(() => {
    if (!node.children || node.children.length === 0) return null;
    
    return node.children.map((childOrId, idx) => {
        const childNode = typeof childOrId === 'string' ? tree.nodes[childOrId] : childOrId;
        if (!childNode) return null;
        return <NebulaRenderer key={(childNode as NebulaNode).id || idx} node={childNode as NebulaNode} tree={tree} />;
    });
  }, [node.children, tree]);

  // 2. Early Return AFTER Hooks
  if (node.responsive?.visibility) {
    const visibility = isMobile ? node.responsive.visibility.mobile : node.responsive.visibility.desktop;
    if (visibility === 'hidden') return null;
  }

  const wrapperStyle: React.CSSProperties = {
     ...(node.style as React.CSSProperties),
     position: 'relative'
  };

  interface LayoutProps {
    className?: string;
    flex?: number;
    hFull?: boolean;
  }
  const p = (node.props || {}) as LayoutProps;

  const layoutClasses = cn(
    "relative group/node",
    node.className,
    p.className, // Allow props to dictate layout
    node.type === 'Flex' ? "flex" : "block",
    p.flex === 1 ? "flex-1" : "",
    p.hFull ? "h-full" : ""
  );

  return (
    <div 
        id={node.id} 
        className={layoutClasses} 
        style={wrapperStyle}
    >
      <ComponentToRender {...finalProps}>
        {childrenToRender}
      </ComponentToRender>

      {showAiOverlay && (
        <div className="absolute -top-3 -right-3 z-[100] opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-auto">
           <SuperAiButton 
              contextId={node.id}
              defaultRoleId={node.meta?.aiConfig?.defaultRole || 'developer'} 
              side="right" 
              className="scale-75 shadow-xl"
            />
        </div>
      )}
      
      {showAiOverlay && (
        <div className="absolute inset-0 border border-purple-500/0 group-hover/node:border-purple-500/30 pointer-events-none rounded transition-colors" />
      )}
    </div>
  );
};

import React, { useState } from "react";
import type { NebulaTree, NebulaNode, Alignment } from "@repo/nebula";
import { cn } from "../../lib/utils.js"; // Adapting to local UI utils
import { SuperAiButton } from "../../components/ui/SuperAiButton.js";
import { THEME_SCOPES } from "../../theme/design-tokens.js";
import { Eye, EyeOff } from "lucide-react";

// 1. The Component Registry (Map JSON 'type' to React Component)
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

interface TextProps extends BaseProps {
  content?: string;
  type?: string;
}

interface ButtonProps extends BaseProps {
  variant?: "outline" | "default";
}

interface IconProps extends BaseProps {
  size?: number | string;
}

const Registry: Record<string, React.ComponentType<any>> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  Box: ({ className, children, ...props }: BaseProps) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  Text: ({ content, className, type }: TextProps) => {
    const Tag = (
      type === "h1" ? "h1" : type === "h2" ? "h2" : "p"
    ) as keyof JSX.IntrinsicElements;
    return <Tag className={className}>{content}</Tag>;
  },
  Button: ({ children, className, variant, ...props }: ButtonProps) => {
    const base = "px-4 py-2 rounded font-medium transition-colors";
    const styles =
      variant === "outline"
        ? "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300"
        : "bg-blue-600 text-white hover:bg-blue-700";
    return (
      <button className={cn(base, styles, className)} {...props}>
        {children}
      </button>
    );
  },
  h1: ({ className, children, ...props }: BaseProps) => (
    <h1 className={cn("text-2xl font-bold", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: BaseProps) => (
    <h2 className={cn("text-xl font-semibold", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: BaseProps) => (
    <h3 className={cn("text-lg font-medium", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }: BaseProps) => (
    <p className={className} {...props}>
      {children}
    </p>
  ),
  span: ({ className, children, ...props }: BaseProps) => (
    <span className={className} {...props}>
      {children}
    </span>
  ),
  label: ({ className, children, ...props }: BaseProps) => (
    <label className={cn("text-sm font-medium", className)} {...props}>
      {children}
    </label>
  ),
  input: ({ className, ...props }: BaseProps) => (
    <input
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm",
        className
      )}
      {...props}
    />
  ),
  select: ({ className, children, ...props }: BaseProps) => (
    <select
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </select>
  ),
  option: ({ children, ...props }: BaseProps) => (
    <option {...props}>{children}</option>
  ),
  Icon: ({ className, size = 16 }: IconProps) => (
    <div
      className={cn(
        "flex items-center justify-center text-zinc-400",
        className
      )}
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full border-2 border-dashed border-current rounded-sm opacity-50" />
    </div>
  ),
};

interface RendererProps {
  tree: NebulaTree;
  nodeId?: string; // Entry point, defaults to root
  componentMap?: Record<string, React.ComponentType<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  dataContext?: Record<string, unknown>; // Data context for bindings and logic
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

// A Context to toggle AI Buttons globally
export const NebulaContext = React.createContext({
  showAiOverlay: false,
  toggleAiOverlay: () => {},
});

export const NebulaRendererRoot: React.FC<RendererProps> = ({ 
  tree, 
  componentMap,
  dataContext,
  selectedNodeId,
  onSelectNode 
}) => {
  const [showAiOverlay, setShowAiOverlay] = useState(false); // Default OFF

  return (
    <NebulaContext.Provider value={{ showAiOverlay, toggleAiOverlay: () => setShowAiOverlay(!showAiOverlay) }}>
      
      {/* GLOBAL TOGGLE (Fixed to bottom-left of screen, always visible in Editor) */}
      <div className="fixed bottom-4 left-4 z-[99999] flex gap-2">
         <button 
           onClick={() => setShowAiOverlay(!showAiOverlay)}
           className={cn(
             "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl transition-all border",
             showAiOverlay 
               ? "bg-purple-600 text-white border-purple-400" 
               : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
           )}
         >
           {showAiOverlay ? <Eye size={14}/> : <EyeOff size={14}/>}
           {showAiOverlay ? "AI HUD: ON" : "AI HUD: OFF"}
         </button>
      </div>

      {/* RENDERER START */}
      <div className={cn("w-full h-full relative", THEME_SCOPES.app)}>
         <NebulaRenderer 
           tree={tree} 
           nodeId={tree.rootId} 
           componentMap={componentMap}
           dataContext={dataContext}
           selectedNodeId={selectedNodeId}
           onSelectNode={onSelectNode}
         />
      </div>

    </NebulaContext.Provider>
  );
};

export const NebulaRenderer: React.FC<RendererProps> = React.memo(
  ({
    tree,
    nodeId = tree.rootId,
    componentMap = Registry,
    dataContext = {} as Record<string, unknown>,
    selectedNodeId,
    onSelectNode,
  }) => {
    const node = tree.nodes[nodeId];
    const { showAiOverlay } = React.useContext(NebulaContext);

    if (!node) {
      console.log("[NebulaRenderer] Node not found:", nodeId);
      return null;
    }

    if (
      node.type === "Text" &&
      (!node.props.content || !node.props.content.trim())
    ) {
      return null;
    }

    if (node.type === "Loop" && node.logic) {
      const items = getNestedValue(dataContext, node.logic.loopData || "", []);

      return (
        <>
          {(items as unknown[]).map((item, index) => {
            const newContext = {
              ...dataContext,
              [node.logic!.iterator || "item"]: item,
              index,
            };

            return node.children[0] ? (
              <NebulaRenderer
                key={index}
                tree={tree}
                nodeId={node.children[0]}
                componentMap={componentMap}
                dataContext={newContext}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
              />
            ) : null;
          })}
        </>
      );
    }

    if (node.type === "Condition" && node.logic) {
      const conditionValue = evaluateCondition(
        node.logic.condition || "",
        dataContext
      );

      if (!conditionValue) return null;

      return node.children[0] ? (
        <NebulaRenderer
          tree={tree}
          nodeId={node.children[0]}
          componentMap={componentMap}
          dataContext={dataContext}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      ) : null;
    }

    if (node.type === "Component" && node.componentName) {
      const CustomComponent = componentMap[node.componentName];

      if (CustomComponent) {
        const resolvedProps = resolveBindings(node, dataContext);
        return <CustomComponent {...resolvedProps} />;
      }

      return (
        <div className="text-red-500 text-xs p-2 border border-red-500/30 rounded">
          Missing Component: {node.componentName}
        </div>
      );
    }

    const Component = componentMap[node.type];
    const isFallback = false;

    if (!Component) {
      return (
        <div className="border border-dashed border-yellow-300 bg-yellow-50 p-2">
          <span className="text-xs text-yellow-700">Missing: {node.type}</span>
        </div>
      );
    }

    const layoutClasses = resolveLayout(node.layout);
    const styleClasses = resolveStyles(node.style);
    const combinedClasses = cn(
      layoutClasses,
      styleClasses,
      node.props.className as string
    );

    const resolvedProps = resolveBindings(node, dataContext);
    const sanitizedProps = { ...resolvedProps };
    delete sanitizedProps.key;

    if (typeof sanitizedProps.style === "string") {
      delete sanitizedProps.style;
    }

    Object.keys(sanitizedProps).forEach((key) => {
      if (key.startsWith("on") && typeof sanitizedProps[key] === "string") {
        delete sanitizedProps[key];
      }
    });

    const VOID_ELEMENTS = [
      "input", "img", "br", "hr", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr",
    ];

    const isVoid = VOID_ELEMENTS.includes(node.type.toLowerCase());

    if (isVoid) {
      delete sanitizedProps.children;
    }

    const isSelected = selectedNodeId === node.id;

    const innerContent = isVoid ? null : (
      <>
        {isFallback && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1 z-10">
            Fallback: {node.type}
          </div>
        )}

        {node.children.length > 0
          ? node.children.map((childId: string) => (
              <NebulaRenderer
                key={childId}
                tree={tree}
                nodeId={childId}
                componentMap={componentMap}
                dataContext={dataContext}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
              />
            ))
          : (node.props.children as React.ReactNode)}
      </>
    );

    const content = isVoid ? (
      <Component
        {...sanitizedProps}
        className={cn(
          combinedClasses,
          isFallback &&
            "border-2 border-dashed border-red-400 overflow-hidden relative"
        )}
        data-nebula-id={node.id}
      />
    ) : (
      <Component
        {...sanitizedProps}
        className={cn(
          combinedClasses,
          isFallback &&
            "border-2 border-dashed border-red-400 overflow-hidden relative"
        )}
        data-nebula-id={node.id}
      >
        {innerContent}
      </Component>
    );

    // Resolving Styles using tokens if needed
    // Note: The UI builder might already be providing these as classes
    // But we ensure the ghost layer sits above.

    const finalContent = (
      <div className="relative group/node">
        {content}

        {/* 2. AI OVERLAY (Only renders if Toggle is ON) */}
        {showAiOverlay && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[50] outline outline-1 outline-dashed outline-purple-500/30">
            {/* The Button - Forced Top-Left and Pointer-Events-Auto */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-[9999]">
              <SuperAiButton 
                contextId={node.id}
                side="right" // Expands to the right so it doesn't go off-screen
                className="scale-75 shadow-2xl" 
              />
            </div>
          </div>
        )}
      </div>
    );

    if (onSelectNode) {
      return (
        <div
          className={cn(
            "relative group/nebula",
            isSelected && "ring-2 ring-blue-500 ring-offset-2 z-50 rounded"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(node.id);
          }}
        >
          {isSelected && (
            <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-t font-bold whitespace-nowrap z-[60]">
              {node.type}{" "}
              <span className="opacity-70 font-mono text-[8px]">
                #{node.id}
              </span>
            </div>
          )}
          {finalContent}
        </div>
      );
    }

    return finalContent;
  }
);

NebulaRenderer.displayName = "NebulaRenderer";

function resolveLayout(layout: NebulaNode["layout"]) {
  if (!layout) return "";
  const classes = [];

  if (layout.mode === "flex") {
    classes.push("flex");
    if (layout.direction === "column") classes.push("flex-col");
    else if (layout.direction === "row") classes.push("flex-row");
    else if (layout.direction === "column-reverse")
      classes.push("flex-col-reverse");
    else if (layout.direction === "row-reverse")
      classes.push("flex-row-reverse");

    classes.push(mapAlignment(layout.justify, "justify"));
    classes.push(mapAlignment(layout.align, "items"));

    if (layout.wrap) classes.push("flex-wrap");
  } else if (layout.mode === "grid") {
    classes.push("grid");
    if (layout.columns) {
      classes.push(`grid-cols-${layout.columns}`);
    }
    classes.push(mapAlignment(layout.justify, "justify"));
    classes.push(mapAlignment(layout.align, "items"));
  } else if (layout.mode === "absolute") {
    classes.push("absolute");
  }

  if (layout.gap) classes.push(layout.gap);
  return classes.join(" ");
}

function mapAlignment(
  align: Alignment | undefined,
  prefix: "justify" | "items"
): string {
  if (!align) return "";
  switch (align) {
    case "start":
      return `${prefix}-start`;
    case "center":
      return `${prefix}-center`;
    case "end":
      return `${prefix}-end`;
    case "between":
      return prefix === "justify" ? "justify-between" : "";
    case "around":
      return prefix === "justify" ? "justify-around" : "";
    case "stretch":
      return prefix === "items" ? "items-stretch" : "justify-stretch";
    default:
      return "";
  }
}

function resolveStyles(style: NebulaNode["style"]) {
  return Object.values(style || {})
    .filter((val): val is string => typeof val === "string")
    .join(" ");
}

function resolveBindings(
  node: NebulaNode,
  dataContext: Record<string, unknown>
): Record<string, unknown> {
  const resolvedProps = { ...node.props } as Record<string, unknown>;

  if (node.bindings && node.bindings.length > 0) {
    node.bindings.forEach((binding) => {
      const value = getNestedValue(
        dataContext,
        binding.sourcePath,
        binding.defaultValue
      );
      resolvedProps[binding.propName] = value;
    });
  }

  return resolvedProps;
}

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: unknown = undefined
): unknown {
  if (!path) return defaultValue;

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }

  return current !== undefined ? current : defaultValue;
}

function evaluateCondition(
  condition: string,
  dataContext: Record<string, unknown>
): boolean {
  if (!condition) return false;
  const value = getNestedValue(dataContext, condition, false);
  return Boolean(value);
}

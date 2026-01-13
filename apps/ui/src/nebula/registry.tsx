import React from 'react';
import { NebulaButton } from "../components/nebula/primitives/NebulaButton.js";
import { NebulaCard } from "../components/nebula/primitives/NebulaCard.js";
import { NebulaGrid } from "../components/nebula/primitives/NebulaGrid.js";
import { RoleManagementGrid } from "../features/roles/RoleManagementGrid.js";
import { Canvas } from "../components/nebula/system/Canvas.js";
import { PropertyPanel } from "../components/nebula/system/PropertyPanel.js";
import { cn } from "../lib/utils.js";

export type ComponentCategory = 'layout' | 'atom' | 'molecule' | 'data' | 'feature' | 'system';

export interface PropSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'function' | 'json';
  options?: string[];
  defaultValue?: unknown;
  description?: string;
}

export interface ComponentDefinition {
  component: React.ElementType;
  meta: {
    label: string;
    category: ComponentCategory;
    icon?: string;
    hidden?: boolean;
  };
  propSchema: {
    [key: string]: PropSchema;
  };
}

export const ComponentManifest: Record<string, ComponentDefinition> = {
  // ==============================
  // 🟢 PRIMITIVES (The Body)
  // ==============================
  
  "Primitive:Button": {
    component: NebulaButton,
    meta: { label: "Nebula Button", category: "atom", icon: "cursor-click" },
    propSchema: {
      label: { type: "string", defaultValue: "Click Me" },
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
      onClick: { type: "function" }
    }
  },

  "Primitive:Card": {
    component: NebulaCard,
    meta: { label: "Nebula Card", category: "atom", icon: "card" },
    propSchema: {
      title: { type: "string", defaultValue: "Card Title" }
    }
  },

  "Primitive:Grid": {
    component: NebulaGrid,
    meta: { label: "Empty Grid", category: "data", icon: "table" },
    propSchema: { 
        title: { type: "string" }, 
        columns: { type: "json" } 
    }
  },

  "Box": {
    component: ({ className, children, style, layout, ...props }: any) => {
        const tokenClasses = cn(
            style?.padding, style?.background, style?.color, style?.radius, 
            style?.shadow, style?.width, style?.height, style?.border,
            layout?.mode, layout?.direction, layout?.align, layout?.justify, layout?.gap
        );
        return <div className={cn(tokenClasses, className)} {...props}>{children}</div>;
    },
    meta: { label: "Container (Div)", category: "layout", icon: "box" },
    propSchema: {
      className: { type: "string", defaultValue: "p-4" }
    }
  },

  "Text": {
    component: ({ content, children, className, style, layout, ...props }: any) => {
        const tokenClasses = cn(
            style?.padding, style?.color, style?.fontSize, style?.fontWeight, style?.textAlign,
            layout?.mode
        );
        return <span className={cn(tokenClasses, className)} {...props}>{content}{children}</span>;
    },
    meta: { label: "Text / Span", category: "atom", icon: "text-t" },
    propSchema: {
      content: { type: "string", defaultValue: "" },
      className: { type: "string", defaultValue: "" }
    }
  },

  "Image": {
    component: ({ src, alt, className, style, layout, ...props }: any) => {
        const tokenClasses = cn(
            style?.padding, style?.radius, style?.width, style?.height, style?.border,
            layout?.mode
        );
        return <img src={src} alt={alt} className={cn(tokenClasses, className)} {...props} />;
    },
    meta: { label: "Image", category: "atom", icon: "image" },
    propSchema: {
      src: { type: "string", defaultValue: "" },
      alt: { type: "string", defaultValue: "" }
    }
  },

  "Input": {
    component: ({ placeholder, value, type = "text", className, style, layout, ...props }: any) => {
        const tokenClasses = cn(
            style?.padding, style?.background, style?.color, style?.radius, 
            style?.width, style?.height, style?.border,
            layout?.mode
        );
        return (
            <input 
                type={type}
                placeholder={placeholder} 
                value={value} 
                className={cn("bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs", tokenClasses, className)} 
                {...props} 
            />
        );
    },
    meta: { label: "Input Field", category: "atom", icon: "text-input" },
    propSchema: {
      placeholder: { type: "string", defaultValue: "Enter text..." },
      type: { type: "select", options: ["text", "password", "email", "number"], defaultValue: "text" }
    }
  },

  "Button": {
    component: NebulaButton,
    meta: { label: "Primitive Button", category: "atom", icon: "cursor-click" },
    propSchema: {
      label: { type: "string", defaultValue: "Button" },
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
      onClick: { type: "function" }
    }
  },

  "Component": {
    component: ({ name, children, ...props }: any) => (
        <div className="border border-dashed border-indigo-500/50 rounded p-2 bg-indigo-500/5">
            <div className="text-[9px] text-indigo-400 font-bold uppercase mb-1">Component: {name || props.componentName}</div>
            {children}
            {!children && <div className="text-[8px] text-zinc-600 italic">Custom Logic Block</div>}
        </div>
    ),
    meta: { label: "Custom Component", category: "molecule", icon: "box" },
    propSchema: {
        name: { type: "string" }
    }
  },

  "Icon": {
    component: ({ name, size = 16, className, ...props }: any) => (
        <div className={cn("inline-flex items-center justify-center bg-zinc-800 rounded p-1", className)}>
            <div className="text-[8px] text-zinc-400 font-mono">ICON:{name}</div>
        </div>
    ),
    meta: { label: "Semantic Icon", category: "atom", icon: "image" },
    propSchema: {
        name: { type: "string" },
        size: { type: "number", defaultValue: 16 }
    }
  },

  // ==============================
  // 🔵 FEATURES (The Soul)
  // ==============================

  "Feature:RoleGrid": {
    component: RoleManagementGrid,
    meta: { label: "Role Manager", category: "feature", icon: "users" },
    propSchema: {} 
  },

  // ==============================
  // 🔴 SYSTEM (The Engine)
  // ==============================

  "System:Canvas": {
    component: Canvas,
    meta: { label: "Builder Canvas", category: "system", hidden: true },
    propSchema: {}
  },

  "System:PropPanel": {
    component: PropertyPanel,
    meta: { label: "Property Editor", category: "system", hidden: true },
    propSchema: {}
  }
};

export const ComponentMap: Record<string, React.ElementType> = Object.keys(ComponentManifest).reduce(
  (acc, key) => {
    acc[key] = ComponentManifest[key].component;
    return acc;
  }, 
  {} as Record<string, React.ElementType>
);

export const resolveComponent = (name: string): React.ElementType => {
    return ComponentMap[name] || ComponentMap['Box'];
};

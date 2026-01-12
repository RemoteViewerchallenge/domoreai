import React from 'react';
import { NebulaButton } from "../components/nebula/primitives/NebulaButton.js";
import { NebulaCard } from "../components/nebula/primitives/NebulaCard.js";
import { NebulaGrid } from "../components/nebula/primitives/NebulaGrid.js";
import { RoleManagementGrid } from "../features/roles/RoleManagementGrid.js";
import { Canvas } from "../components/nebula/system/Canvas.js";
import { PropertyPanel } from "../components/nebula/system/PropertyPanel.js";

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
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" }
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
    component: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...props}>{children}</div>,
    meta: { label: "Container (Div)", category: "layout", icon: "box" },
    propSchema: {
      className: { type: "string", defaultValue: "p-4" }
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


import React from 'react';

// --- 1. IMPORT YOUR ATOMIC COMPONENTS (The "Public" LEGO Blocks) ---
// These are safe for any app to use.
import { NebulaButton } from '../components/nebula/NebulaButton.js';
import { NebulaCard } from '../components/nebula/NebulaCard.js';
import { SmartGrid } from '../components/nebula/SmartGrid.js';
import { HeroSection } from '../components/nebula/HeroSection.js';

// --- 2. IMPORT SYSTEM TOOLS (The "Internal" Workbench) ---
// These are only used by the Builder/OS, never by a user app.
import { BuilderCanvas } from './features/builder/BuilderCanvas.js';
import { PropertyPanel } from './features/builder/PropertyPanel.js';

// --- 3. DEFINE TYPES ---

export type ComponentCategory = 'layout' | 'atom' | 'molecule' | 'data' | 'system';

interface ComponentDefinition {
  /** The React Component itself */
  component: React.ElementType;
  /** Metadata for the Builder UI */
  meta: {
    label: string; // Human readable name
    category: ComponentCategory;
    icon?: string; // Icon name for the sidebar
    hidden?: boolean; // If true, hides from the drag-and-drop list completely
  };
  /** The Contract: What props does this component accept? */
  /** Used by the Builder to generate inputs, and by AI to validate JSON. */
  propSchema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'function';
      options?: string[]; // For select dropdowns
      defaultValue?: unknown;
      description?: string; // Helper text for AI/User
    };
  };
}

// --- 4. THE REGISTRY (The Source of Truth) ---

export const NebulaRegistry: Record<string, ComponentDefinition> = {
  
  // ==============================
  // 🟢 PUBLIC COMPONENTS (User App)
  // ==============================

  "Box": {
    component: ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...props}>{children}</div>,
    meta: { label: "Container (Div)", category: "layout", icon: "box" },
    propSchema: {
      className: { type: "string", defaultValue: "p-4", description: "Tailwind classes" }
    }
  },

  "NebulaButton": {
    component: NebulaButton,
    meta: { label: "Smart Button", category: "atom", icon: "cursor-click" },
    propSchema: {
      label: { type: "string", defaultValue: "Click Me" },
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
      actionId: { type: "string", description: "The ID of the action to trigger (backend)" }
    }
  },

  "NebulaCard": {
    component: NebulaCard,
    meta: { label: "Smart Card", category: "atom", icon: "card" },
    propSchema: {
      title: { type: "string", defaultValue: "Card Title" }
    }
  },

  "SmartGrid": {
    component: SmartGrid,
    meta: { label: "Data Grid", category: "data", icon: "table" },
    propSchema: {
      endpoint: { type: "string", description: "TRPC Query Path (e.g. 'user.list')" },
      columns: { type: "string", description: "JSON string of column definitions" } // Advanced usage
    }
  },

  "HeroSection": {
    component: HeroSection,
    meta: { label: "Hero Section", category: "molecule", icon: "contact" }, // Added HeroSection as it was imported but not in registry in prompt
    propSchema: {
        title: { type: "string", defaultValue: "Welcome" },
        subtitle: { type: "string", defaultValue: "To the Future" }
    }
  },

  // ==============================
  // 🔴 SYSTEM COMPONENTS (Builder App)
  // ==============================
  // Note the 'System:' prefix convention

  "System:Canvas": {
    component: BuilderCanvas,
    meta: { label: "Builder Canvas", category: "system", hidden: true },
    propSchema: {} // System components are usually hard-coded in the Shell, not dragged.
  },

  "System:PropPanel": {
    component: PropertyPanel,
    meta: { label: "Property Editor", category: "system", hidden: true },
    propSchema: {}
  }
};

// --- 5. RUNTIME EXPORTS ---

// The Renderer only cares about this simple map (Faster lookup)
export const ComponentMap: Record<string, React.ElementType> = Object.keys(NebulaRegistry).reduce(
  (acc, key) => {
    acc[key] = NebulaRegistry[key].component;
    return acc;
  }, 
  {} as Record<string, React.ElementType>
);

// The Builder cares about this (Metadata lookup)
export const ComponentManifest = NebulaRegistry;

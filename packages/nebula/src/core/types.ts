import { z } from 'zod'; // Use Zod for runtime validation if needed later

export type NebulaId = string;

// The "DNA" of the UI. Every layout is a constraint, not a pixel value.
export type LayoutMode = 'flex' | 'grid' | 'absolute' | 'flow';
export type Direction = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type Alignment = 'start' | 'center' | 'end' | 'stretch' | 'between' | 'around';

// Design Tokens (The "No Hard-Coding" Rule)
// We map semantic names to Tailwind classes
export interface StyleTokens {
  padding?: 'p-0' | 'p-2' | 'p-4' | 'p-8' | string;
  gap?: 'gap-0' | 'gap-2' | 'gap-4' | 'gap-8' | string;
  radius?: 'rounded-none' | 'rounded-sm' | 'rounded-md' | 'rounded-lg' | 'rounded-full';
  shadow?: 'shadow-none' | 'shadow-sm' | 'shadow-md' | 'shadow-lg';
  background?: string; // e.g., "bg-card", "bg-primary"
  color?: string;      // e.g., "text-foreground", "text-primary-foreground"
  border?: string;     // e.g., "border", "border-2"
  width?: 'w-full' | 'w-auto' | 'w-screen' | string;
  height?: 'h-full' | 'h-auto' | 'h-screen' | string;
  // Responsive overrides
  mobile?: Partial<StyleTokens>;
  tablet?: Partial<StyleTokens>;
  desktop?: Partial<StyleTokens>;
}

export interface DataBinding {
  propName: string; // e.g., "content" or "src"
  sourcePath: string; // e.g., "query.activeUser.name"
  defaultValue?: any;
}

// The "Atom" Node
export interface NebulaNode {
  id: NebulaId;
  type: string; // Mapped to ComponentRegistry (e.g., "Card", "Button", "Container")

  // Content & Configuration
  props: Record<string, any>;
  bindings?: DataBinding[]; // Dynamic value injection

  // Visuals (Token-based)
  style: StyleTokens;

  // Layout Engine
  layout?: {
    mode: LayoutMode;
    direction?: Direction;
    justify?: Alignment;
    align?: Alignment;
    wrap?: boolean;
    columns?: number; // For grids
    gap?: string;     // Token
  };

  // Hierarchy
  parentId?: NebulaId;
  children: NebulaId[]; // Ordered list of child IDs

  // Meta for AI & Editor
  meta?: {
    label?: string;
    locked?: boolean;
    hidden?: boolean;
    source?: 'ai-gen' | 'human' | 'imported';
    aiDescription?: string; // "A blue card for user profile"
  };
}

// The Tree (Single Source of Truth)
export interface NebulaTree {
  rootId: NebulaId;
  nodes: Record<NebulaId, NebulaNode>;
  imports: string[]; // Captured import statements
  exports: string[]; // Captured export statements
  version: number;
}


import { create } from 'zustand';
import type { NebulaTree, NebulaId } from '@repo/nebula';

// Define Abstract Actions (Not hardcoded keys)
export type BuilderAction = 
  | 'undo' 
  | 'redo' 
  | 'delete' 
  | 'copy' 
  | 'paste' 
  | 'escape' 
  | 'save'
  | 'zoomIn'
  | 'zoomOut'
  | 'pan';

interface KeyBinding {
  id: BuilderAction;
  keys: string[]; // e.g. ['meta+z', 'ctrl+z']
  label: string;
}

interface BuilderState {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  
  // The current tree being edited
  currentTree: NebulaTree | null;
  setCurrentTree: (tree: NebulaTree) => void;
  
  // Trigger for saving (communicates from Toolbar to Builder)
  saveTriggered: number;
  triggerSave: () => void;
  
  // Viewport mode
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (mode: 'desktop' | 'tablet' | 'mobile') => void;

  // Selection & Hover
  selectedNodeId: NebulaId | null;
  setSelectedNodeId: (id: NebulaId | null) => void;
  hoveredNodeId: NebulaId | null;
  setHoveredNodeId: (id: NebulaId | null) => void;

  // Interaction Mode
  interactionMode: 'select' | 'pan' | 'hand'; 
  setInteractionMode: (mode: 'select' | 'pan' | 'hand') => void;

  // Keyboard Mappings
  keyMap: Record<BuilderAction, KeyBinding>;
  updateKeyBinding: (action: BuilderAction, newKeys: string[]) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  isDirty: false,
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  
  currentTree: null,
  setCurrentTree: (tree) => set({ currentTree: tree, isDirty: true }),
  
  saveTriggered: 0,
  triggerSave: () => set((state) => ({ saveTriggered: state.saveTriggered + 1 })),
  
  viewport: 'desktop',
  setViewport: (viewport) => set({ viewport }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  hoveredNodeId: null,
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  interactionMode: 'select',
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  
  // Default "VS Code" style bindings
  keyMap: {
    undo: { id: 'undo', keys: ['meta+z', 'ctrl+z'], label: 'Undo' },
    redo: { id: 'redo', keys: ['meta+shift+z', 'ctrl+shift+z'], label: 'Redo' },
    delete: { id: 'delete', keys: ['backspace', 'delete'], label: 'Delete Node' },
    copy: { id: 'copy', keys: ['meta+c', 'ctrl+c'], label: 'Copy' },
    paste: { id: 'paste', keys: ['meta+v', 'ctrl+v'], label: 'Paste' },
    escape: { id: 'escape', keys: ['escape'], label: 'Deselect / Cancel' },
    save: { id: 'save', keys: ['meta+s', 'ctrl+s'], label: 'Save Project' },
    zoomIn: { id: 'zoomIn', keys: ['meta+=', 'ctrl+='], label: 'Zoom In' },
    zoomOut: { id: 'zoomOut', keys: ['meta+-', 'ctrl+-'], label: 'Zoom Out' },
    pan: { id: 'pan', keys: ['space'], label: 'Pan Tool' },
  },

  updateKeyBinding: (action, newKeys) => set((state) => ({
    keyMap: { ...state.keyMap, [action]: { ...state.keyMap[action], keys: newKeys } }
  })),
}));

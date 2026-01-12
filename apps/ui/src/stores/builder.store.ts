
import { create } from 'zustand';

interface BuilderState {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  
  // The current tree being edited
  currentTree: Record<string, unknown> | null;
  setCurrentTree: (tree: Record<string, unknown>) => void;
  
  // Trigger for saving (communicates from Toolbar to Builder)
  saveTriggered: number;
  triggerSave: () => void;
  
  // Viewport mode
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (mode: 'desktop' | 'tablet' | 'mobile') => void;
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
}));

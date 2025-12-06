import { create } from 'zustand';

interface IngestState {
  activeCount: number;
  currentPath: string | null;
  filesProcessed: number;
  increment: (path?: string) => void;
  decrement: () => void;
  updateProgress: (filesProcessed: number) => void;
  reset: () => void;
  isIngesting: () => boolean;
}

const useIngestStore = create<IngestState>((set, get) => ({
  activeCount: 0,
  currentPath: null,
  filesProcessed: 0,
  increment: (path?: string) => set((s) => ({ 
    activeCount: s.activeCount + 1,
    currentPath: path || s.currentPath,
    filesProcessed: 0
  })),
  decrement: () => set((s) => ({ 
    activeCount: Math.max(0, s.activeCount - 1),
    currentPath: s.activeCount <= 1 ? null : s.currentPath,
    filesProcessed: s.activeCount <= 1 ? 0 : s.filesProcessed
  })),
  updateProgress: (filesProcessed: number) => set({ filesProcessed }),
  reset: () => set({ activeCount: 0, currentPath: null, filesProcessed: 0 }),
  isIngesting: () => get().activeCount > 0,
}));

export default useIngestStore;

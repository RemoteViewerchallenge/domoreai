import { create } from 'zustand';

interface WorkspaceState {
  columns: number;
  setColumns: (columns: number) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  columns: 3,
  setColumns: (columns) => set({ columns }),
  showSidebar: false,
  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  setSidebarOpen: (open) => set({ showSidebar: open }),
}));

import { create } from 'zustand';
import { Layout } from 'react-grid-layout';

// This interface can be expanded with more specific page properties later.
export interface Page {
  id: string;
  type: 'VFS' | 'TERMINAL' | 'SPREADSHEET' | 'TASKS';
  title: string;
}

export interface CoreState {
  pages: Map<string, Page>;
  layouts: { [key: string]: Layout[] };
  currentWorkspace: string;
  currentLayout: Layout[];
  activeRoleId: string | null;
  setWorkspace: (name: string) => void;
  openPage: (pageData: Page) => void;
  closePage: (id: string) => void;
  updateLayout: (newLayout: Layout[]) => void;
  setActiveRoleId: (id: string | null) => void;
}

const useCoreStore = create<CoreState>((set) => ({
  pages: new Map(),
  layouts: {},
  currentWorkspace: 'default',
  currentLayout: [],
  activeRoleId: null,

  setWorkspace: (name) => set((state) => ({
    currentWorkspace: name,
    currentLayout: state.layouts[name] || [],
  })),

  openPage: (pageData) => set((state) => {
    const newPages = new Map(state.pages);
    if (newPages.has(pageData.id)) {
      return {}; // Page already open, do nothing.
    }
    newPages.set(pageData.id, pageData);

    // Add a default layout item for the new page, letting the grid place it.
    const newLayoutItem = {
      i: pageData.id,
      x: (newPages.size - 1) * 2 % 12, // Basic cascading x-position
      y: Infinity, // This will cause the item to be placed at the bottom
      w: 6,
      h: 4,
    };

    const newLayout = [...state.currentLayout, newLayoutItem];
    const newLayouts = { ...state.layouts, [state.currentWorkspace]: newLayout };

    return { pages: newPages, currentLayout: newLayout, layouts: newLayouts };
  }),

  closePage: (id) => set((state) => {
    const newPages = new Map(state.pages);
    if (!newPages.delete(id)) {
      return {}; // Page not found, do nothing.
    }

    // Remove the corresponding item from the layout.
    const newLayout = state.currentLayout.filter(item => item.i !== id);
    const newLayouts = { ...state.layouts, [state.currentWorkspace]: newLayout };

    return { pages: newPages, currentLayout: newLayout, layouts: newLayouts };
  }),

  updateLayout: (newLayout) => set((state) => {
    const newLayouts = { ...state.layouts, [state.currentWorkspace]: newLayout };
    return { currentLayout: newLayout, layouts: newLayouts };
  }),

  setActiveRoleId: (id) => set({ activeRoleId: id }),
}));

export default useCoreStore;

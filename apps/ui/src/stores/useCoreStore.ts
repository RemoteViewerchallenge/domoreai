import { create } from 'zustand';
import { Layout } from 'react-grid-layout';
import { PageType } from '../types';

interface Page {
  id: string;
  type: PageType;
  title: string;
}

interface CoreState {
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

export const useCoreStore = create<CoreState>((set) => ({
  pages: new Map(),
  layouts: {},
  currentWorkspace: 'default',
  currentLayout: [],
  activeRoleId: null,
  setActiveRoleId: (id) => set({ activeRoleId: id }),
  setWorkspace: (name) => set((state) => ({
    currentWorkspace: name,
    currentLayout: state.layouts[name] || [],
  })),
  openPage: (pageData) => set((state) => {
    const newPages = new Map(state.pages);
    newPages.set(pageData.id, pageData);
    return { pages: newPages };
  }),
  closePage: (id) => set((state) => {
    const newPages = new Map(state.pages);
    newPages.delete(id);
    return { pages: newPages };
  }),
  updateLayout: (newLayout) => set((state) => ({
    layouts: {
      ...state.layouts,
      [state.currentWorkspace]: newLayout,
    },
    currentLayout: newLayout,
  })),
}));

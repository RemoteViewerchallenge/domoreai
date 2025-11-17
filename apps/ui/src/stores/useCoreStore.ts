import { create } from 'zustand';
import { Layout } from 'react-grid-layout';
import { Page } from '../types';

interface CoreState {
  pages: Map<string, Page>;
  layouts: { [key: string]: Layout[] };
  currentWorkspace: string;
  activeRoleId: string | null;
  setWorkspace: (name: string) => void;
  openPage: (pageData: Page) => void;
  closePage: (id: string) => void;
  updateLayout: (newLayout: Layout[]) => void;
}

export const useCoreStore = create<CoreState>((set) => ({
  pages: new Map(),
  layouts: {},
  currentWorkspace: 'default',
  activeRoleId: null,
  setWorkspace: (name) => set((state) => ({
    currentWorkspace: name,
    layouts: {
      ...state.layouts,
      [state.currentWorkspace]: state.pages.size > 0 ? [...Array(state.pages.size)].map((_, i) => ({
        i: Array.from(state.pages.keys())[i],
        x: (i * 2) % 12,
        y: Math.floor(i / 6),
        w: 2,
        h: 2,
      })) : [],
    },
  })),
  openPage: (pageData) => set((state) => {
    const newPages = new Map(state.pages);
    newPages.set(pageData.id, pageData);
    return { pages: newPages };
  }),
  closePage: (id) => set((state) => {
    const newPages = new Map(state.pages);
    newPages.delete(id);
    const newLayouts = { ...state.layouts };
    if (newLayouts[state.currentWorkspace]) {
      newLayouts[state.currentWorkspace] = newLayouts[state.currentWorkspace].filter((l) => l.i !== id);
    }
    return { pages: newPages, layouts: newLayouts };
  }),
  updateLayout: (newLayout) => set((state) => ({
    layouts: {
      ...state.layouts,
      [state.currentWorkspace]: newLayout,
    },
  })),
}));

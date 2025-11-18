import type { Layout } from 'react-grid-layout';
import { create } from 'zustand';

// Define the Page type
export interface Page {
  id: string;
  type: string;
  title: string;
  // other page data can be added here
}

// Define the store's state
interface CoreStoreState {
  pages: Map<string, Page>;
  layouts: { [key: string]: Layout[] };
  currentWorkspace: string;
  currentLayout: Layout[];
  activeRoleId: string | null;
}

// Define the store's actions
interface CoreStoreActions {
  setWorkspace: (name: string) => void;
  openPage: (pageData: Page) => void;
  closePage: (id: string) => void;
  updateLayout: (newLayout: Layout[]) => void;
  setActiveRoleId: (id: string | null) => void;
}

/**
 * A Zustand store for managing the C.O.R.E. dynamic layout.
 *
 * @property {Map<string, Page>} pages - A map of the currently open pages.
 * @property {{ [key: string]: Layout[] }} layouts - A map of layouts for each workspace.
 * @property {string} currentWorkspace - The name of the currently active workspace.
 * @property {Layout[]} currentLayout - The layout for the current workspace.
 * @property {string | null} activeRoleId - The ID of the currently active role.
 * @property {object} actions - An object containing functions to interact with the store.
 */
const useCoreStore = create<CoreStoreState & CoreStoreActions>((set, get) => ({
  pages: new Map(),
  layouts: {},
  currentWorkspace: 'default',
  currentLayout: [],
  activeRoleId: null,

  setWorkspace: (name) => {
    const { layouts } = get();
    set({
      currentWorkspace: name,
      currentLayout: layouts[name] || [],
    });
  },

  openPage: (pageData) => {
    set((state) => {
      const newPages = new Map(state.pages);
      newPages.set(pageData.id, pageData);

      // Add a default layout for the new page
      const newLayoutItem: Layout = {
        i: pageData.id,
        x: 0,
        y: Infinity, // This will cause the item to be placed at the bottom
        w: 6,
        h: 4,
      };

      const newLayout = [...state.currentLayout, newLayoutItem];

      return {
        pages: newPages,
        currentLayout: newLayout,
      };
    });
  },

  closePage: (id) => {
    set((state) => {
      const newPages = new Map(state.pages);
      newPages.delete(id);

      const newLayout = state.currentLayout.filter((item) => item.i !== id);

      return {
        pages: newPages,
        currentLayout: newLayout,
      };
    });
  },

  updateLayout: (newLayout) => {
    set((state) => {
      const newLayouts = { ...state.layouts };
      newLayouts[state.currentWorkspace] = newLayout;
      return {
        layouts: newLayouts,
        currentLayout: newLayout,
      };
    });
  },

  setActiveRoleId: (id) => {
    set({ activeRoleId: id });
  },
}));

export default useCoreStore;

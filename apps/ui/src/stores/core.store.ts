import { create } from 'zustand';

type Page = 'VFS' | 'Terminal' | 'Spreadsheet' | 'Tasks' | 'Options';

interface CoreState {
  pages: Page[];
  activeRoleId: string | null;
  openPage: (page: Page) => void;
  closePage: (page: Page) => void;
  setActiveRoleId: (roleId: string) => void;
}

export const useCoreStore = create<CoreState>((set) => ({
  pages: [],
  activeRoleId: null,
  openPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
  closePage: (page) => set((state) => ({ pages: state.pages.filter((p) => p !== page) })),
  setActiveRoleId: (roleId) => set({ activeRoleId: roleId }),
}));

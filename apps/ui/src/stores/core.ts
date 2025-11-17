import { create } from 'zustand';

type Page = 'vfs' | 'terminal' | 'spreadsheet' | 'options';

interface CoreState {
  activePage: Page | null;
  activeRoleId: string | null;
  openPage: (page: Page) => void;
  setActiveRoleId: (roleId: string) => void;
}

export const useCoreStore = create<CoreState>((set) => ({
  activePage: null,
  activeRoleId: null,
  openPage: (page) => set({ activePage: page }),
  setActiveRoleId: (roleId) => set({ activeRoleId: roleId }),
}));

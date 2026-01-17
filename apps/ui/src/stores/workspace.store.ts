import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardData {
  id: string;
  roleId: string;
  column: number;
  title?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface Screenspace {
  id: number;
  name: string;
  cardIds: string[];
}

export interface WorkspaceState {
  columns: number;
  setColumns: (columns: number) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Cards State (Application Wide)
  cards: CardData[];
  setCards: (cards: CardData[]) => void;
  addCard: (card: CardData) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<CardData>) => void;
  
  // Workspace Loading
  activeWorkspace: string | null;
  loadWorkspace: (id: string) => void;

  // AI Context (Application Wide)
  aiContext: {
    scope: string; // 'Global', 'Workspace', 'Card:ID'
    isLimiting: boolean;
    injectedState: boolean;
  };
  setAiContext: (context: Partial<WorkspaceState['aiContext']>) => void;

  // [NEW] Screenspaces
  activeScreenspaceId: number;
  screenspaces: Screenspace[];
  switchDesktop: (id: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      columns: 3,
      setColumns: (columns) => set({ columns }),
      showSidebar: false,
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setSidebarOpen: (open) => set({ showSidebar: open }),
      
      cards: [
        { id: '1', roleId: '', column: 0 },
        { id: '2', roleId: '', column: 0 },
        { id: '3', roleId: '', column: 1 },
        { id: '4', roleId: '', column: 1 },
        { id: '5', roleId: '', column: 2 },
        { id: '6', roleId: '', column: 2 },
      ],
      setCards: (cards) => set({ cards }),
      addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
      removeCard: (id) => set((state) => ({ cards: state.cards.filter(c => c.id !== id) })),
      updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? { ...c, ...updates } : c)
      })),

      activeWorkspace: null,
      loadWorkspace: (id: string) => set({ activeWorkspace: id }),

      aiContext: {
        scope: 'Global',
        isLimiting: false,
        injectedState: false
      },
      setAiContext: (ctx) => set((state) => ({ aiContext: { ...state.aiContext, ...ctx } })),

      activeScreenspaceId: 1,
      screenspaces: [
        { id: 1, name: 'Main', cardIds: ['1', '2', '3', '4', '5', '6'] },
        { id: 2, name: 'Refactor', cardIds: [] },
        { id: 3, name: 'Logs', cardIds: [] },
      ],
      switchDesktop: (id) => set({ activeScreenspaceId: id }),
    }),
    {
      name: 'workspace-storage', // unique name
      partialize: (state) => ({ columns: state.columns, cards: state.cards }), // Persist cards!
    }
  )
);

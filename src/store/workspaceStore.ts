import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  activeProjectId: string | null;
  recentProjectIds: string[];
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  searchOpen: boolean;
  setActiveProject: (id: string | null) => void;
  pushRecentProject: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setCommandPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      recentProjectIds: [],
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      searchOpen: false,
      setActiveProject: (activeProjectId) => set({ activeProjectId }),
      pushRecentProject: (id) =>
        set((s) => ({ recentProjectIds: [id, ...s.recentProjectIds.filter((x) => x !== id)].slice(0, 8) })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
    }),
    { name: 'civiq-workspace' }
  )
);

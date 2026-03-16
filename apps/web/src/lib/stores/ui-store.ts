import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  activeBranchId: number | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveBranchId: (branchId: number | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeBranchId: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),
    }),
    {
      name: 'kairos-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeBranchId: state.activeBranchId,
      }),
    }
  )
);

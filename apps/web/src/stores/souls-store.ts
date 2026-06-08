import { create } from 'zustand';
import type { KairosApi } from '@kairos/api-client';

interface Soul {
  id: string;
  outreachId?: string;
  outreachName?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gender?: string;
  ageRange?: string;
  assignedMemberId?: string;
  assignedMemberName?: string;
  convertedToMemberId?: string;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastFollowUpDate?: Date;
  daysSinceLastFollowUp?: number;
}

interface SoulFilters {
  search?: string;
  status?: string;
  assignedMemberId?: string;
  outreachId?: string;
  overdueOnly?: boolean;
  branchId?: string;
  fellowshipId?: string;
  branchDepartmentId?: string;
}

interface SoulsState {
  souls: Soul[];
  currentSoul: Soul | null;
  filters: SoulFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;

  // Actions
  fetchSouls: (api: KairosApi) => Promise<void>;
  fetchSoul: (api: KairosApi, id: string) => Promise<void>;
  captureSoul: (api: KairosApi, data: Partial<Soul>) => Promise<Soul>;
  updateSoulStatus: (api: KairosApi, id: string, status: string, convertedToMemberId?: string) => Promise<void>;
  reassignSoul: (api: KairosApi, id: string, assignedMemberId: string) => Promise<void>;
  convertSoul: (api: KairosApi, id: string) => Promise<Soul>;
  setFilters: (filters: Partial<SoulFilters>) => void;
  setPage: (page: number) => void;
  updateSoulOptimistic: (id: string, updates: Partial<Soul>) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  souls: [],
  currentSoul: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

export const useSoulsStore = create<SoulsState>((set, get) => ({
  ...initialState,

  fetchSouls: async (api) => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await api.souls.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      if (response.success && response.data) {
        set({
          souls: response.data.data ?? [],
          pagination: response.data.meta ?? get().pagination,
          loading: false,
        });
      }
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch souls', loading: false });
    }
  },

  fetchSoul: async (api, id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.souls.get(id);
      if (response.success) {
        set({ currentSoul: response.data, loading: false });
      }
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch soul', loading: false });
    }
  },

  captureSoul: async (api, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.souls.capture(data);
      if (response.success) {
        set({ loading: false });
        return response.data;
      }
      throw new Error('Failed to capture soul');
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to capture soul', loading: false });
      throw error;
    }
  },

  updateSoulStatus: async (api, id, status, convertedToMemberId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.souls.updateStatus(id, { status, convertedToMemberId });
      if (response.success) {
        // Update the soul in the list
        set((state) => ({
          souls: state.souls.map((soul) =>
            soul.id === id ? { ...soul, status, convertedToMemberId } : soul
          ),
          currentSoul: state.currentSoul?.id === id
            ? { ...state.currentSoul, status, convertedToMemberId }
            : state.currentSoul,
          loading: false,
        }));
      }
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update status', loading: false });
      throw error;
    }
  },

  reassignSoul: async (api, id, assignedMemberId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.souls.reassign(id, { assignedMemberId });
      if (response.success) {
        set({ loading: false });
        // Refresh the soul data
        await get().fetchSoul(api, id);
      }
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to reassign soul', loading: false });
      throw error;
    }
  },

  convertSoul: async (api, id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.souls.convert(id);
      if (response.success) {
        set({ loading: false });
        return response.data;
      }
      throw new Error('Failed to convert soul');
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to convert soul', loading: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },

  updateSoulOptimistic: (id, updates) => {
    set((state) => ({
      souls: state.souls.map((soul) =>
        soul.id === id ? { ...soul, ...updates } : soul
      ),
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

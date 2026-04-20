import { create } from 'zustand';
import type { KairosApi } from '@kairos/api-client';

interface OutreachProgram {
  id: string;
  branchId: string;
  branchName: string;
  programName: string;
  programDate: string;
  location: string;
  address?: string;
  city?: string;
  description?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  createdBy?: string;
  createdByName?: string;
  creatorRole?: string;
  totalSoulsReached: number;
  isCompleted: boolean;
  isOpenToAllBranches?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // For members
  isRegistered?: boolean;
  // For leaders/pastors/admin
  participantCount?: number;
  totalMembers?: number;
}

interface ProgramFilters {
  search?: string;
  branchId?: string;
  isCompleted?: boolean;
  coordinatorId?: string;
  startDate?: string;
  endDate?: string;
}

interface OutreachState {
  programs: OutreachProgram[];
  currentProgram: OutreachProgram | null;
  filters: ProgramFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;

  // Actions
  fetchPrograms: (api: KairosApi) => Promise<void>;
  fetchProgram: (api: KairosApi, id: string) => Promise<void>;
  createProgram: (api: KairosApi, data: Partial<OutreachProgram>) => Promise<OutreachProgram>;
  updateProgram: (api: KairosApi, id: string, data: Partial<OutreachProgram>) => Promise<OutreachProgram>;
  setFilters: (filters: Partial<ProgramFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  programs: [],
  currentProgram: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

export const useOutreachStore = create<OutreachState>((set, get) => ({
  ...initialState,

  fetchPrograms: async (api) => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      console.log('Store fetchPrograms - filters:', filters, 'pagination:', pagination);
      const response = await api.outreach.programs.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      if (response.success && response.data) {
        const programs = response.data.data ?? [];
        const meta = response.data.meta;
        console.log('Store fetchPrograms - received:', Array.isArray(programs) ? programs.length : 0, 'programs');
        console.log('Store fetchPrograms - programs:', (Array.isArray(programs) ? programs : []).map((p: OutreachProgram) => ({ 
          id: p.id, 
          name: p.programName, 
          isCompleted: p.isCompleted,
          branchId: p.branchId,
          isOpenToAllBranches: p.isOpenToAllBranches,
          createdBy: p.createdBy,
          createdByName: p.createdByName
        })));
        set({
          programs: Array.isArray(programs) ? programs : [],
          pagination: meta ?? get().pagination,
          loading: false,
        });
      }
    } catch (error: unknown) {
      console.error('Store fetchPrograms - error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch programs', loading: false });
    }
  },

  fetchProgram: async (api, id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.outreach.programs.get(id);
      if (response.success) {
        set({ currentProgram: response.data, loading: false });
      }
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch program', loading: false });
    }
  },

  createProgram: async (api, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.outreach.programs.create(data);
      if (response.success) {
        set({ loading: false });
        return response.data;
      }
      throw new Error('Failed to create program');
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to create program', loading: false });
      throw error;
    }
  },

  updateProgram: async (api, id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.outreach.programs.update(id, data);
      if (response.success) {
        set({ loading: false });
        return response.data;
      }
      throw new Error('Failed to update program');
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update program', loading: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    console.log('Store setFilters - new filters:', filters);
    set((state) => {
      const newFilters = { ...state.filters, ...filters };
      console.log('Store setFilters - merged filters:', newFilters);
      return {
        filters: newFilters,
        pagination: { ...state.pagination, page: 1 }, // Reset to page 1 when filters change
      };
    });
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

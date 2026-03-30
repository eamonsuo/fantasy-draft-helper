import { create } from "zustand";

interface DraftFilters {
  search: string;
  positions: string[];
  hideDrafted: boolean;
  australianOnly: boolean;
}

interface DraftState {
  draftedPlayerIds: Set<string>;
  filters: DraftFilters;
  setDraftedPlayerIds: (ids: Set<string>) => void;
  setSearch: (search: string) => void;
  togglePosition: (position: string) => void;
  setHideDrafted: (hide: boolean) => void;
  setAustralianOnly: (value: boolean) => void;
}

const DEFAULT_FILTERS: DraftFilters = { search: "", positions: [], hideDrafted: false, australianOnly: false };

export const useDraftStore = create<DraftState>((set) => ({
  draftedPlayerIds: new Set<string>(),
  filters: { ...DEFAULT_FILTERS },

  setDraftedPlayerIds: (ids) => set({ draftedPlayerIds: ids }),

  setSearch: (search) => set((state) => ({ filters: { ...state.filters, search } })),

  togglePosition: (position) =>
    set((state) => {
      const positions = state.filters.positions.includes(position)
        ? state.filters.positions.filter((p) => p !== position)
        : [...state.filters.positions, position];
      return { filters: { ...state.filters, positions } };
    }),

  setHideDrafted: (hideDrafted) => set((state) => ({ filters: { ...state.filters, hideDrafted } })),

  setAustralianOnly: (australianOnly) => set((state) => ({ filters: { ...state.filters, australianOnly } })),
}));

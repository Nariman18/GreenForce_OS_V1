'use client';

import type { Jurisdiction } from '@greenforce/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type RequirementsFilter = 'all' | 'action' | 'applies' | 'set-aside';

/**
 * Client-only UI preferences shared across screens. Server data lives in TanStack Query, never here.
 * Persisted to localStorage so the demo presenter's choices survive reloads.
 */
interface UiState {
  /** Jurisdiction pre-selected in the new-project search. */
  searchJurisdiction: Jurisdiction;
  requirementsFilter: RequirementsFilter;
  /** Show the plain-language requirement text on each rule card. */
  showRuleDetails: boolean;
  mobileNavOpen: boolean;
  setSearchJurisdiction: (jurisdiction: Jurisdiction) => void;
  setRequirementsFilter: (filter: RequirementsFilter) => void;
  toggleRuleDetails: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      searchJurisdiction: 'DK',
      requirementsFilter: 'all',
      showRuleDetails: true,
      mobileNavOpen: false,
      setSearchJurisdiction: (searchJurisdiction) => set({ searchJurisdiction }),
      setRequirementsFilter: (requirementsFilter) => set({ requirementsFilter }),
      toggleRuleDetails: () => set((state) => ({ showRuleDetails: !state.showRuleDetails })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: 'greenforce-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ searchJurisdiction, requirementsFilter, showRuleDetails }) => ({
        searchJurisdiction,
        requirementsFilter,
        showRuleDetails,
      }),
    },
  ),
);

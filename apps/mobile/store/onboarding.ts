import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LANG = 'kairos.onboarding.language';
const KEY_BRANCH = 'kairos.onboarding.branch_id';
const KEY_DONE = 'kairos.onboarding.done';

export type Language = 'en' | 'tw' | 'kr' | 'fr';

interface OnboardingState {
  hydrated: boolean;
  done: boolean;
  language: Language | null;
  branchId: string | null;

  hydrate: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setBranchId: (id: string) => Promise<void>;
  markDone: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hydrated: false,
  done: false,
  language: null,
  branchId: null,

  hydrate: async () => {
    try {
      const [lang, branchId, doneStr] = await Promise.all([
        AsyncStorage.getItem(KEY_LANG),
        AsyncStorage.getItem(KEY_BRANCH),
        AsyncStorage.getItem(KEY_DONE),
      ]);
      set({
        language: (lang as Language | null) ?? null,
        branchId: branchId ?? null,
        done: doneStr === 'true',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setLanguage: async (lang) => {
    await AsyncStorage.setItem(KEY_LANG, lang);
    set({ language: lang });
  },

  setBranchId: async (id) => {
    await AsyncStorage.setItem(KEY_BRANCH, id);
    set({ branchId: id });
  },

  markDone: async () => {
    await AsyncStorage.setItem(KEY_DONE, 'true');
    set({ done: true });
  },

  reset: async () => {
    await Promise.all([
      AsyncStorage.removeItem(KEY_LANG),
      AsyncStorage.removeItem(KEY_BRANCH),
      AsyncStorage.removeItem(KEY_DONE),
    ]);
    set({ language: null, branchId: null, done: false });
  },
}));

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { resolveLanguage, type LanguagePreference } from '@/lib/i18n';

const KEY = 'kairos.language';

const VALID: readonly LanguagePreference[] = ['system', 'en', 'fr', 'kri', 'tw'];

interface LocaleState {
  hydrated: boolean;
  /** What the user chose. `'system'` (default) follows the device. */
  preference: LanguagePreference;
  hydrate: () => Promise<void>;
  setPreference: (pref: LanguagePreference) => Promise<void>;
}

/**
 * Persisted language preference, mirroring `store/theme.ts`.
 *
 * The store owns the preference; i18next owns the resolved language. Both are
 * kept in step here so no screen has to think about the difference.
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  hydrated: false,
  preference: 'system',

  hydrate: async () => {
    try {
      const stored = (await AsyncStorage.getItem(KEY)) as LanguagePreference | null;
      const preference = stored && VALID.includes(stored) ? stored : 'system';
      await i18n.changeLanguage(resolveLanguage(preference));
      set({ preference, hydrated: true });
    } catch {
      // Fall back to the device language rather than blocking boot.
      try {
        await i18n.changeLanguage(resolveLanguage('system'));
      } catch {
        // i18next is already on its fallback; nothing further to do.
      }
      set({ hydrated: true });
    }
  },

  setPreference: async (preference) => {
    set({ preference });
    await i18n.changeLanguage(resolveLanguage(preference));
    try {
      await AsyncStorage.setItem(KEY, preference);
    } catch {
      // Non-fatal: applied in-memory, just won't survive an app kill.
    }
  },
}));

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@kairos/ui-native';

const KEY = 'kairos.theme_mode';

interface ThemeState {
  hydrated: boolean;
  mode: ThemeMode;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

/**
 * Persisted appearance preference. `mode: 'system'` (default) follows the OS.
 * `'light'` / `'dark'` force the chosen scheme regardless of the device.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  hydrated: false,
  mode: 'system',

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      const mode: ThemeMode =
        stored === 'light' || stored === 'dark' ? stored : 'system';
      set({ mode, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem(KEY, mode);
    } catch {
      // Non-fatal: mode is set in-memory, just won't survive an app kill.
    }
  },
}));

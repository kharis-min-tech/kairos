import React, { createContext, useContext, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  /** User's stored preference: system-follow, or a forced choice. */
  mode: ThemeMode;
  /** Setter — persisted by the caller (usually via a Zustand store). */
  setMode: (mode: ThemeMode) => void;
  /** Resolved scheme currently in use (system → concrete light/dark). */
  scheme: 'light' | 'dark';
  /** Active palette — swap by mode. */
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Root provider. The host app decides how mode is stored + set (Zustand,
 * MMKV, whatever); the provider just plumbs through the current mode + a
 * setter, then resolves the palette from mode + system Appearance.
 */
export function ThemeProvider({
  mode,
  setMode,
  children,
}: {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  children: React.ReactNode;
}) {
  // `useColorScheme` re-renders whenever the OS flips light↔dark, so a
  // 'system'-mode user auto-follows without any explicit event handling.
  const systemScheme = useColorScheme();

  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
    }),
    [mode, setMode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback — outside a provider, always give the light palette
    // so components can still render (e.g. in tests or Storybook without
    // theme wiring).
    return {
      mode: 'system',
      setMode: () => undefined,
      scheme: 'light',
      colors: lightColors,
    };
  }
  return ctx;
}

/**
 * Sugar hook — returns just the active palette. Preferred for consumer code:
 *
 *   const c = useColors();
 *   <View style={{ backgroundColor: c.card }} />
 */
export function useColors(): ThemeColors {
  return useTheme().colors;
}

/**
 * Style factory hook. Migration pattern for screens:
 *
 *   const styles = useThemedStyles(makeStyles);
 *   // …
 *   function makeStyles(c: ThemeColors) {
 *     return StyleSheet.create({
 *       page: { backgroundColor: c.page },
 *       title: { color: c.ink },
 *     });
 *   }
 *
 * Styles are memoised by palette identity, so a theme swap rebuilds them
 * once and every affected component re-renders with the new StyleSheet.
 */
export function useThemedStyles<T extends Record<string, unknown>>(
  factory: (c: ThemeColors) => T,
): T {
  const c = useColors();
  return useMemo(() => factory(c), [c, factory]);
}

/**
 * Imperative accessor for one-off, non-hook contexts (e.g. StatusBar
 * updates driven by expo-router). Reads directly from Appearance so it
 * works before ThemeProvider mounts.
 */
export function currentSystemScheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

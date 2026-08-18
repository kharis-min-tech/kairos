/**
 * Modern Sanctuary design tokens for mobile — source of truth.
 * Mirrors DESIGN.md and the mobile design handoff. Do not add ad-hoc colors.
 *
 * Two exported palettes: `lightColors` + `darkColors`. Both implement the
 * same `ThemeColors` interface so a screen can migrate to
 * `useThemedStyles(makeStyles)` once and get both themes for free.
 *
 * Backwards-compat: `colors` remains exported as the light palette so
 * unmigrated call sites keep working.
 */

// Fixed identity — same in both themes.
const brand = {
  primary: '#5D3FD3',
  primaryDark: '#451ebb',
  primaryLight: '#a488ff',
  gold: '#f8b537',
  goldDark: '#b8801c',
  success: '#10b981',
  successText: '#059669',
  danger: '#e11d48',
  info: '#3b82f6',
  onPrimary: '#ffffff',
  onDanger: '#ffffff',
  onGold: '#1a1c1c',
} as const;

export interface ThemeColors {
  // Brand — fixed
  primary: string;
  primaryDark: string;
  primaryLight: string;
  gold: string;
  goldDark: string;
  success: string;
  successText: string;
  danger: string;
  info: string;
  onPrimary: string;
  onDanger: string;
  onGold: string;

  // Surfaces
  page: string;
  card: string;
  subtle: string;
  elevated: string;

  // Text (ink = primary)
  ink: string;
  inkMuted: string; // ~65%
  inkFaded: string; // ~45%
  inkVeryFaded: string; // ~30%
  inkGhost: string; // ~15%

  // Borders / dividers
  border: string; // ~12%
  borderStrong: string; // ~20%
  divider: string; // ~6%

  // Overlays
  scrim: string; // modal backdrop

  // Tinted surface fills (semi-transparent chip backgrounds tied to brand)
  primaryTint: string;
  goldTint: string;
  successTint: string;
  dangerTint: string;
  infoTint: string;
}

export const lightColors: ThemeColors = {
  ...brand,

  page: '#fafafa',
  card: '#ffffff',
  subtle: '#f4f2ee',
  elevated: '#ffffff',

  ink: '#1a1c1c',
  inkMuted: 'rgba(26,28,28,0.65)',
  inkFaded: 'rgba(26,28,28,0.45)',
  inkVeryFaded: 'rgba(26,28,28,0.30)',
  inkGhost: 'rgba(26,28,28,0.15)',

  border: 'rgba(26,28,28,0.12)',
  borderStrong: 'rgba(26,28,28,0.20)',
  divider: 'rgba(26,28,28,0.08)',

  scrim: 'rgba(0,0,0,0.35)',

  primaryTint: 'rgba(93,63,211,0.10)',
  goldTint: 'rgba(248,181,55,0.18)',
  successTint: 'rgba(16,185,129,0.15)',
  dangerTint: 'rgba(225,29,72,0.12)',
  infoTint: 'rgba(59,130,246,0.14)',
};

export const darkColors: ThemeColors = {
  ...brand,

  // zinc-based dark: near-black background, softer card surfaces.
  page: '#0a0a0f',
  card: '#141419',
  subtle: '#1e1e26',
  elevated: '#1a1a22',

  ink: '#e5e2e1',
  inkMuted: 'rgba(229,226,225,0.70)',
  inkFaded: 'rgba(229,226,225,0.50)',
  inkVeryFaded: 'rgba(229,226,225,0.35)',
  inkGhost: 'rgba(229,226,225,0.18)',

  border: 'rgba(229,226,225,0.14)',
  borderStrong: 'rgba(229,226,225,0.22)',
  divider: 'rgba(229,226,225,0.08)',

  scrim: 'rgba(0,0,0,0.55)',

  primaryTint: 'rgba(93,63,211,0.20)',
  goldTint: 'rgba(248,181,55,0.22)',
  successTint: 'rgba(16,185,129,0.22)',
  dangerTint: 'rgba(225,29,72,0.22)',
  infoTint: 'rgba(59,130,246,0.22)',
};

/**
 * Legacy flat palette. Kept for unmigrated call sites — the light palette
 * with the OLD property names. New code should reach for `useColors()`
 * instead.
 */
export const colors = {
  primary: lightColors.primary,
  primaryDark: lightColors.primaryDark,
  primaryLight: lightColors.primaryLight,
  gold: lightColors.gold,
  goldDark: lightColors.goldDark,

  success: lightColors.success,
  successText: lightColors.successText,
  danger: lightColors.danger,
  info: lightColors.info,

  pageLight: lightColors.page,
  cardLight: lightColors.card,
  subtleLight: lightColors.subtle,

  pageDark: darkColors.page,
  cardDark: darkColors.card,
  elevatedDark: darkColors.elevated,

  ink: lightColors.ink,
  inkOnDark: darkColors.ink,
} as const;

export const gradients = {
  brand: ['#451ebb', '#5D3FD3'] as [string, string],
  brandDeep: ['#3b0764', '#5D3FD3'] as [string, string],
  splash: ['#1e1050', '#150d35', '#0c0a1a', '#050408'] as [string, string, string, string],
} as const;

export const radii = {
  xs: 3,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  screenTitle: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.22 },
  hero: { fontSize: 32, fontWeight: '800' as const },
  cardTitle: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  meta: { fontSize: 11, fontWeight: '400' as const },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  },
  button: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  buttonHero: {
    shadowColor: '#451ebb',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/**
 * Modern Sanctuary design tokens for mobile — source of truth.
 * Mirrors DESIGN.md and the mobile design handoff. Do not add ad-hoc colors.
 */
export const colors = {
  primary: '#5D3FD3',
  primaryDark: '#451ebb',
  primaryLight: '#a488ff',
  gold: '#f8b537',
  goldDark: '#b8801c',

  success: '#10b981',
  successText: '#059669',
  danger: '#e11d48',
  info: '#3b82f6',

  pageLight: '#fafafa',
  cardLight: '#ffffff',
  subtleLight: '#f4f2ee',

  pageDark: '#0a0a0f',
  cardDark: '#141419',
  elevatedDark: '#1a1a22',

  ink: '#1a1c1c',
  inkOnDark: '#e5e2e1',
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

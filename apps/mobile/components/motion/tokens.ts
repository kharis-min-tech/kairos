import { Easing } from 'react-native';

/**
 * Canvas motion tokens — the same easings and timings as the web system
 * (apps/web/src/app/globals.css, `--mo-*`), so the two apps move as one family.
 */
export const easings = {
  /** Slight overshoot. The Canvas signature. */
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** In-out, for strokes and fills. */
  draw: Easing.bezier(0.65, 0, 0.35, 1),
  /** Expo-out, for things that settle. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
} as const;

export const durations = {
  entrance: 1100,
  /** Delay before the first entrance, then +ENTRANCE_STAGGER per index. */
  entranceDelay: 300,
  entranceStagger: 90,
  ripple: 650,
  halo: 3600,
  underline: 900,
  progressBar: 1300,
} as const;

export const canvasColors = {
  purple: '#5D3FD3',
  purpleDeep: '#451EBB',
  gold: '#F8B537',
} as const;

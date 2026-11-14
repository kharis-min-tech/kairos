import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { durations } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

/**
 * Idle bob for a mark that has already entered: ±6pt and ±0.8° over about 3s,
 * alternating, forever. Starts once the entrance is over (`startAfterMs`), runs
 * only while `active`, and never runs under Reduce Motion. Transform only, so
 * it stays on the native driver.
 */
export function useFloat(active: boolean, startAfterMs: number) {
  const reduced = useReduceMotion();
  const v = useRef(new Animated.Value(0.5)).current; // 0.5 = rest

  useEffect(() => {
    if (reduced !== false || !active) return;
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      const half = Animated.timing(v, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      loop = Animated.loop(
        Animated.sequence([
          half,
          Animated.timing(v, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.5,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }, startAfterMs);
    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [reduced, active, startAfterMs, v]);

  return {
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, 0, -6] }) },
      { rotate: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0.8deg', '0deg', '-0.8deg'] }) },
    ],
  };
}

/** When the first entrance has finished — the earliest the logo should start to bob. */
export const FLOAT_START_MS =
  durations.entranceDelay + durations.entrance + 100;

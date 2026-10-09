import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { durations, easings } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

/**
 * The Canvas entrance: from translateY 28 / scale .96 / rotate −1° and
 * transparent to rest, spring easing, 1100ms, 300ms + index × 90ms. Native
 * driver throughout — it only touches transform and opacity.
 *
 * Pass `index: null` to opt out (renders at rest). Under Reduce Motion it
 * renders at rest with no animation.
 */
export function useEntrance(index: number | null) {
  const reduced = useReduceMotion();
  const progress = useRef(new Animated.Value(index === null ? 1 : 0)).current;

  useEffect(() => {
    if (index === null || reduced === null) return;
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: durations.entrance,
      delay: durations.entranceDelay + index * durations.entranceStagger,
      easing: easings.spring,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [index, reduced, progress]);

  return {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '0deg'] }) },
    ],
  };
}

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { durations, easings } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A single stroked path that draws itself. `length` is the path's length in
 * viewBox units — react-native-svg has no getTotalLength, so it is supplied
 * (measured once for the shared underline path, see HAND_DRAWN_UNDERLINE).
 *
 * The dash gap is longer than the path so the pattern can't wrap round and
 * leave a stub at the far end before the draw starts (the same bug the web
 * version had). strokeDashoffset is an SVG prop, so this is JS-driven — fine
 * for one 900ms run, not for anything that loops. Under Reduce Motion the
 * stroke is simply drawn.
 */
export function HandDrawnStroke({
  d,
  viewBox,
  length,
  stroke,
  strokeWidth,
  delay = 0,
  duration = durations.underline,
  style,
}: {
  d: string;
  viewBox: string;
  length: number;
  stroke: string;
  strokeWidth: number;
  /** ms after mount before the draw starts. */
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: easings.draw,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, delay, duration, progress]);

  return (
    <Svg
      pointerEvents="none"
      viewBox={viewBox}
      preserveAspectRatio="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      <AnimatedPath
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={[length, length * 2]}
        strokeDashoffset={progress.interpolate({
          inputRange: [0, 1],
          outputRange: [length * 1.05, 0],
        })}
      />
    </Svg>
  );
}

/** The shared "Sign in" underline: 300×24 viewBox, length measured = 293.5. */
export const HAND_DRAWN_UNDERLINE = {
  d: 'M4 16 C 60 6, 130 4, 190 9 S 270 16, 296 7',
  viewBox: '0 0 300 24',
  length: 293.5,
} as const;

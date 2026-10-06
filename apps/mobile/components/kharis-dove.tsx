import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DOVE_SUBPATHS, DOVE_VIEWBOX } from '@kairos/core';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The Kharis dove.
 *
 * Same six paths as web, out of @kairos/core. With `draw`, the outline
 * strokes itself in once on mount and the fill arrives behind it — one brand
 * beat, never a loop.
 *
 * The animation is JS-driven because `strokeDashoffset` is an SVG prop and
 * the native driver only takes transforms and opacity. That is acceptable for
 * a single 900ms run on mount; it would not be for anything that repeated.
 */
export function KharisDove({
  size = 40,
  color = '#ffffff',
  draw = false,
}: {
  size?: number;
  color?: string;
  draw?: boolean;
}) {
  const progress = useRef(new Animated.Value(draw ? 0 : 1)).current;
  const fill = useRef(new Animated.Value(draw ? 0 : 1)).current;

  useEffect(() => {
    if (!draw) return;
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        // The mark is simply there. No stroke, no draw.
        progress.setValue(1);
        fill.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(fill, {
          toValue: 1,
          duration: 420,
          delay: 620,
          useNativeDriver: false,
        }),
      ]).start();
    });

    return () => {
      cancelled = true;
    };
  }, [draw, progress, fill]);

  return (
    <Svg width={size} height={size} viewBox={DOVE_VIEWBOX}>
      <AnimatedPath
        d={DOVE_SUBPATHS.map((s) => s.d).join('')}
        fill={color}
        fillRule="evenodd"
        opacity={fill}
      />
      {draw
        ? DOVE_SUBPATHS.map((sub, i) => (
            <AnimatedPath
              key={i}
              d={sub.d}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinejoin="round"
              // Each subpath carries its own length, so the short olive-branch
              // strokes and the long wing outline finish together.
              strokeDasharray={[sub.length, sub.length]}
              strokeDashoffset={progress.interpolate({
                inputRange: [0, 1],
                outputRange: [sub.length, 0],
              })}
              opacity={progress.interpolate({
                inputRange: [0, 0.84, 1],
                outputRange: [1, 1, 0],
              })}
            />
          ))
        : null}
    </Svg>
  );
}

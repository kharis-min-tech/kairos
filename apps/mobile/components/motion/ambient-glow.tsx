import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from './use-reduce-motion';

const SIZE = 420;

// translate/scale keyframes, in order; the loop returns to the first.
const KEYS = [
  { x: -70, y: -30, s: 1 },
  { x: 60, y: 10, s: 1.15 },
  { x: -20, y: 50, s: 0.95 },
  { x: -70, y: -30, s: 1 },
] as const;
const SEGMENT_MS = 14000 / 3;

/**
 * A ~420pt radial glow (purple → gold → transparent) that drifts slowly behind
 * whatever it is placed behind — the logo, here. Does not track touch.
 *
 * The drift runs 14s on the native driver (transform only) and stops while
 * `active` is false or Reduce Motion is on; under Reduce Motion the glow
 * simply sits at its first position.
 */
export function AmbientGlow({
  active = true,
  top,
  centerOffset = 0,
}: {
  active?: boolean;
  /** Distance from the top of the screen to the glow's centre. */
  top: number;
  centerOffset?: number;
}) {
  const reduced = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced === null) return;
    Animated.timing(fade, {
      toValue: 1,
      duration: reduced ? 0 : 900,
      useNativeDriver: true,
    }).start();
  }, [reduced, fade]);

  useEffect(() => {
    if (reduced !== false || !active) return;
    let from = 0;
    t.stopAnimation((v) => {
      from = v;
    });
    // Resume where we left off rather than snapping back to the start.
    const startSeg = Math.min(2, Math.floor(from));
    const segs = [0, 1, 2].map((i) =>
      Animated.timing(t, {
        toValue: i + 1,
        duration: SEGMENT_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    const first = Animated.sequence(segs.slice(startSeg));
    let loop: Animated.CompositeAnimation | null = null;
    first.start(({ finished }) => {
      if (!finished) return;
      t.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          ...segs,
          Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      first.stop();
      loop?.stop();
    };
  }, [reduced, active, t]);

  const input = [0, 1, 2, 3];
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: top - SIZE / 2 + centerOffset }]}>
      <Animated.View
        style={{
          width: SIZE,
          height: SIZE,
          opacity: fade,
          transform: [
            { translateX: t.interpolate({ inputRange: input, outputRange: KEYS.map((k) => k.x) }) },
            { translateY: t.interpolate({ inputRange: input, outputRange: KEYS.map((k) => k.y) }) },
            { scale: t.interpolate({ inputRange: input, outputRange: KEYS.map((k) => k.s) }) },
          ],
        }}
      >
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <RadialGradient id="ambient" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#5D3FD3" stopOpacity={0.38} />
              <Stop offset="0.45" stopColor="#8a6bd0" stopOpacity={0.2} />
              <Stop offset="0.7" stopColor="#F8B537" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#F8B537" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={SIZE} height={SIZE} fill="url(#ambient)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { durations } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

type Stop = { t: number; rgb: [number, number, number]; a: number };

// The web halo's conic gradient: transparent to 78%, #5D3FD3 at 88%,
// #F8B537 at 94%, transparent at 100%. t is the fraction of a turn clockwise
// from 12 o'clock.
const STOPS: Stop[] = [
  { t: 0.78, rgb: [93, 63, 211], a: 0 },
  { t: 0.88, rgb: [93, 63, 211], a: 1 },
  { t: 0.94, rgb: [248, 181, 55], a: 1 },
  { t: 1, rgb: [248, 181, 55], a: 0 },
];
const START = 0.78;
const WEDGES = 40;
const EXTEND_DEG = 0.5; // overlap neighbours so antialiasing leaves no seams

function colorAt(t: number): string {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]!;
    const b = STOPS[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k);
      const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k);
      const bl = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k);
      const al = a.a + (b.a - a.a) * k;
      return `rgba(${r},${g},${bl},${al.toFixed(3)})`;
    }
  }
  return 'rgba(0,0,0,0)';
}

function pt(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/**
 * A 1.5pt border ring with a light circling it (purple → gold, 3.6s, linear).
 *
 * React Native has no conic gradient, so the sweep is drawn as 40 thin wedges
 * whose colours follow the web gradient stop for stop, in one static SVG that
 * is then rotated on the native driver. The wedge disc is clipped to the
 * rounded rect, so only the 1.5pt rim between it and the child shows the light.
 *
 * The child must paint its own opaque background (the card does). Pass
 * `active={false}` to pause — focus lost, app backgrounded. Under Reduce Motion
 * the sweep is not drawn and only the resting `base` rim remains.
 */
export function HaloBorder({
  children,
  radius,
  base,
  active = true,
  ringWidth = 1.5,
  style,
}: {
  children: ReactNode;
  radius: number;
  /** Resting rim colour behind the sweep (the theme border). */
  base: string;
  active?: boolean;
  ringWidth?: number;
  /** Outer view: put the shadow here, not on the child. */
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReduceMotion();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  const wedges = useMemo(() => {
    if (!size) return null;
    const d = Math.hypot(size.w, size.h);
    const c = d / 2;
    const out: { path: string; fill: string }[] = [];
    const span = (1 - START) * 360;
    for (let i = 0; i < WEDGES; i++) {
      const a0 = START * 360 + (i / WEDGES) * span;
      const a1 = START * 360 + ((i + 1) / WEDGES) * span + EXTEND_DEG;
      const p0 = pt(c, c, c, a0);
      const p1 = pt(c, c, c, a1);
      out.push({
        path: `M ${c} ${c} L ${p0.x} ${p0.y} A ${c} ${c} 0 0 1 ${p1.x} ${p1.y} Z`,
        fill: colorAt(START + ((i + 0.5) / WEDGES) * (1 - START)),
      });
    }
    return { d, items: out };
  }, [size]);

  useEffect(() => {
    if (reduced !== false || !active || !size) return;
    let loop: Animated.CompositeAnimation | null = null;
    let v = 0;
    spin.stopAnimation((x) => {
      v = x;
    });
    // Finish the current turn from where it stopped, then loop whole turns.
    const rest = Animated.timing(spin, {
      toValue: 1,
      duration: Math.max(1, (1 - v) * durations.halo),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    rest.start(({ finished }) => {
      if (!finished) return;
      spin.setValue(0);
      loop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: durations.halo,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    });
    return () => {
      rest.stop();
      loop?.stop();
    };
  }, [reduced, active, size, spin]);

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((s) => (s && s.w === width && s.h === height ? s : { w: width, h: height }));
      }}
      style={[
        { borderRadius: radius, backgroundColor: base, padding: ringWidth, overflow: 'hidden' },
        style,
      ]}
    >
      {wedges && size && reduced === false ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (size.w - wedges.d) / 2,
            top: (size.h - wedges.d) / 2,
            width: wedges.d,
            height: wedges.d,
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        >
          <Svg width={wedges.d} height={wedges.d}>
            {wedges.items.map((w, i) => (
              <Path key={i} d={w.path} fill={w.fill} />
            ))}
          </Svg>
        </Animated.View>
      ) : null}
      <View style={[styles.inner, { borderRadius: Math.max(0, radius - ringWidth) }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { overflow: 'hidden' },
});

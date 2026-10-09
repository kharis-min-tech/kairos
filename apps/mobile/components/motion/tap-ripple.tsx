import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { hapticLight } from '@/lib/haptics';
import { durations, easings } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

/**
 * Gold tap ripple that expands from the exact touch point, clipped to the
 * surface, plus a light haptic.
 *
 *   const ripple = useTapRipple(radius);
 *   <Pressable onPressIn={ripple.onPressIn} onLayout={ripple.onLayout} …>
 *     …content…
 *     {ripple.layer}
 *   </Pressable>
 *
 * Touch coordinates come from pageX/pageY against the layer's own window
 * position — nativeEvent.locationX is relative to the deepest child that
 * received the touch, which is wrong the moment a label sits on the button.
 * Under Reduce Motion the ripple is skipped; the haptic still fires.
 */
export function useTapRipple(radius = 0): {
  onPressIn: (e: GestureResponderEvent) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  layer: ReactNode;
} {
  const reduced = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const host = useRef<View>(null);
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const p = useRef(new Animated.Value(1)).current; // 1 = finished, invisible

  const diameter = Math.max(1, Math.hypot(size.w, size.h) * 2);

  const play = useCallback(
    (px: number, py: number) => {
      x.setValue(px);
      y.setValue(py);
      p.setValue(0);
      Animated.timing(p, {
        toValue: 1,
        duration: durations.ripple,
        easing: easings.out,
        useNativeDriver: true,
      }).start();
    },
    [x, y, p],
  );

  const onPressIn = useCallback(
    (e: GestureResponderEvent) => {
      hapticLight();
      if (reduced !== false) return;
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      const node = host.current;
      if (!node) return play(locationX, locationY);
      node.measureInWindow((wx, wy) => {
        if (Number.isFinite(wx) && Number.isFinite(wy)) play(pageX - wx, pageY - wy);
        else play(locationX, locationY);
      });
    },
    [reduced, play],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
  }, []);

  const layer = (
    <View
      ref={host}
      pointerEvents="none"
      collapsable={false}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: diameter,
          height: diameter,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateX: Animated.add(x, -diameter / 2) },
            { translateY: Animated.add(y, -diameter / 2) },
            { scale: p },
          ],
        }}
      >
        <Svg width={diameter} height={diameter}>
          <Defs>
            <RadialGradient id="ripple" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#F8B537" stopOpacity={0.35} />
              <Stop offset="1" stopColor="#F8B537" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={diameter} height={diameter} fill="url(#ripple)" />
        </Svg>
      </Animated.View>
    </View>
  );

  return { onPressIn, onLayout, layer };
}

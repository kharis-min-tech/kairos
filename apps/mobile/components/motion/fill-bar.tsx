import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { canvasColors, durations, easings } from './tokens';
import { useReduceMotion } from './use-reduce-motion';

/**
 * A 3pt gold bar along the bottom edge that fills left → right (1300ms, draw
 * easing) while `active`, and is cleared when it isn't. Drive `active` from
 * real state (an auth request), never a timer. Under Reduce Motion it appears
 * full-width at once.
 */
export function FillBar({ active }: { active: boolean }) {
  const reduced = useReduceMotion();
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      fill.setValue(0);
      return;
    }
    if (reduced !== false) {
      fill.setValue(1);
      return;
    }
    const anim = Animated.timing(fill, {
      toValue: 1,
      duration: durations.progressBar,
      easing: easings.draw,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [active, reduced, fill]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        // transformOrigin (RN 0.73+) anchors the scale to the left edge and is
        // native-driver safe, so the fill grows left → right on the UI thread.
        { transformOrigin: 'left center', transform: [{ scaleX: fill }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: canvasColors.gold,
  },
});

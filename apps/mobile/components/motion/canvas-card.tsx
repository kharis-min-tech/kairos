import type { ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, useColors } from '@kairos/ui-native';
import { HaloBorder } from './halo-border';
import { useEntrance } from './use-entrance';
import { useMotionActive } from './use-motion-active';

/**
 * An auth card with the Canvas treatment: it enters with the screen and a
 * light circles its 1.5pt border. Pass the screen's existing card style as
 * `style` (surface, padding, gap) — the shadow and the corner radius belong to
 * the halo, so any radius in `style` is overridden.
 */
export function CanvasCard({
  children,
  style,
  entranceIndex = 1,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  entranceIndex?: number | null;
}) {
  const c = useColors();
  const active = useMotionActive();
  const entrance = useEntrance(entranceIndex);
  return (
    <Animated.View style={entrance}>
      <HaloBorder radius={radii.lg} base={c.border} active={active} style={styles.shadow}>
        <View style={[style, styles.noRadius]}>{children}</View>
      </HaloBorder>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  noRadius: { borderRadius: 0 },
});

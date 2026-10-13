import { Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radii } from '@kairos/ui-native';
import { KharisDove } from '../kharis-dove';
import { useEntrance } from './use-entrance';

/**
 * The brand tile: the dove, drawn stroke by stroke inside the purple box, once.
 * It enters with the rest of the screen, and the pen waits until the tile has
 * mostly faded in so the drawing is actually seen. It does not float or loop —
 * the drifting glow behind it is the only ambient motion.
 */
export function CanvasLogo({
  size = 56,
  entranceIndex = 0,
  radius = radii.md,
}: {
  size?: number;
  entranceIndex?: number | null;
  radius?: number;
}) {
  const entrance = useEntrance(entranceIndex);
  return (
    <Animated.View style={[styles.tile, { width: size, height: size, borderRadius: radius }, entrance]}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KharisDove size={Math.round(size * 0.62)} draw drawDelay={DOVE_DRAW_DELAY_MS} />
    </Animated.View>
  );
}

/** Entrance delay (300ms) plus most of its spring, plus the web's 220ms rest. */
export const DOVE_DRAW_DELAY_MS = 900;

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

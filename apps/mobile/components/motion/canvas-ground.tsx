import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientGlow } from './ambient-glow';
import { CanvasBackground } from './canvas-background';
import { useMotionActive } from './use-motion-active';

/**
 * The Canvas ground for an auth screen: tints, dot grid and the drifting glow
 * behind the logo. Drop it in as the first child of the screen's SafeAreaView.
 * `extraTop` is for screens with a header bar above the logo.
 */
export function CanvasGround({ extraTop = 0 }: { extraTop?: number }) {
  const insets = useSafeAreaInsets();
  const active = useMotionActive();
  return (
    <CanvasBackground>
      <AmbientGlow top={insets.top + 84 + extraTop} active={active} />
    </CanvasBackground>
  );
}

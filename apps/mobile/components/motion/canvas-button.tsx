import type { ComponentProps } from 'react';
import { Button, radii } from '@kairos/ui-native';
import { FillBar } from './fill-bar';
import { useTapRipple } from './tap-ripple';

type ButtonProps = ComponentProps<typeof Button>;

/**
 * The shared Button with the Canvas tap: a gold ripple from the touch point, a
 * light haptic, and a gold progress bar along the bottom while `loading`.
 * Everything else — variants, sizes, the spinner — is the plain Button.
 */
export function CanvasButton(props: ButtonProps) {
  const ripple = useTapRipple(radii.lg);
  return (
    <Button
      {...props}
      onPressIn={ripple.onPressIn}
      onLayout={ripple.onLayout}
      overlay={
        <>
          {ripple.layer}
          {props.loading ? <FillBar active /> : null}
        </>
      }
    />
  );
}

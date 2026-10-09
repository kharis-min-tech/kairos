import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The OS "Reduce Motion" setting. `null` until the first answer arrives, so a
 * caller can hold its animation until it knows whether to run one. Stays live:
 * flipping the setting while the screen is open takes effect immediately.
 */
export function useReduceMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!cancelled) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduced;
}

/**
 * Light tap feedback.
 *
 * expo-haptics is a native module, so a binary built before it was added does
 * not have it. The require is lazy and guarded: on an older build this is a
 * silent no-op instead of a crash at import time, and the motion still works.
 */
type HapticsModule = {
  impactAsync: (style: unknown) => Promise<void>;
  ImpactFeedbackStyle: { Light: unknown };
};

let mod: HapticsModule | null | undefined;

function load(): HapticsModule | null {
  if (mod !== undefined) return mod;
  try {
    mod = require('expo-haptics') as HapticsModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function hapticLight(): void {
  const h = load();
  if (!h) return;
  void h.impactAsync(h.ImpactFeedbackStyle.Light).catch(() => undefined);
}

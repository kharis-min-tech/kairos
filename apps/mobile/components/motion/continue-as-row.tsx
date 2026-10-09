import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint } from 'lucide-react-native';
import {
  gradients,
  typography,
  spacing,
  useThemedStyles,
  type ThemeColors,
} from '@kairos/ui-native';
import { canvasColors } from './tokens';
import { useEntrance } from './use-entrance';
import { useReduceMotion } from './use-reduce-motion';
import { useTapRipple } from './tap-ripple';

// ≤4pt corners, per the Canvas rule (avatars and round buttons excepted).
const ROW_RADIUS = 4;
const AUTH_DELAY_MS = 260;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : '';
  return (a + b).toUpperCase();
}

/**
 * A "Continue as {name}" biometric row: a solid tonal row (muted at ~55%, 1pt
 * border, 54pt) with a 32pt gradient initials avatar, the label, and a
 * fingerprint on the right.
 *
 * On tap, alongside the gold ripple from the touch point: a gold ring pulses
 * out of the icon twice, the icon stroke flashes purple → gold → purple, the
 * row takes a gold tint flash (0 → 18% → 0 over 1.4s) and a quick scale press.
 * Then `onAuthenticate` runs — a beat later, so the feedback registers before
 * the OS biometric sheet covers it.
 */
export function ContinueAsRow({
  name,
  busy,
  disabled,
  accessibilityLabel,
  onAuthenticate,
  entranceIndex,
}: {
  name: string;
  busy: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  onAuthenticate: () => void;
  entranceIndex: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const reduced = useReduceMotion();
  const entrance = useEntrance(entranceIndex);
  const ripple = useTapRipple(ROW_RADIUS);

  const scale = useRef(new Animated.Value(1)).current;
  const tint = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handlePress() {
    if (disabled) return;
    if (reduced === false) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: true }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      Animated.sequence([
        Animated.timing(tint, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(tint, {
          toValue: 0,
          duration: 1120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      ring.setValue(0);
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start();
      flash.setValue(0);
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 440, useNativeDriver: true }),
      ]).start();
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onAuthenticate, reduced === false ? AUTH_DELAY_MS : 0);
  }

  return (
    <Animated.View style={entrance}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handlePress}
          onPressIn={ripple.onPressIn}
          onLayout={ripple.onLayout}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.row}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: canvasColors.gold, opacity: Animated.multiply(tint, 0.18) },
            ]}
          />
          <View style={styles.avatar}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {busy ? 'Authenticating…' : `Continue as ${name}`}
          </Text>
          <View style={styles.iconWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                  transform: [
                    { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) },
                  ],
                },
              ]}
            />
            <Fingerprint color={canvasColors.purple} size={22} strokeWidth={1.6} />
            <Animated.View pointerEvents="none" style={[styles.iconFlash, { opacity: flash }]}>
              <Fingerprint color={canvasColors.gold} size={22} strokeWidth={1.6} />
            </Animated.View>
          </View>
          {ripple.layer}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: ROW_RADIUS,
      borderWidth: 1,
      borderColor: c.border,
      // Muted surface at ~55% (0x8c).
      backgroundColor: `${c.subtle}8c`,
      overflow: 'hidden',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    label: { flex: 1, ...typography.button, color: c.ink },
    iconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: canvasColors.gold,
    },
    iconFlash: { position: 'absolute' },
  });
}

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AccessibilityInfo,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii, spacing, typography } from './tokens';
import { useColors, useThemedStyles, type ThemeColors } from './theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  leadingSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
  /**
   * Canvas focus treatment: the border eases to gold and a 3pt gold glow
   * (25%) fades in around the field over 200ms, and the text is 16pt so iOS
   * doesn't zoom on focus. Off by default; other screens are unchanged.
   */
  canvas?: boolean;
}

export function Input({
  label,
  error,
  secureToggle = false,
  secureTextEntry: secureTextEntryProp,
  containerStyle,
  leadingSlot,
  trailingSlot,
  onFocus,
  onBlur,
  canvas = false,
  ...rest
}: InputProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const glow = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!canvas) return;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, [canvas]);
  const [focused, setFocused] = useState(false);
  const [showSecure, setShowSecure] = useState(false);
  const isSecure = secureTextEntryProp && !showSecure;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        {canvas ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: Animated.multiply(glow, 0.25) }]}
          />
        ) : null}
      <Animated.View
        style={[
          styles.field,
          !canvas && focused && styles.fieldFocused,
          canvas && styles.fieldCanvas,
          canvas && {
            borderColor: glow.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.gold] }),
          },
          !!error && styles.fieldError,
        ]}
      >
        {leadingSlot ? <View style={styles.leadingSlot}>{leadingSlot}</View> : null}
        <TextInput
          {...rest}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setFocused(true);
            if (canvas) {
              Animated.timing(glow, {
                toValue: 1,
                duration: reduced ? 0 : 200,
                useNativeDriver: false,
              }).start();
            }
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            if (canvas) {
              Animated.timing(glow, {
                toValue: 0,
                duration: reduced ? 0 : 200,
                useNativeDriver: false,
              }).start();
            }
            onBlur?.(e);
          }}
          style={[styles.input, canvas && styles.inputCanvas]}
          placeholderTextColor={styles.placeholderColor.color}
        />
        {trailingSlot ? <View style={styles.trailingSlot}>{trailingSlot}</View> : null}
        {secureToggle && secureTextEntryProp ? (
          <Pressable
            onPress={() => setShowSecure((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showSecure ? 'Hide password' : 'Show password'}
            style={styles.toggle}
          >
            <Text style={styles.toggleLabel}>{showSecure ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    label: {
      ...typography.eyebrow,
      color: c.ink,
      opacity: 0.6,
      marginBottom: spacing.xs,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
    },
    // Constant 1.5pt so focus changes colour, not size.
    fieldCanvas: { borderWidth: 1.5, minHeight: 48 },
    glow: {
      position: 'absolute',
      top: -3,
      left: -3,
      right: -3,
      bottom: -3,
      borderRadius: radii.md + 3,
      backgroundColor: c.gold,
    },
    inputCanvas: { fontSize: 16 },
    fieldFocused: {
      borderColor: c.gold,
      borderWidth: 1.5,
    },
    fieldError: {
      borderColor: c.danger,
      borderWidth: 1.5,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: c.ink,
      paddingVertical: spacing.sm,
    },
    // placeholderTextColor takes a raw string, not a style — expose it as a
    // reachable field so the caller can read the resolved value.
    placeholderColor: { color: c.inkFaded },
    leadingSlot: {
      marginRight: spacing.sm,
    },
    trailingSlot: {
      marginLeft: spacing.sm,
    },
    toggle: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    toggleLabel: {
      ...typography.meta,
      color: c.primary,
      fontWeight: '600',
    },
    errorText: {
      ...typography.meta,
      color: c.danger,
      marginTop: spacing.xs,
    },
  });
}

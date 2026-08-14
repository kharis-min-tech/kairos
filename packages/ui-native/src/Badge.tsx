import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radii, spacing } from './tokens';

type Variant = 'primary' | 'gold' | 'success' | 'danger' | 'info' | 'neutral';
type Size = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: Size;
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.base, SIZE_STYLE[size], VARIANT_BG[variant]]}>
      <Text style={[styles.label, SIZE_LABEL[size], VARIANT_TEXT[variant]]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const SIZE_STYLE: Record<Size, ViewStyle> = {
  sm: { paddingHorizontal: spacing.xs, paddingVertical: 1 },
  md: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
};
const SIZE_LABEL: Record<Size, TextStyle> = {
  sm: { fontSize: 9 },
  md: { fontSize: 10 },
};

const VARIANT_BG: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: 'rgba(93,63,211,0.14)' },
  gold: { backgroundColor: 'rgba(248,181,55,0.18)' },
  success: { backgroundColor: 'rgba(16,185,129,0.15)' },
  danger: { backgroundColor: 'rgba(225,29,72,0.12)' },
  info: { backgroundColor: 'rgba(59,130,246,0.12)' },
  neutral: { backgroundColor: 'rgba(26,28,28,0.08)' },
};

const VARIANT_TEXT: Record<Variant, TextStyle> = {
  primary: { color: colors.primary },
  gold: { color: colors.goldDark },
  success: { color: colors.successText },
  danger: { color: colors.danger },
  info: { color: colors.info },
  neutral: { color: 'rgba(26,28,28,0.65)' },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});

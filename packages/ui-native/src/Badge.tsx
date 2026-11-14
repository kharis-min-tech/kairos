import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { radii, spacing } from './tokens';
import { useThemedStyles, type ThemeColors } from './theme';

type Variant = 'primary' | 'gold' | 'success' | 'danger' | 'info' | 'neutral';
type Size = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: Size;
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.base, SIZE_STYLE[size], styles[`bg_${variant}` as const]]}>
      <Text style={[styles.label, SIZE_LABEL[size], styles[`text_${variant}` as const]]}>
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radii.xs,
      alignSelf: 'flex-start',
    },
    label: {
      fontWeight: '600',
      letterSpacing: 0.6,
    },

    bg_primary: { backgroundColor: c.primaryTint },
    bg_gold: { backgroundColor: c.goldTint },
    bg_success: { backgroundColor: c.successTint },
    bg_danger: { backgroundColor: c.dangerTint },
    bg_info: { backgroundColor: c.infoTint },
    bg_neutral: { backgroundColor: c.divider },

    text_primary: { color: c.primary },
    text_gold: { color: c.gold },
    text_success: { color: c.successText },
    text_danger: { color: c.danger },
    text_info: { color: c.info },
    text_neutral: { color: c.inkMuted },
  });
}

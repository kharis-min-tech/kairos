import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, shadows } from './tokens';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Variant = 'default' | 'subtle' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  padding?: Padding;
  variant?: Variant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  padding = 'md',
  variant = 'default',
  onPress,
  style,
}: CardProps) {
  const combined = [
    styles.base,
    VARIANT_STYLE[variant],
    PADDING_STYLE[padding],
    variant === 'default' && shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={combined}>
        {children}
      </Pressable>
    );
  }
  return <View style={combined}>{children}</View>;
}

const VARIANT_STYLE: Record<Variant, ViewStyle> = {
  default: { backgroundColor: colors.cardLight },
  subtle: { backgroundColor: colors.subtleLight },
  elevated: { backgroundColor: colors.cardLight },
};

const PADDING_STYLE: Record<Padding, ViewStyle> = {
  none: {},
  sm: { padding: spacing.sm },
  md: { padding: spacing.md },
  lg: { padding: spacing.lg },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
  },
});

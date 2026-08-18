import React, { useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii, spacing, shadows } from './tokens';
import { useColors } from './theme';

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
  const c = useColors();
  const variantStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: variant === 'subtle' ? c.subtle : c.card,
    }),
    [c, variant],
  );

  const combined = [
    styles.base,
    variantStyle,
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

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, spacing, shadows, gradients } from './tokens';
import { useColors, useThemedStyles, type ThemeColors } from './theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  style,
}: ButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const isDisabled = disabled || loading;

  const labelStyle =
    variant === 'primary'
      ? styles.labelPrimary
      : variant === 'secondary'
        ? styles.labelSecondary
        : styles.labelBrand;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? c.onPrimary : c.primary}
          size="small"
        />
      ) : (
        <>
          {iconLeft ? <View style={styles.icon}>{iconLeft}</View> : null}
          <Text style={[styles.label, LABEL_SIZE[size], labelStyle]}>
            {label}
          </Text>
          {iconRight ? <View style={styles.icon}>{iconRight}</View> : null}
        </>
      )}
    </View>
  );

  const baseStyle = [
    styles.base,
    SIZE_STYLE[size],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ];

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[...baseStyle, shadows.buttonHero, style]}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        />
        {content}
      </Pressable>
    );
  }

  const variantStyle =
    variant === 'secondary'
      ? styles.variantSecondary
      : variant === 'outline'
        ? styles.variantOutline
        : styles.variantGhost;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[...baseStyle, variantStyle, style]}
    >
      {content}
    </Pressable>
  );
}

const SIZE_STYLE: Record<Size, ViewStyle> = {
  sm: { paddingHorizontal: spacing.md, height: 36 },
  md: { paddingHorizontal: spacing.lg, height: 44 },
  lg: { paddingHorizontal: spacing.xl, height: 56 },
};

const LABEL_SIZE: Record<Size, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 14 },
  lg: { fontSize: 16 },
};

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    label: {
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidth: { alignSelf: 'stretch' },
    disabled: { opacity: 0.5 },
    gradientFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radii.lg,
    },
    variantSecondary: { backgroundColor: c.subtle },
    variantOutline: {
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: 'transparent',
    },
    variantGhost: { backgroundColor: 'transparent' },
    labelPrimary: { color: c.onPrimary },
    labelSecondary: { color: c.ink },
    labelBrand: { color: c.primary },
  });
}

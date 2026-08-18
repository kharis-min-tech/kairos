import React, { useState } from 'react';
import {
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
import { useThemedStyles, type ThemeColors } from './theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  leadingSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
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
  ...rest
}: InputProps) {
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [showSecure, setShowSecure] = useState(false);
  const isSecure = secureTextEntryProp && !showSecure;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {leadingSlot ? <View style={styles.leadingSlot}>{leadingSlot}</View> : null}
        <TextInput
          {...rest}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
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

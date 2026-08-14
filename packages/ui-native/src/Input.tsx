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
import { colors, radii, spacing, typography } from './tokens';

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
          placeholderTextColor="rgba(26,28,28,0.4)"
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

const styles = StyleSheet.create({
  label: {
    ...typography.eyebrow,
    color: colors.ink,
    opacity: 0.6,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  fieldFocused: {
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  fieldError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
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
    color: colors.primary,
    fontWeight: '600',
  },
  errorText: {
    ...typography.meta,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

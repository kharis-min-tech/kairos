import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { spacing, typography } from './tokens';
import { useColors } from './theme';

type Variant = 'section' | 'screen';

interface EmptyStateProps {
  /**
   * Optional. Leave it out inside a section that already has a header, which
   * is the common case: a heading directly under a heading says it twice.
   */
  title?: string;
  /** One line. What is missing and what to do about it. */
  message: string;
  /** The primary action, for `screen` only. A section's action lives in its header. */
  action?: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

/**
 * What a list or section shows when it holds nothing.
 *
 * Deliberately has no icon slot. Every empty state in the app used to be a
 * centred brand-tinted circle holding an icon that restated the heading, a
 * Baby above the words "No children", taking the largest block on the screen
 * at the moment the screen had least to say. It made the emptiness louder.
 *
 * It is a component rather than a convention because the convention is what
 * failed: twenty screens hand-rolled their own card and drifted apart. There
 * is no `icon` prop on purpose, so the old shape cannot grow back one screen
 * at a time without someone changing this file and being seen doing it.
 */
export function EmptyState({
  title,
  message,
  action,
  variant = 'section',
  style,
}: EmptyStateProps) {
  const c = useColors();
  const isScreen = variant === 'screen';

  return (
    <View
      style={[
        { gap: spacing.xs },
        isScreen && { paddingVertical: spacing.xl, gap: spacing.sm },
        style,
      ]}
    >
      {title ? (
        <Text
          style={[
            isScreen ? typography.cardTitle : typography.body,
            { color: c.ink, fontWeight: '600' },
          ]}
        >
          {title}
        </Text>
      ) : null}
      <Text style={[typography.body, { color: c.inkFaded, lineHeight: 20 }]}>
        {message}
      </Text>
      {isScreen && action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.xs, alignSelf: 'flex-start' },
});

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { typography } from './tokens';
import { useColors } from './theme';

interface StatusTextProps {
  /** The status as a person reads it: "Reviewed", "Probation failed". */
  label: string;
  /**
   * True when this status is a job somebody still owes. Derive it from
   * `isAwaitingAction` in `@kairos/types` rather than deciding per screen.
   */
  awaiting?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * One status, down a list.
 *
 * Statuses used to be filled pills, one tint per value, so a list of twenty
 * rows was twenty coloured areas at equal weight and none of them stood out.
 * Colour here means attention: the one value waiting on a person takes the
 * gold dot, every other value is plain text. A list with nothing pending is
 * monochrome, which is the correct amount of noise for a list with nothing
 * pending.
 */
export function StatusText({ label, awaiting = false, style }: StatusTextProps) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {awaiting ? <View style={[styles.dot, { backgroundColor: c.gold }]} /> : null}
      <Text
        style={[
          typography.body,
          { color: awaiting ? c.gold : c.inkFaded },
          awaiting && styles.strong,
          style,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  strong: { fontWeight: '600' },
});

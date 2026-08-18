import React from 'react';
import { View, StyleSheet } from 'react-native';
import { radii } from './tokens';
import { useColors } from './theme';

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color,
  trackColor,
  height = 6,
}: ProgressBarProps) {
  const c = useColors();
  const pct = Math.min(1, Math.max(0, value));
  const fillColor = color ?? c.gold;
  const track = trackColor ?? c.divider;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, backgroundColor: track }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, height, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii } from './tokens';

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color = colors.gold,
  trackColor = 'rgba(26,28,28,0.08)',
  height = 6,
}: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, backgroundColor: trackColor }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, height, backgroundColor: color },
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

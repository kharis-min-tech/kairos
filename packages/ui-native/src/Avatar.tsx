import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from './theme';

type SizeName = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<SizeName, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 96,
};

interface AvatarProps {
  size?: SizeName | number;
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  notificationDot?: boolean;
}

export function Avatar({
  size = 'md',
  photoUrl,
  firstName,
  lastName,
  notificationDot = false,
}: AvatarProps) {
  const c = useColors();
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const initials = getInitials(firstName, lastName);
  const dotSize = Math.max(6, Math.round(px * 0.22));

  return (
    <View style={{ width: px, height: px }}>
      <View
        style={[
          styles.circle,
          { width: px, height: px, borderRadius: px / 2 },
        ]}
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: px, height: px, borderRadius: px / 2 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <>
            <LinearGradient
              colors={[c.primaryLight, c.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: px / 2,
              }}
            />
            <Text
              style={[
                styles.initials,
                { color: c.onPrimary, fontSize: Math.round(px * 0.38) },
              ]}
            >
              {initials}
            </Text>
          </>
        )}
      </View>
      {notificationDot ? (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              right: -1,
              top: -1,
              backgroundColor: c.gold,
              borderColor: c.card,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim()?.[0] ?? '';
  const last = lastName?.trim()?.[0] ?? '';
  const combined = `${first}${last}`.toUpperCase();
  return combined || '?';
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
  },
});

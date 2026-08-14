import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii, gradients } from '@kairos/ui-native';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(onboarding)/language');
    }, 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.splash} style={styles.gradientFill} />
      <View style={styles.center}>
        <View style={styles.logoTile}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradientFill}
          />
          <Text style={styles.logoK}>K</Text>
        </View>

        <Text style={styles.wordmark}>KAIROS</Text>
        <Text style={styles.sublabel}>Kharis Church</Text>

        <View style={styles.scripture}>
          <Text style={styles.scriptureText}>
            &ldquo;Let all things be done{' '}
            <Text style={{ color: colors.primaryLight }}>decently</Text> and in{' '}
            <Text style={{ color: colors.gold }}>order</Text>.&rdquo;
          </Text>
          <Text style={styles.scriptureRef}>1 Cor 14:40</Text>
        </View>

        <ActivityIndicator color="#ffffff" style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoGradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logoTile: {
    width: 76,
    height: 76,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoK: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3.3,
    marginTop: spacing.md,
  },
  sublabel: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.4,
  },
  scripture: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  scriptureText: {
    ...typography.body,
    color: '#ffffff',
    opacity: 0.85,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scriptureRef: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.5)',
  },
});

import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kairos',
  slug: 'kairos-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'kairos',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    backgroundColor: '#0c0a1a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kharis.kairos',
  },
  android: {
    package: 'com.kharis.kairos',
    adaptiveIcon: {
      backgroundColor: '#5D3FD3',
    },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
});

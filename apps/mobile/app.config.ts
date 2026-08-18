import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kairos',
  slug: 'kairos-mobile',
  version: '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'kairos',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kharis.kairos',
    // Universal-links: when the OS sees an https link on kairos.kharis.org
    // (or staging) whose path matches the AASA file, it opens the app instead
    // of Safari. AASA files live at apps/web/public/.well-known/.
    associatedDomains: [
      'applinks:kairos.kharis.org',
      'applinks:staging.kairos.kharis.org',
    ],
  },
  android: {
    package: 'com.kharis.kairos',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#5D3FD3',
    },
    // App-links: same idea as iOS. `autoVerify: true` tells the OS to verify
    // the assetlinks.json from the domain on install; when it passes, the app
    // wins the deep-link intent silently. Password reset + email verify are
    // the two paths currently mailed out.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'kairos.kharis.org',
            pathPrefix: '/reset-password',
          },
          {
            scheme: 'https',
            host: 'kairos.kharis.org',
            pathPrefix: '/verify-email',
          },
          {
            scheme: 'https',
            host: 'staging.kairos.kharis.org',
            pathPrefix: '/reset-password',
          },
          {
            scheme: 'https',
            host: 'staging.kairos.kharis.org',
            pathPrefix: '/verify-email',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#5D3FD3',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Kairos needs access to your photo library so you can pick a profile photo.',
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
  },
  owner: 'danielbolarinwa',
  updates: {
    url: 'https://u.expo.dev/8f936297-f8c8-4257-97f1-e079ae99921f',
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
    eas: {
      projectId: '8f936297-f8c8-4257-97f1-e079ae99921f',
    },
  },
});

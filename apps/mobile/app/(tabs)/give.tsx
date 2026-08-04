import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '@kairos/ui-native';

const GIVING_URL = 'https://kharis.org/giving/';

export default function Give() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WebView
        source={{ uri: GIVING_URL }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
        // Giving stays on the web; keep any Stripe redirects inside the WebView.
        setSupportMultipleWindows={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageLight,
  },
});

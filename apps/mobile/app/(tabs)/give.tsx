import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';

const GIVING_URL = 'https://kharis.org/giving/';

export default function Give() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WebView
        source={{ uri: GIVING_URL }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        )}
        // Giving stays on the web; keep any Stripe redirects inside the WebView.
        setSupportMultipleWindows={false}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  webview: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.page,
  },
});
}


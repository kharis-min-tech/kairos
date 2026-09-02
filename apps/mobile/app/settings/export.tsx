import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Download } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  Button,
  Card,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

export default function ExportSettings() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const res = await api.me.exportData();
      if (!res.success || !res.data) throw new Error(res.message ?? 'Export failed');
      const stamp = res.data.exportedAt.replace(/[^0-9A-Za-z]/g, '-');
      const file = new File(Paths.cache, `kairos-export-${stamp}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(res.data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Kairos data export',
        });
      } else {
        alert.info('Saved', `Export saved to app storage:\n${file.uri}`);
      }
    } catch (e) {
      alert.info('Export failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Export my data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Card padding="md" style={{ gap: spacing.md }}>
          <View style={styles.iconRow}>
            <Download color={c.primary} size={20} strokeWidth={1.5} />
            <Text style={styles.title}>Download everything we hold on you</Text>
          </View>
          <Text style={styles.body}>
            This produces a JSON file with your profile, attendance history,
            follow-ups, department + fellowship memberships, form submissions
            you&apos;ve made, and consent records. Give us a moment to prepare
            it. On a slow connection it can take up to 20 seconds.
          </Text>
          <Button
            label={busy ? 'Preparing…' : 'Prepare export'}
            size="lg"
            fullWidth
            loading={busy}
            onPress={doExport}
          />
        </Card>

        <Text style={styles.footnote}>
          Nothing is sent to third parties. The file is generated on demand and
          shared through your device&apos;s share sheet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { ...typography.cardTitle, color: c.ink },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.cardTitle, color: c.ink, flex: 1 },
    body: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      lineHeight: 15,
    },
  });
}

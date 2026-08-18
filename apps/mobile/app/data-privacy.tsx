import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { alert } from '@/lib/alert';
import { ChevronLeft, Download, Trash2, ShieldOff } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { DeleteAccountRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function DataPrivacy() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (data: DeleteAccountRequest) =>
      (await api.me.deleteAccount(data)).data!,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.me.exportData();
      const data = res.data;
      if (!data) throw new Error('Export returned no data');

      // Write to a real .html file and hand it to the OS share sheet as an
      // attachment. Beats dumping raw JSON into the message body: recipients
      // can archive it, mail it to themselves, save to cloud drive, etc.
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `kharis-my-data-${stamp}.html`;
      const html = renderExportHtml(data as Record<string, unknown>, stamp);

      const file = new File(Paths.cache, filename);
      file.create({ overwrite: true });
      file.write(html);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        alert.info(
          'Saved',
          `Your data was written to ${filename} but sharing isn't available on this device.`,
        );
      } else {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/html',
          dialogTitle: `Kharis — my data (${stamp})`,
          UTI: 'public.html',
        });
      }
    } catch (err) {
      alert.info(
        'Export failed',
        err instanceof Error ? err.message : 'Could not export your data. Try again shortly.',
      );
    } finally {
      setExporting(false);
    }
  }

  function renderExportHtml(data: Record<string, unknown>, stamp: string): string {
    // Minimal, printable HTML with each top-level key as an <h2>, values as
    // <pre> JSON. Not trying to mirror the web's polished layout — this is a
    // legible archive for the member, and keeps the surface tiny so it stays
    // maintainable without a template engine on device.
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const sections = Object.entries(data)
      .map(
        ([k, v]) =>
          `<section><h2>${esc(k)}</h2><pre>${esc(JSON.stringify(v, null, 2))}</pre></section>`,
      )
      .join('\n');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kharis — my data (${esc(stamp)})</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1c1c; }
  header { border-bottom: 1px solid rgba(26,28,28,0.1); padding-bottom: 16px; margin-bottom: 24px; }
  h1 { margin: 0 0 4px; color: #5D3FD3; }
  h2 { color: #5D3FD3; margin-top: 24px; }
  pre { background: #fafafa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  .meta { color: rgba(26,28,28,0.6); font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>Kharis — my data</h1>
  <p class="meta">Exported ${esc(stamp)}</p>
</header>
${sections}
</body>
</html>`;
  }

  function openDeleteDialog() {
    setPassword('');
    setConfirmPhrase('');
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    setDeleteError(null);
    if (confirmPhrase !== DELETE_CONFIRM_PHRASE) {
      setDeleteError(`Please type "${DELETE_CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }
    if (!password) {
      setDeleteError('Please enter your current password.');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ currentPassword: password });
      qc.clear();
      await clearSession();
      router.replace('/(auth)/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Data &amp; privacy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Your data</Text>
          <Text style={styles.introMeta}>
            Export a copy of what we hold, or permanently delete your account.
          </Text>
        </View>

        <Card padding="md" style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={[styles.iconTile, { backgroundColor: 'rgba(93,63,211,0.1)' }]}>
              <Download color={c.primary} size={18} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.actionTitle}>Export my data</Text>
              <Text style={styles.actionMeta}>
                Get a JSON copy of your personal data via the share sheet — save to Files,
                email to yourself, or open in another app.
              </Text>
            </View>
          </View>
          <Button
            label={exporting ? 'Preparing…' : 'Export'}
            variant="outline"
            size="sm"
            loading={exporting}
            onPress={handleExport}
            fullWidth
          />
        </Card>

        <Card padding="md" style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={[styles.iconTile, { backgroundColor: 'rgba(225,29,72,0.1)' }]}>
              <Trash2 color={c.danger} size={18} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.actionTitle}>Delete my account</Text>
              <Text style={styles.actionMeta}>
                Permanently scrub your personal data. Attendance and consent history are
                anonymised, not fully removed. This cannot be undone.
              </Text>
            </View>
          </View>
          <Pressable style={styles.deleteButton} onPress={openDeleteDialog}>
            <Text style={styles.deleteButtonLabel}>Delete account…</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => (deleteMutation.isPending ? undefined : setDeleteOpen(false))}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ShieldOff color={c.danger} size={20} strokeWidth={1.5} />
              <Text style={styles.modalTitle}>Delete my account</Text>
            </View>
            <Text style={styles.modalDescription}>
              This will scrub your name, email, phone, address, photo, and other personal
              details from Kharis Church. Your attendance history and consent audit trail
              stay in place but are anonymised. This action cannot be undone.
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <Input
                label={`Type ${DELETE_CONFIRM_PHRASE} to confirm`}
                value={confirmPhrase}
                onChangeText={setConfirmPhrase}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Input
                label="Current password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
              />
              {deleteError ? (
                <Text style={styles.modalError} accessibilityRole="alert">
                  {deleteError}
                </Text>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                variant="outline"
                size="md"
                onPress={() => setDeleteOpen(false)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1 }}
              />
              <Pressable
                style={[styles.destructiveButton, deleteMutation.isPending && { opacity: 0.6 }]}
                onPress={deleteMutation.isPending ? undefined : handleDelete}
              >
                <Text style={styles.destructiveButtonLabel}>
                  {deleteMutation.isPending ? 'Deleting…' : 'Permanently delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
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
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.meta, color: c.inkMuted },
  actionCard: {
    gap: spacing.md,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  actionMeta: {
    ...typography.meta,
    color: c.inkMuted,
    lineHeight: 15,
  },
  deleteButton: {
    height: 36,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,72,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  deleteButtonLabel: {
    ...typography.button,
    color: c.danger,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: c.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.cardTitle,
    color: c.danger,
    fontSize: 17,
  },
  modalDescription: {
    ...typography.body,
    color: c.inkMuted,
    lineHeight: 20,
  },
  modalError: {
    ...typography.meta,
    color: c.danger,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  destructiveButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  destructiveButtonLabel: {
    ...typography.button,
    color: '#ffffff',
  },
});
}


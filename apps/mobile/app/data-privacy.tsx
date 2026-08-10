import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, Trash2, ShieldOff } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type { DeleteAccountRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function DataPrivacy() {
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
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        title: `Kharis — my data (${new Date().toISOString().slice(0, 10)})`,
        message: json,
      });
    } catch (err) {
      Alert.alert(
        'Export failed',
        err instanceof Error ? err.message : 'Could not export your data. Try again shortly.',
      );
    } finally {
      setExporting(false);
    }
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
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
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
              <Download color={colors.primary} size={18} strokeWidth={1.5} />
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
              <Trash2 color={colors.danger} size={18} strokeWidth={1.5} />
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
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ShieldOff color={colors.danger} size={20} strokeWidth={1.5} />
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: colors.ink },
  introMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
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
  actionTitle: { ...typography.body, color: colors.ink, fontWeight: '600' },
  actionMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
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
    color: colors.danger,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.cardLight,
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
    color: colors.danger,
    fontSize: 17,
  },
  modalDescription: {
    ...typography.body,
    color: 'rgba(26,28,28,0.75)',
    lineHeight: 20,
  },
  modalError: {
    ...typography.meta,
    color: colors.danger,
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
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  destructiveButtonLabel: {
    ...typography.button,
    color: '#ffffff',
  },
});

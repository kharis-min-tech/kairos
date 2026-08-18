import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useAuthStore } from '@/store/auth';

export default function DeleteAccountSettings() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const mutate = useMutation({
    mutationFn: async () =>
      (await api.me.deleteAccount({ currentPassword: password })).data!,
    onSuccess: async () => {
      alert.info(
        'Account deleted',
        'Your account has been removed. You will now be signed out.',
      );
      await clearSession();
      router.replace('/(auth)/login');
    },
    onError: (e: Error) =>
      alert.info('Could not delete', e.message ?? 'Please try again.'),
  });

  async function submit() {
    if (!password) {
      alert.info('Password required', 'Enter your current password to continue.');
      return;
    }
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      alert.info('Confirmation required', 'Type DELETE to confirm.');
      return;
    }
    const ok = await alert.confirm({
      title: 'Delete account?',
      message:
        'This will permanently delete your account. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) mutate.mutate();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete my account</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Card padding="md" style={{ gap: spacing.md, borderWidth: 1, borderColor: 'rgba(220,38,38,0.35)' }}>
            <View style={styles.iconRow}>
              <ShieldAlert color={c.danger} size={20} strokeWidth={1.5} />
              <Text style={styles.title}>This is permanent</Text>
            </View>
            <Text style={styles.body}>
              Deleting your account removes your profile and revokes your
              access. Aggregated attendance / participation history is retained
              in an anonymised form for church record-keeping.
            </Text>
          </Card>

          <Card padding="md" style={{ gap: spacing.md }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>Current password</Text>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                placeholder="Confirm it's really you"
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>Type DELETE to confirm</Text>
              <Input
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                placeholder="DELETE"
              />
            </View>
            <Button
              label={mutate.isPending ? 'Deleting…' : 'Delete my account'}
              size="lg"
              fullWidth
              loading={mutate.isPending}
              onPress={submit}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
    label: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
  });
}

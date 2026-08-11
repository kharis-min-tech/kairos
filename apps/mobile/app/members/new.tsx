import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, KeyRound } from 'lucide-react-native';
import {
  Button,
  Card,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type {
  CreateMemberRequest,
  CreateMemberResponse,
} from '@kairos/types';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api-client';
import { MemberForm } from './_form';

export default function NewMember() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateMemberResponse | null>(null);

  const create = useMutation({
    mutationFn: async (data: CreateMemberRequest) =>
      (await api.members.create(data)).data!,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['members'] });
      setCreated(row);
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      await create.mutateAsync(payload as CreateMemberRequest);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not create member. Please try again.',
      );
    }
  }

  async function sharePassword() {
    if (!created) return;
    try {
      await Share.share({
        message: `Welcome to Kairos! Sign in with:\nEmail: ${created.member.email}\nTemporary password: ${created.generatedPassword}\n\nYou'll be prompted to change this on first sign-in.`,
      });
    } catch (err) {
      Alert.alert(
        'Share failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  if (created) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>Member created</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check color={colors.success} size={48} strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>
            {created.member.firstName} {created.member.lastName} is set up
          </Text>
          <Text style={styles.successMeta}>
            Share the temporary password below so they can sign in. They&apos;ll be prompted
            to change it on first login.
          </Text>

          <Card padding="md" style={styles.credsCard}>
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Email</Text>
              <Text style={styles.credValue} numberOfLines={1}>
                {created.member.email}
              </Text>
            </View>
            <View style={styles.credDivider} />
            <View style={styles.credRow}>
              <Text style={styles.credLabel}>Temporary password</Text>
              <View style={styles.credPwPill}>
                <KeyRound color={colors.primary} size={14} strokeWidth={1.5} />
                <Text style={styles.credPwText} selectable>
                  {created.generatedPassword}
                </Text>
              </View>
              <Text style={styles.credHint}>
                Long-press the password to select and copy, or use Share below.
              </Text>
            </View>
          </Card>

          <View style={styles.successActions}>
            <Button
              label="Share credentials"
              variant="primary"
              size="md"
              fullWidth
              onPress={sharePassword}
            />
            <Button
              label="Open profile"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.replace(`/members/${created.member.id}`)}
            />
            <Button
              label="Add another"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => setCreated(null)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New member</Text>
        <View style={{ width: 24 }} />
      </View>

      <MemberForm
        mode="create"
        initial={{ homeBranchId: user?.homeBranchId ?? '' }}
        submitLabel="Create member"
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>
            The system generates a temporary password shown on the next screen. Share it
            with the new member — they&apos;ll be prompted to change it on first login.
            Requires admin or branch-admin access.
          </Text>
        }
      />
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
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
  successContainer: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  successTitle: {
    ...typography.screenTitle,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.65)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  credsCard: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  credRow: {
    gap: spacing.xs,
  },
  credDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,28,28,0.08)',
    marginVertical: spacing.xs,
  },
  credLabel: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.55)',
  },
  credValue: {
    ...typography.body,
    color: colors.ink,
    fontWeight: '600',
  },
  credPwPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(93,63,211,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  credPwText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: '700',
    flex: 1,
  },
  credHint: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    marginTop: 4,
    lineHeight: 15,
  },
  successActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

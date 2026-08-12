import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Card, colors, radii, spacing, typography } from '@kairos/ui-native';
import type { UpdateBranchRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { BranchForm } from '../_form';

export default function EditBranch() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const branch = useQuery({
    queryKey: ['branches', id],
    enabled: !!id,
    queryFn: async () => (await api.branches.get(id)).data ?? null,
  });

  const update = useMutation({
    mutationFn: async (data: UpdateBranchRequest) =>
      (await api.branches.update(id, data)).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['branches', id] });
      router.back();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.branches.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      router.replace('/branches');
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      await update.mutateAsync(payload as UpdateBranchRequest);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not save. Please try again.',
      );
    }
  }

  function confirmDelete(name: string) {
    Alert.alert(
      'Deactivate branch?',
      `Deactivate ${name}. Members stay assigned but the branch is hidden from directories and won't accept new activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await remove.mutateAsync();
            } catch (err) {
              setDeleting(false);
              Alert.alert(
                'Deactivate failed',
                err instanceof Error ? err.message : 'Please try again in a moment.',
              );
            }
          },
        },
      ],
    );
  }

  if (branch.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit branch</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (branch.isError || !branch.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit branch</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load this branch</Text>
          <Text style={styles.errorMeta}>
            {branch.error instanceof Error
              ? branch.error.message
              : 'Please go back and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const b = branch.data;
  const initial = {
    branchName: b.branchName,
    regionId: b.regionId,
    branchType: b.branchType,
    address: b.address ?? '',
    city: b.city ?? '',
    postalCode: b.postalCode ?? '',
    phone: b.phone ?? '',
    email: b.email ?? '',
    establishedDate: b.establishedDate ?? '',
    serviceSchedule: b.serviceSchedule ?? [],
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {b.branchName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <BranchForm
        mode="edit"
        initial={initial}
        submitLabel="Save changes"
        submitPendingLabel="Saving…"
        submitting={update.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <>
            <Pressable
              onPress={() => router.push(`/branches/roles/${b.id}`)}
              style={styles.linkCardWrap}
            >
              <Card padding="md" style={styles.linkCard}>
                <View style={styles.linkIconTile}>
                  <ShieldCheck color={colors.primary} size={18} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.linkTitle}>Branch admins</Text>
                  <Text style={styles.linkMeta}>
                    Manage who can invite members, edit settings, and assign roles for
                    this branch.
                  </Text>
                </View>
                <ChevronRight color="rgba(26,28,28,0.3)" size={18} strokeWidth={1.5} />
              </Card>
            </Pressable>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerEyebrow}>DANGER ZONE</Text>
              <Pressable
                onPress={
                  deleting || remove.isPending
                    ? undefined
                    : () => confirmDelete(b.branchName)
                }
                style={[
                  styles.dangerBtn,
                  (deleting || remove.isPending) && { opacity: 0.6 },
                ]}
              >
                <Trash2 color={colors.danger} size={16} strokeWidth={1.5} />
                <Text style={styles.dangerBtnLabel}>
                  {deleting || remove.isPending ? 'Deactivating…' : 'Deactivate branch'}
                </Text>
              </Pressable>
              <Text style={styles.footnote}>
                Hides the branch from directories. Members and history are preserved.
              </Text>
            </View>
          </>
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
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: { ...typography.cardTitle, color: colors.ink },
  errorMeta: { ...typography.body, color: 'rgba(26,28,28,0.6)', textAlign: 'center' },
  linkCardWrap: {
    marginTop: spacing.md,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { ...typography.body, color: colors.ink, fontWeight: '600' },
  linkMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    lineHeight: 15,
  },
  dangerZone: {
    marginTop: spacing.md,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(225,29,72,0.2)',
    backgroundColor: 'rgba(225,29,72,0.04)',
  },
  dangerEyebrow: {
    ...typography.eyebrow,
    color: colors.danger,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,72,0.4)',
    backgroundColor: colors.cardLight,
  },
  dangerBtnLabel: {
    ...typography.button,
    color: colors.danger,
    fontSize: 14,
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});

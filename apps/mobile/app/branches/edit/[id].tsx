import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2 } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { UpdateBranchRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { BranchForm } from '../_form';

export default function EditBranch() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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

  async function confirmDelete(name: string) {
    const ok = await alert.confirm({
      title: 'Deactivate branch?',
      message: `Deactivate ${name}. Members stay assigned but the branch is hidden from directories and won't accept new activity.`,
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await remove.mutateAsync();
    } catch (err) {
      setDeleting(false);
      alert.info(
        'Deactivate failed',
        err instanceof Error ? err.message : 'Please try again in a moment.',
      );
    }
  }

  if (branch.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit branch</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (branch.isError || !branch.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
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
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
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
                  <ShieldCheck color={c.primary} size={18} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.linkTitle}>Branch admins</Text>
                  <Text style={styles.linkMeta}>
                    Manage who can invite members, edit settings, and assign roles for
                    this branch.
                  </Text>
                </View>
                <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
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
                <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
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
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: { ...typography.cardTitle, color: c.ink },
  errorMeta: { ...typography.body, color: c.inkMuted, textAlign: 'center' },
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
  linkTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  linkMeta: {
    ...typography.meta,
    color: c.inkMuted,
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
    color: c.danger,
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
    backgroundColor: c.card,
  },
  dangerBtnLabel: {
    ...typography.button,
    color: c.danger,
    fontSize: 14,
  },
  footnote: {
    ...typography.meta,
    color: c.inkMuted,
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});
}


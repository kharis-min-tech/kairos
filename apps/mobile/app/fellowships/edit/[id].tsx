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
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { CreateFellowshipRequest, FellowshipType } from '@kairos/types';
import { api } from '@/lib/api-client';
import { FellowshipForm } from '../_form';

export default function EditFellowship() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fellowship = useQuery({
    queryKey: ['fellowships', id],
    enabled: !!id,
    queryFn: async () => (await api.fellowships.get(id)).data ?? null,
  });

  const update = useMutation({
    mutationFn: async (data: CreateFellowshipRequest) =>
      (await api.fellowships.update(id, data)).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships'] });
      qc.invalidateQueries({ queryKey: ['fellowships', id] });
      router.replace(`/fellowships/${id}`);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.fellowships.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fellowships'] });
      router.replace('/fellowships');
    },
  });

  async function handleSubmit(payload: CreateFellowshipRequest) {
    setServerError(null);
    try {
      await update.mutateAsync(payload);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not save. Please try again.',
      );
    }
  }

  async function confirmDelete() {
    const ok = await alert.confirm({
      title: 'Delete fellowship?',
      message:
        "This deactivates the fellowship and hides it from the directory. Members and past meetings are preserved but the fellowship won't accept new activity.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await remove.mutateAsync();
    } catch (err) {
      setDeleting(false);
      alert.info(
        'Delete failed',
        err instanceof Error ? err.message : 'Please try again in a moment.',
      );
    }
  }

  if (fellowship.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit fellowship</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (fellowship.isError || !fellowship.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit fellowship</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load this fellowship</Text>
          <Text style={styles.errorMeta}>
            {fellowship.error instanceof Error
              ? fellowship.error.message
              : 'Please go back and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const f = fellowship.data;
  const initial = {
    fellowshipName: f.fellowshipName,
    branchId: f.branchId,
    fellowshipType: f.fellowshipType as FellowshipType,
    description: f.description ?? '',
    meetingDay: f.meetingDay ?? '',
    meetingTime: f.meetingTime ?? '',
    meetingSchedule: f.meetingSchedule ?? '',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Edit fellowship
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FellowshipForm
        initial={initial}
        submitLabel="Save changes"
        submitPendingLabel="Saving…"
        submitting={update.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <View style={styles.dangerZone}>
            <Text style={styles.dangerEyebrow}>DANGER ZONE</Text>
            <Pressable
              onPress={deleting || remove.isPending ? undefined : confirmDelete}
              style={[
                styles.dangerBtn,
                (deleting || remove.isPending) && { opacity: 0.6 },
              ]}
            >
              <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
              <Text style={styles.dangerBtnLabel}>
                {deleting || remove.isPending ? 'Deleting…' : 'Delete fellowship'}
              </Text>
            </Pressable>
            <Text style={styles.footnote}>
              Deactivates the fellowship and hides it from the directory. Members and past
              meetings are preserved.
            </Text>
          </View>
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


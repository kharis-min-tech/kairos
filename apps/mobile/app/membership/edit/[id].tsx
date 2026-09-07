import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Archive } from 'lucide-react-native';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { CHURCH_SCOPE } from '@kairos/types';
import type { CreateMembershipCohortRequest, MembershipCohortStatus } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { CohortForm } from '../_form';

/**
 * Edit a cohort, and archive it. Gated on `membership:admin` at CHURCH scope.
 *
 * Archiving is a soft delete: the API sets `isActive = false` and the status to
 * `cancelled`. Enrolments and marks are preserved, which is why the confirm
 * copy says so rather than warning about data loss that does not happen.
 */
export default function EditCohort() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;
  const caps = useCapabilities();

  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  useRequireCapability(isAdmin, '/membership');

  const [serverError, setServerError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const cohort = useQuery({
    queryKey: ['membership', 'cohorts', id],
    enabled: isAdmin && !!id,
    queryFn: async () => (await api.membership.cohorts.get(id)).data ?? null,
  });

  const update = useMutation({
    mutationFn: async (data: CreateMembershipCohortRequest) =>
      (await api.membership.cohorts.update(id, data)).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      router.replace(`/membership/${id}` as never);
    },
  });

  const archive = useMutation({
    mutationFn: async () => (await api.membership.cohorts.archive(id)).data!,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      router.replace('/membership' as never);
    },
  });

  if (!isAdmin) return null;

  async function handleSubmit(payload: CreateMembershipCohortRequest) {
    setServerError(null);
    try {
      await update.mutateAsync(payload);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not save the cohort. Please try again.',
      );
    }
  }

  async function handleArchive() {
    const ok = await alert.confirm({
      title: 'Archive this cohort?',
      message:
        'It is marked cancelled and hidden from the list. Enrolments, marks and graduations are all preserved, and anyone already graduated stays a confirmed Member.',
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    setArchiving(true);
    try {
      await archive.mutateAsync();
    } catch (err) {
      setArchiving(false);
      alert.info(
        'Could not archive',
        err instanceof Error ? err.message : 'Please try again in a moment.',
      );
    }
  }

  const header = (
    <View style={styles.headerBar}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
      </Pressable>
      <Text style={styles.headerTitle}>Edit cohort</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (cohort.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (cohort.isError || !cohort.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load this cohort</Text>
          <Text style={styles.errorMeta}>
            {cohort.error instanceof Error
              ? cohort.error.message
              : 'Please go back and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const co = cohort.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}

      <CohortForm
        initial={{
          name: co.name,
          description: co.description ?? '',
          startDate: co.startDate,
          graduationDate: co.graduationDate ?? '',
          finalTestDeadline: co.finalTestDeadline ?? '',
          status: co.status as MembershipCohortStatus,
          enrolmentOpen: co.enrolmentOpen,
          homeworkPassMark: String(co.homeworkPassMark),
          quizPassMark: String(co.quizPassMark),
          finalTestPassMark: String(co.finalTestPassMark),
          notes: co.notes ?? '',
        }}
        showStatus
        submitLabel="Save changes"
        submitPendingLabel="Saving…"
        submitting={update.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Pressable
            style={styles.destructiveRow}
            onPress={handleArchive}
            disabled={archiving}
          >
            <Archive color={c.danger} size={18} strokeWidth={1.6} />
            <Text style={styles.destructiveLabel}>
              {archiving ? 'Archiving…' : 'Archive cohort'}
            </Text>
          </Pressable>
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    errorTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    errorMeta: { ...typography.meta, color: c.inkMuted, textAlign: 'center' },
    destructiveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: radii.md,
    },
    destructiveLabel: { ...typography.body, color: c.danger, fontWeight: '600' },
  });
}

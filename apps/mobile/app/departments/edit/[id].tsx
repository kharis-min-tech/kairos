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
import { api } from '@/lib/api-client';
import { DepartmentForm } from '../_form';

type UpdatePayload = Parameters<typeof api.departments.update>[1];

export default function EditDepartment() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const department = useQuery({
    queryKey: ['departments', id],
    enabled: !!id,
    queryFn: async () => (await api.departments.get(id)).data ?? null,
  });

  const update = useMutation({
    mutationFn: async (data: UpdatePayload) =>
      (await api.departments.update(id, data)).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['departments', id] });
      router.replace(`/departments/${id}`);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.departments.deactivate(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      router.replace('/departments');
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      await update.mutateAsync(payload as UpdatePayload);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not save. Please try again.',
      );
    }
  }

  async function confirmDelete() {
    const ok = await alert.confirm({
      title: 'Deactivate department?',
      message:
        "This deactivates the department and hides it from the directory. The team's history is preserved but the department won't accept new activity.",
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

  if (department.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit department</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (department.isError || !department.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit department</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load this department</Text>
          <Text style={styles.errorMeta}>
            {department.error instanceof Error
              ? department.error.message
              : 'Please go back and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const d = department.data;
  const initial = {
    branchId: d.branchId,
    departmentId: d.departmentId,
    leadMemberId: d.leadMemberId,
    deputyMemberId: d.deputyMemberId ?? null,
    description: d.description ?? '',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Edit department
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <DepartmentForm
        mode="edit"
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
                {deleting || remove.isPending ? 'Deactivating…' : 'Deactivate department'}
              </Text>
            </Pressable>
            <Text style={styles.footnote}>
              Hides the department from the directory. The team&apos;s history is
              preserved.
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


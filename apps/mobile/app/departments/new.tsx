import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { DepartmentForm } from './_form';

type CreatePayload = Parameters<typeof api.departments.create>[0];

export default function NewDepartment() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (data: CreatePayload) =>
      (await api.departments.create(data)).data!,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      router.replace(`/departments/${row.id}`);
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      // Create mode guarantees the form produces a CreatePayload.
      await create.mutateAsync(payload as CreatePayload);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not create department. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New department</Text>
        <View style={{ width: 24 }} />
      </View>

      <DepartmentForm
        mode="create"
        initial={{ branchId: user?.homeBranchId ?? '' }}
        submitLabel="Create department"
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>
            Requires the DepartmentLeader capability on the chosen branch, or admin/pastor
            access. Members can be added after the department is created.
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
});

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@kairos/ui-native';
import type { CreateBranchRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { BranchForm } from './_form';

export default function NewBranch() {
  const router = useRouter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (data: CreateBranchRequest) =>
      (await api.branches.create(data)).data!,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      router.replace(`/branches/edit/${row.id}`);
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      await create.mutateAsync(payload as CreateBranchRequest);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not create branch. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New branch</Text>
        <View style={{ width: 24 }} />
      </View>

      <BranchForm
        mode="create"
        submitLabel="Create branch"
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>
            Requires admin access. Leadership assignments are made separately after
            creation.
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

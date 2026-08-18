import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { CreateBranchRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { BranchForm } from './_form';

export default function NewBranch() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
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
  footnote: {
    ...typography.meta,
    color: c.inkFaded,
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});
}


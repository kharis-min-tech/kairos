import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@kairos/ui-native';
import type { CreateFellowshipRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { FellowshipForm } from './_form';

export default function NewFellowship() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (data: CreateFellowshipRequest) =>
      (await api.fellowships.create(data)).data!,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['fellowships'] });
      router.replace(`/fellowships/${row.id}`);
    },
  });

  async function handleSubmit(payload: CreateFellowshipRequest) {
    setServerError(null);
    try {
      await create.mutateAsync(payload);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not create fellowship. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New fellowship</Text>
        <View style={{ width: 24 }} />
      </View>

      <FellowshipForm
        initial={{ branchId: user?.homeBranchId ?? '' }}
        submitLabel="Create fellowship"
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>
            Members and meetings can be added after the fellowship is created. You&apos;ll
            need the FellowshipLeader capability on the chosen branch, or admin/pastor
            access.
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

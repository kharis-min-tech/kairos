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
import { CHURCH_SCOPE } from '@kairos/types';
import type { CreateMembershipCohortRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useCapabilities, useRequireCapability } from '@/lib/capabilities';
import { CohortForm } from './_form';

/**
 * Create a membership cohort. Gated on `membership:admin` at CHURCH scope.
 *
 * No branch picker: a cohort is church-wide and carries no `branchId`, which
 * is also why no branch-scoped grant can authorise creating one.
 */
export default function NewCohort() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const caps = useCapabilities();
  const [serverError, setServerError] = useState<string | null>(null);

  const isAdmin = caps.has('membership:admin', CHURCH_SCOPE);
  useRequireCapability(isAdmin, '/membership');

  const create = useMutation({
    mutationFn: async (data: CreateMembershipCohortRequest) =>
      (await api.membership.cohorts.create(data)).data!,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ['membership'] });
      router.replace(`/membership/${row.id}` as never);
    },
  });

  if (!isAdmin) return null;

  async function handleSubmit(payload: CreateMembershipCohortRequest) {
    setServerError(null);
    try {
      await create.mutateAsync(payload);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not create the cohort. Please try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>New cohort</Text>
        <View style={{ width: 24 }} />
      </View>

      <CohortForm
        submitLabel="Create cohort"
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>
            Schedule the four sessions and admit people from the interest pool once the
            cohort exists.
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

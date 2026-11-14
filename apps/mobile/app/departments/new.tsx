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
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { DepartmentForm } from './_form';
import { useTranslation } from 'react-i18next';

type CreatePayload = Parameters<typeof api.departments.create>[0];

export default function NewDepartment() {  const { t } = useTranslation(['departments', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
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
          : t('departments:couldNotCreateDepartmentPleaseTry'),
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('departments:newDepartment')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <DepartmentForm
        mode="create"
        initial={{ branchId: user?.homeBranchId ?? '' }}
        submitLabel={t('departments:createDepartment')}
        submitPendingLabel="Creating…"
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        footer={
          <Text style={styles.footnote}>{t('departments:requiresTheDepartmentleaderCapabilityOnThe')}</Text>
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


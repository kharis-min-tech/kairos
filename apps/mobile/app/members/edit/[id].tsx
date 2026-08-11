import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@kairos/ui-native';
import type { UpdateMemberRequest } from '@kairos/types';
import { api } from '@/lib/api-client';
import { MemberForm } from '../_form';

export default function EditMember() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const [serverError, setServerError] = useState<string | null>(null);

  const member = useQuery({
    queryKey: ['members', id],
    enabled: !!id,
    queryFn: async () => (await api.members.get(id)).data ?? null,
  });

  const update = useMutation({
    mutationFn: async (data: UpdateMemberRequest) =>
      (await api.members.update(id, data)).data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members', id] });
      router.replace(`/members/${id}`);
    },
  });

  async function handleSubmit(payload: unknown) {
    setServerError(null);
    try {
      await update.mutateAsync(payload as UpdateMemberRequest);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not save. Please try again.',
      );
    }
  }

  if (member.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit member</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (member.isError || !member.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit member</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Couldn&apos;t load this member</Text>
          <Text style={styles.errorMeta}>
            {member.error instanceof Error
              ? member.error.message
              : 'Please go back and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const m = member.data;
  const initial = {
    firstName: m.firstName,
    lastName: m.lastName,
    middleName: m.middleName ?? '',
    email: m.email,
    phone: m.phone ?? '',
    gender: (m.gender ?? '') as 'Male' | 'Female' | '',
    dateOfBirth: m.dateOfBirth ?? '',
    homeBranchId: m.homeBranchId,
    secondaryBranchId: m.secondaryBranchId ?? null,
    address: m.address ?? '',
    city: m.city ?? '',
    postalCode: m.postalCode ?? '',
    secondaryAddress: m.secondaryAddress ?? '',
    secondaryCity: m.secondaryCity ?? '',
    secondaryPostalCode: m.secondaryPostalCode ?? '',
    emergencyContactName: m.emergencyContactName ?? '',
    emergencyContactPhone: m.emergencyContactPhone ?? '',
    emergencyContactRelationship: m.emergencyContactRelationship ?? '',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Edit {m.firstName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <MemberForm
        mode="edit"
        initial={initial}
        submitLabel="Save changes"
        submitPendingLabel="Saving…"
        submitting={update.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
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
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: { ...typography.cardTitle, color: colors.ink },
  errorMeta: { ...typography.body, color: 'rgba(26,28,28,0.6)', textAlign: 'center' },
});

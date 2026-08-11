import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Users, Pencil } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Card,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

export default function DepartmentDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const department = useQuery({
    queryKey: ['departments', id],
    enabled: !!id,
    queryFn: async () => (await api.departments.get(id)).data ?? null,
  });

  const members = useQuery({
    queryKey: ['departments', id, 'members'],
    enabled: !!id,
    queryFn: async () => (await api.departments.members.list(id)).data ?? [],
  });

  const refresh = () => {
    department.refetch();
    members.refetch();
  };

  const d = department.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {d?.departmentName ?? 'Department'}
        </Text>
        {d ? (
          <Pressable
            onPress={() => router.push(`/departments/edit/${d.id}`)}
            hitSlop={8}
            accessibilityLabel="Edit department"
          >
            <Pencil color={colors.primary} size={20} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={department.isFetching || members.isFetching}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {department.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {department.isError || (!department.isLoading && !d) ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {department.error instanceof Error
                ? department.error.message
                : "Couldn't load this department."}
            </Text>
          </Card>
        ) : null}

        {d ? (
          <>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>DEPARTMENT</Text>
              <Text style={styles.heroTitle}>{d.departmentName}</Text>
              {d.branchName ? <Text style={styles.heroBranch}>{d.branchName}</Text> : null}
              {d.description ? (
                <Text style={styles.heroDescription}>{d.description}</Text>
              ) : null}

              <View style={styles.leadRow}>
                <View style={styles.leadBlock}>
                  <Avatar
                    size="sm"
                    photoUrl={d.leadPhotoUrl ?? undefined}
                    firstName={d.leadFirstName}
                    lastName={d.leadLastName}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadEyebrow}>LEAD</Text>
                    <Text style={styles.leadName}>
                      {d.leadFirstName} {d.leadLastName}
                    </Text>
                  </View>
                </View>
                {d.deputyFirstName ? (
                  <View style={styles.leadBlock}>
                    <Avatar
                      size="sm"
                      photoUrl={d.deputyPhotoUrl ?? undefined}
                      firstName={d.deputyFirstName ?? undefined}
                      lastName={d.deputyLastName ?? undefined}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadEyebrow}>DEPUTY</Text>
                      <Text style={styles.leadName}>
                        {d.deputyFirstName} {d.deputyLastName ?? ''}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconTile}>
                  <Users color={colors.primary} size={14} strokeWidth={1.5} />
                </View>
                <Text style={styles.sectionTitle}>Team</Text>
                <Badge
                  label={String(members.data?.length ?? 0)}
                  variant="neutral"
                  size="sm"
                />
              </View>
              {members.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : (members.data ?? []).length === 0 ? (
                <Text style={styles.emptyLine}>No members recorded yet.</Text>
              ) : (
                <View style={styles.memberList}>
                  {(members.data ?? []).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/members/${m.memberId}`)}
                      style={styles.memberRow}
                    >
                      <Avatar
                        size="sm"
                        photoUrl={m.memberPhotoUrl ?? undefined}
                        firstName={m.memberFirstName}
                        lastName={m.memberLastName}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.memberFirstName} {m.memberLastName}
                        </Text>
                      </View>
                      {m.membershipStatus === 'probation' ? (
                        <Badge label="Probation" variant="gold" size="sm" />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
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
  headerTitle: { ...typography.cardTitle, color: colors.ink, flex: 1, textAlign: 'center' },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
    letterSpacing: 1.2,
  },
  heroTitle: { ...typography.screenTitle, color: '#ffffff' },
  heroBranch: { ...typography.meta, color: 'rgba(255,255,255,0.75)' },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  leadRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: spacing.sm,
  },
  leadBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leadEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.7)',
  },
  leadName: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTile: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.cardTitle, color: colors.ink, flex: 1 },
  memberList: { gap: spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  memberName: { ...typography.body, color: colors.ink },
  emptyLine: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    padding: spacing.md,
  },
  errorLine: {
    ...typography.body,
    color: colors.danger,
  },
});

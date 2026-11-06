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
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileText, ChevronRight } from 'lucide-react-native';
import {
  Badge,
  Card,
  EmptyState,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { FormSubmission, FormSubmissionStatus } from '@kairos/types';
// Titles live with the form definitions — this screen kept its own copy of
// all six, which is the drift FORM_DEFINITIONS exists to prevent.
import { FORM_DEFINITIONS } from '@kairos/types';
import { api } from '@/lib/api-client';

const STATUS_VARIANT: Record<
  FormSubmissionStatus,
  'primary' | 'gold' | 'success' | 'neutral'
> = {
  new: 'primary',
  reviewed: 'gold',
  converted: 'success',
  dismissed: 'neutral',
};

const STATUS_LABEL: Record<FormSubmissionStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  converted: 'Converted',
  dismissed: 'Dismissed',
};

function subjectName(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '—';
  const first = payload['firstName'] as string | undefined;
  const last = payload['lastName'] as string | undefined;
  if (first || last) return `${first ?? ''} ${last ?? ''}`.trim();
  const baby = payload['babyFullName'] as string | undefined;
  if (baby) return baby;
  return '—';
}

function formatDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyFormSubmissions() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const submissions = useQuery({
    queryKey: ['me', 'form-submissions'],
    queryFn: async () => (await api.forms.mySubmissions()).data ?? [],
  });

  const rows: FormSubmission[] = submissions.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>My submissions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={submissions.isFetching}
            onRefresh={() => submissions.refetch()}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Your form history</Text>
          <Text style={styles.introMeta}>
            Every form you&apos;ve filed, most recent first.
          </Text>
        </View>

        {submissions.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {submissions.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              Couldn&apos;t load your submissions:{' '}
              {submissions.error instanceof Error
                ? submissions.error.message
                : 'Unknown error'}
            </Text>
          </Card>
        ) : null}

        {submissions.data && rows.length === 0 ? (
          <Card padding="md">
            <EmptyState
              title="Nothing here yet"
              message="Forms you fill in show up here so you can check back on them."
            />
          </Card>
        ) : null}

        {rows.length > 0 ? (
          <View style={styles.list}>
            {rows.map((row) => {
              const title = FORM_DEFINITIONS[row.formType].title;
              const subject = subjectName(
                row.payload as unknown as Record<string, unknown> | undefined,
              );
              return (
                <Pressable
                  key={row.id}
                  onPress={() => router.push(`/forms/submissions/${row.id}` as never)}
                  style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
                >
                <Card padding="md" style={styles.rowCard}>
                  <View style={styles.rowIconTile}>
                    <FileText color={c.primary} size={18} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Badge
                        label={STATUS_LABEL[row.status]}
                        variant={STATUS_VARIANT[row.status]}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.rowSubject} numberOfLines={1}>
                      {subject}
                    </Text>
                    <View style={styles.rowMetaLine}>
                      <Text style={styles.rowMeta}>{formatDate(row.createdAt)}</Text>
                      {row.branchName ? (
                        <>
                          <Text style={styles.rowMetaDot}>·</Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {row.branchName}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight color={c.inkVeryFaded} size={16} strokeWidth={1.5} />
                </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.meta, color: c.inkMuted },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowIconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: {
    ...typography.body,
    color: c.ink,
    fontWeight: '600',
    flex: 1,
  },
  rowSubject: {
    ...typography.meta,
    color: c.inkMuted,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rowMeta: {
    ...typography.meta,
    color: c.inkFaded,
  },
  rowMetaDot: {
    ...typography.meta,
    color: c.inkFaded,
  },
});
}


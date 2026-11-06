import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  Badge,
  Card,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { FORM_DEFINITIONS, type FormType } from '@kairos/types';
import { api } from '@/lib/api-client';

const STATUS_TONE: Record<string, 'primary' | 'gold' | 'success' | 'neutral'> = {
  new: 'primary',
  reviewed: 'gold',
  converted: 'success',
  dismissed: 'neutral',
};

/**
 * One form submission, read back.
 *
 * Serves both audiences, because the API now does: a member opening something
 * they filled in, and a reviewer opening somebody else's. `getSubmission`
 * allows the submitter unconditionally and everyone else by the form's
 * visibility tier, so this screen does not re-decide who may look. It shows
 * what came back and nothing more.
 *
 * Review actions are deliberately absent. Changing a submission's status is
 * the web review drawer's job today, and a member reaching this screen must
 * not be shown controls that would 403.
 */
export default function SubmissionDetail() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id!;

  const submission = useQuery({
    queryKey: ['forms', 'submissions', id],
    enabled: !!id,
    queryFn: async () => (await api.forms.submissions.get(id)).data ?? null,
  });

  const s = submission.data;
  const definition = s ? FORM_DEFINITIONS[s.formType as FormType] : null;

  /** The question as it was asked, falling back to a readable key. */
  function labelFor(key: string): string {
    const field = definition?.blocks
      .flatMap((b) => b.fields)
      .find((f) => f.id === key || f.freeTextFieldId === key);
    if (field) return field.id === key ? field.label : `${field.label} (typed in)`;
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (ch) => ch.toUpperCase())
      .trim();
  }

  function renderValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? `${value.length} entered` : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  const payload = (s?.payload ?? {}) as Record<string, unknown>;
  // Ids are plumbing, not answers. The name they typed sits alongside under
  // its own key, so dropping these loses nothing the reader wants.
  const entries = Object.entries(payload).filter(([k]) => !/MemberId$/.test(k));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {definition?.title ?? 'Submission'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {submission.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : submission.isError || !s ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              {submission.error instanceof Error
                ? submission.error.message
                : "Couldn't load this submission."}
            </Text>
          </Card>
        ) : (
          <>
            <Card padding="md" style={{ gap: spacing.xs }}>
              <View style={styles.metaRow}>
                <Text style={styles.formTitle}>{definition?.title ?? s.formType}</Text>
                <Badge
                  label={s.status}
                  variant={STATUS_TONE[s.status] ?? 'neutral'}
                  size="sm"
                />
              </View>
              <Text style={styles.metaText}>
                Submitted {formatShortDate(s.createdAt as unknown as string)}
                {s.branchName ? ` · ${s.branchName}` : ''}
              </Text>
            </Card>

            <Card padding="none" style={{ overflow: 'hidden' }}>
              {entries.length === 0 ? (
                <View style={styles.answerRow}>
                  <Text style={styles.metaText}>No answers recorded.</Text>
                </View>
              ) : (
                entries.map(([key, value], i) => (
                  <View
                    key={key}
                    style={[styles.answerRow, i > 0 && styles.answerRowDivided]}
                  >
                    <Text style={styles.answerLabel}>{labelFor(key)}</Text>
                    <Text style={styles.answerValue}>{renderValue(value)}</Text>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
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
    headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    formTitle: { ...typography.cardTitle, color: c.ink, flex: 1 },
    metaText: { ...typography.meta, color: c.inkMuted },
    answerRow: { padding: spacing.md, gap: 2 },
    answerRowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    answerLabel: { ...typography.meta, color: c.inkFaded, fontWeight: '600' },
    answerValue: { ...typography.body, color: c.ink, lineHeight: 20 },
    errorLine: { ...typography.body, color: c.danger },
  });
}

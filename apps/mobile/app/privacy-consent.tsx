import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  FileText,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react-native';
import { Badge, Button, Card, colors, spacing, typography } from '@kairos/ui-native';
import {
  CONSENT_TYPE_LABEL,
  CONSENT_TYPE_DESCRIPTION,
  ConsentType,
  type RecordConsentRequest,
} from '@kairos/types';
import { api } from '@/lib/api-client';

const LEGAL_BASE = 'https://kairos.kharis.org/legal';

function docHrefFor(consentType: ConsentType): string | null {
  if (consentType === ConsentType.Terms) return `${LEGAL_BASE}/terms`;
  if (consentType === ConsentType.Privacy) return `${LEGAL_BASE}/privacy`;
  if (consentType === ConsentType.AcceptableUse) return `${LEGAL_BASE}/acceptable-use`;
  if (consentType === ConsentType.AdminConfidentiality)
    return `${LEGAL_BASE}/confidentiality`;
  return null;
}

const QUERY_KEY = ['me', 'consent'] as const;

export default function PrivacyConsent() {
  const router = useRouter();
  const qc = useQueryClient();

  const consent = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.me.consent.list()).data!,
  });

  const record = useMutation({
    mutationFn: async (data: RecordConsentRequest) =>
      (await api.me.consent.record(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const [pendingType, setPendingType] = useState<ConsentType | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy & consent</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={consent.isFetching}
            onRefresh={() => consent.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Legal &amp; consent</Text>
          <Text style={styles.introMeta}>
            Track which policies you&apos;ve accepted and when.
          </Text>
        </View>

        <Card padding="md">
          <View style={styles.cardTitleRow}>
            <FileText color={colors.primary} size={16} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>Consent records</Text>
          </View>

          {consent.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : null}

          {consent.isError ? (
            <Text style={styles.errorLine}>
              Couldn&apos;t load consent:{' '}
              {consent.error instanceof Error ? consent.error.message : 'Unknown error'}
            </Text>
          ) : null}

          {consent.data?.statuses.map((status, idx) => {
            const isMarketing = status.consentType === ConsentType.Marketing;
            const isPending = pendingType === status.consentType && record.isPending;
            const stateLabel =
              status.granted === true
                ? 'Granted'
                : status.granted === false
                  ? 'Declined'
                  : 'Not recorded';
            const StateIcon =
              status.granted === true ? Check : status.granted === false ? X : AlertTriangle;
            const tone =
              status.granted === true
                ? colors.successText
                : status.granted === false
                  ? colors.danger
                  : colors.goldDark;
            const href = docHrefFor(status.consentType);

            return (
              <View
                key={status.consentType}
                style={[styles.consentRow, idx > 0 ? styles.rowDivider : null]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.consentLabel}>
                      {CONSENT_TYPE_LABEL[status.consentType]}
                    </Text>
                    {status.required ? (
                      <Badge label="Required" variant="primary" size="sm" />
                    ) : null}
                  </View>
                  <Text style={styles.consentDesc}>
                    {CONSENT_TYPE_DESCRIPTION[status.consentType]}
                  </Text>
                  {href ? (
                    <Pressable onPress={() => Linking.openURL(href)} style={styles.docLink}>
                      <Text style={styles.docLinkLabel}>Read the current version</Text>
                      <ExternalLink color={colors.primary} size={12} strokeWidth={1.5} />
                    </Pressable>
                  ) : null}
                  <View style={styles.stateLine}>
                    <StateIcon color={tone} size={12} strokeWidth={1.5} />
                    <Text style={[styles.stateLabel, { color: tone }]}>{stateLabel}</Text>
                    {status.acceptedVersion ? (
                      <Text style={styles.stateMeta}>
                        · v{status.acceptedVersion}
                        {status.grantedAt
                          ? ` · ${new Date(status.grantedAt).toLocaleDateString('en-GB')}`
                          : ''}
                      </Text>
                    ) : null}
                  </View>
                  {status.needsAccept && status.required ? (
                    <Text style={styles.needsAcceptLine}>
                      Action needed — version {status.currentVersion} is now current.
                    </Text>
                  ) : null}
                </View>

                {isMarketing ? (
                  <Button
                    label={status.granted ? 'Unsubscribe' : 'Subscribe'}
                    variant={status.granted ? 'outline' : 'primary'}
                    size="sm"
                    loading={isPending}
                    onPress={() => {
                      setPendingType(ConsentType.Marketing);
                      record.mutate({
                        consentType: ConsentType.Marketing,
                        granted: !status.granted,
                      });
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>

        <Text style={styles.footnote}>
          Required policies can only be updated by re-accepting the newest version. If a required
          policy shows &quot;Action needed&quot; you&apos;ll be prompted the next time you sign in.
        </Text>
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
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: colors.ink },
  introMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.cardTitle, color: colors.ink },
  errorLine: {
    ...typography.body,
    color: colors.danger,
    marginVertical: spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,28,28,0.08)',
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  consentLabel: { ...typography.body, color: colors.ink, fontWeight: '600' },
  consentDesc: { ...typography.meta, color: 'rgba(26,28,28,0.6)', lineHeight: 15 },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  docLinkLabel: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
  },
  stateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  stateLabel: {
    ...typography.meta,
    fontWeight: '600',
  },
  stateMeta: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.55)',
  },
  needsAcceptLine: {
    ...typography.meta,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
  },
});

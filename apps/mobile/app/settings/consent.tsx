import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import {
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { ConsentStatus, ConsentType } from '@kairos/types';
import { CONSENT_TYPE_LABEL, CONSENT_TYPE_DESCRIPTION } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

export default function ConsentSettings() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const consent = useQuery({
    queryKey: ['me', 'consent'],
    queryFn: async () => (await api.me.consent.list()).data ?? { statuses: [] },
  });

  const record = useMutation({
    mutationFn: async ({
      consentType,
      granted,
    }: {
      consentType: ConsentType;
      granted: boolean;
    }) => (await api.me.consent.record({ consentType, granted })).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'consent'] }),
    onError: (e: Error) =>
      alert.info('Could not update', e.message ?? 'Please try again.'),
  });

  const statuses = consent.data?.statuses ?? [];
  const required = statuses.filter((s) => s.required);
  const optional = statuses.filter((s) => !s.required);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Consent history</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={consent.isFetching}
            onRefresh={() => consent.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {consent.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            {required.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REQUIRED</Text>
                {required.map((s) => (
                  <ConsentCard key={s.consentType} status={s} onToggle={record.mutate} />
                ))}
              </View>
            ) : null}
            {optional.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>OPTIONAL</Text>
                {optional.map((s) => (
                  <ConsentCard key={s.consentType} status={s} onToggle={record.mutate} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsentCard({
  status,
  onToggle,
}: {
  status: ConsentStatus;
  onToggle: (args: { consentType: ConsentType; granted: boolean }) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Card padding="md" style={{ gap: spacing.xs }}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{CONSENT_TYPE_LABEL[status.consentType]}</Text>
        <Switch
          value={status.granted === true}
          onValueChange={(v) => onToggle({ consentType: status.consentType, granted: v })}
          disabled={status.required}
          trackColor={{ true: c.primary, false: c.border }}
        />
      </View>
      <Text style={styles.rowHint}>{CONSENT_TYPE_DESCRIPTION[status.consentType]}</Text>
      <Text style={styles.rowMeta}>
        Current version: {status.currentVersion}
        {status.acceptedVersion ? ` · accepted: ${status.acceptedVersion}` : ''}
        {status.grantedAt
          ? ` · ${new Date(status.grantedAt).toLocaleDateString()}`
          : ''}
      </Text>
      {status.needsAccept ? (
        <Text style={styles.needAccept}>
          A newer version is available. Toggle to re-accept.
        </Text>
      ) : null}
    </Card>
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
    section: { gap: spacing.sm },
    sectionTitle: {
      ...typography.eyebrow,
      color: c.inkMuted,
      letterSpacing: 1,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    rowLabel: { ...typography.body, color: c.ink, fontWeight: '700', flex: 1 },
    rowHint: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
    rowMeta: { ...typography.meta, color: c.inkFaded, fontSize: 11 },
    needAccept: {
      ...typography.meta,
      color: c.goldDark,
      fontWeight: '600',
      marginTop: 4,
    },
  });
}

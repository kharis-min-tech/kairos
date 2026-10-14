import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppWindow, ChevronLeft, Unplug } from 'lucide-react-native';
import type { OAuthAppConnection } from '@kairos/types';
import {
  Button,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

const APPS_KEY = ['oauth-server', 'connections'] as const;

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

/**
 * Apps the member has let sign them in with Kairos ("Sign in with Kairos").
 * The reverse of Connected accounts, which is Google/Microsoft/Apple signing
 * the member in to Kairos. Removing one revokes its grant server-side, so its
 * tokens stop working at once.
 */
export default function AuthorizedAppsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const apps = useQuery({
    queryKey: APPS_KEY,
    queryFn: async () => (await api.oauthServer.listConnections()).data ?? [],
  });

  const revoke = useMutation({
    mutationFn: (grantId: string) => api.oauthServer.revokeConnection(grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPS_KEY }),
  });

  async function handleRemove(app: OAuthAppConnection) {
    const confirmed = await alert.confirm({
      title: `Remove ${app.clientName}?`,
      message:
        "It will be signed out straight away and can't see your Kairos details any more. You can allow it again the next time it asks.",
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await revoke.mutateAsync(app.grantId);
    } catch (err) {
      alert.info('Could not remove it', err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back">
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Apps with access</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Signed in with Kairos</Text>
          <Text style={styles.introMeta}>
            Apps you&apos;ve let sign you in with your Kairos account. Remove one and it can no
            longer see your details.
          </Text>
        </View>

        {apps.isLoading ? (
          <Card padding="md" style={styles.loadingCard}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.loadingText}>Loading your apps…</Text>
          </Card>
        ) : apps.isError ? (
          <Card padding="md">
            <Text style={styles.errorText}>
              {apps.error instanceof Error ? apps.error.message : 'Could not load your apps.'}
            </Text>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              onPress={() => apps.refetch()}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
            />
          </Card>
        ) : (apps.data ?? []).length === 0 ? (
          <Card padding="md" style={styles.emptyCard}>
            <AppWindow color={c.inkVeryFaded} size={28} strokeWidth={1.5} />
            <Text style={styles.emptyText}>
              No apps yet. When another Kharis app asks to sign you in, it will show up here.
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {apps.data!.map((app) => {
              const busy = revoke.isPending && revoke.variables === app.grantId;
              return (
                <Card key={app.grantId} padding="md" style={styles.row}>
                  <View style={styles.iconTile}>
                    <Text style={styles.initial}>{app.clientName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>{app.clientName}</Text>
                    <Text style={styles.rowMeta}>
                      Can see: {app.scopes.map((s) => s.description.toLowerCase()).join(' · ')}
                    </Text>
                    <Text style={styles.rowMetaFaint}>
                      Allowed {formatRelative(app.connectedAt)} · Last used{' '}
                      {formatRelative(app.lastUsedAt)}
                    </Text>
                  </View>
                  <Button
                    label="Remove"
                    variant="outline"
                    size="sm"
                    loading={busy}
                    disabled={busy}
                    iconLeft={<Unplug color={c.primary} size={14} strokeWidth={1.5} />}
                    onPress={() => handleRemove(app)}
                  />
                </Card>
              );
            })}
          </View>
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
    headerTitle: { ...typography.cardTitle, color: c.ink },
    container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    introBlock: { gap: 2 },
    introTitle: { ...typography.screenTitle, color: c.ink },
    introMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    list: { gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: c.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: { ...typography.cardTitle, color: c.primary },
    rowTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    rowMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
    rowMetaFaint: { ...typography.meta, color: c.inkVeryFaded, lineHeight: 16 },
    loadingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    loadingText: { ...typography.body, color: c.inkMuted },
    emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { ...typography.body, color: c.inkMuted, textAlign: 'center', lineHeight: 20 },
    errorText: { ...typography.body, color: c.danger },
  });
}

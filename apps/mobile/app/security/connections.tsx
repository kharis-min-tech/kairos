import { useCallback } from 'react';
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
import { ChevronLeft, Link2, Unlink } from 'lucide-react-native';
import type { OAuthConnection, OAuthProviderId } from '@kairos/types';
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
import {
  mapOAuthErrorSlug,
  startOAuthFlow,
  type OAuthStartResult,
} from '@/lib/oauth';
import {
  OAuthProviderIcon,
  OAUTH_PROVIDER_LABEL,
} from '@/components/oauth-provider-icon';

const ALL_PROVIDERS: OAuthProviderId[] = ['google', 'microsoft', 'apple'];
const CONNECTIONS_KEY = ['oauth-connections'] as const;

/**
 * Connected-accounts settings. Lists the caller's linked OAuth providers
 * and offers connect/disconnect for the rest. Mirrors the web-side
 * `useMyOAuthConnections` hook — the API returns `OAuthConnection[]` and
 * responds 422 on the "last sign-in method" lockout guard with the exact
 * message we surface inline.
 */
export default function ConnectionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const connections = useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: async () => {
      const res = await api.auth.oauth.listConnections();
      return res.data ?? [];
    },
  });

  const disconnect = useMutation({
    mutationFn: async (provider: OAuthProviderId) => {
      const res = await api.auth.oauth.disconnect(provider);
      if (!res.success) {
        throw new Error(
          res.message ?? 'Could not disconnect that sign-in method.',
        );
      }
      return res.data ?? [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });

  const handleConnectResult = useCallback(
    async (result: OAuthStartResult) => {
      if (result.kind === 'cancelled') return;
      if (result.kind === 'error') {
        alert.info('Sign-in failed', mapOAuthErrorSlug(result.slug));
        return;
      }
      if (result.kind === 'confirm_link') {
        // The account-link flow requires a password prompt. Route to the
        // shared screen — same one the login/signup screens use.
        router.push({
          pathname: '/(auth)/oauth-confirm-link' as never,
          params: {
            token: result.confirmationToken,
            email: result.email,
            provider: result.provider,
          },
        });
        return;
      }
      // signed_in: the API linked the provider onto the existing session.
      // Refresh the connections list.
      qc.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
    [qc, router],
  );

  async function handleConnect(provider: OAuthProviderId) {
    const result = await startOAuthFlow(provider, '/security/connections');
    await handleConnectResult(result);
  }

  async function handleDisconnect(conn: OAuthConnection) {
    const label = OAUTH_PROVIDER_LABEL[conn.provider];
    const confirmed = await alert.confirm({
      title: `Disconnect ${label}?`,
      message: `You won't be able to sign in with ${label} until you reconnect it.`,
      confirmLabel: 'Disconnect',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await disconnect.mutateAsync(conn.provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // API returns 422 with the lockout message verbatim — surface it and
      // offer a route to "Change password" so the user can regain a
      // password-only sign-in method before retrying.
      if (/only sign-in method/i.test(message)) {
        alert.show({
          title: "Can't disconnect",
          message,
          buttons: [
            { label: 'OK', variant: 'cancel' },
            {
              label: 'Change password',
              variant: 'primary',
              onPress: () => router.push('/security/change-password'),
            },
          ],
        });
      } else {
        alert.info('Could not disconnect', message);
      }
    }
  }

  const connectedMap = new Map<OAuthProviderId, OAuthConnection>();
  (connections.data ?? []).forEach((conn) => connectedMap.set(conn.provider, conn));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Connected accounts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Sign-in methods</Text>
          <Text style={styles.introMeta}>
            Link Google, Microsoft, or Apple sign-in to your Kharis account so
            you can pick any of them at sign-in.
          </Text>
        </View>

        {connections.isLoading ? (
          <Card padding="md" style={styles.loadingCard}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.loadingText}>Loading your connections…</Text>
          </Card>
        ) : connections.isError ? (
          <Card padding="md">
            <Text style={styles.errorText}>
              {connections.error instanceof Error
                ? connections.error.message
                : 'Could not load your connections.'}
            </Text>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              onPress={() => connections.refetch()}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {ALL_PROVIDERS.map((provider) => {
              const conn = connectedMap.get(provider);
              const label = OAUTH_PROVIDER_LABEL[provider];
              const isBusy = disconnect.isPending && disconnect.variables === provider;
              return (
                <Card key={provider} padding="md" style={styles.row}>
                  <View style={styles.iconTile}>
                    <OAuthProviderIcon provider={provider} size={22} tint={c.ink} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>{label}</Text>
                    {conn ? (
                      <Text style={styles.rowMeta}>
                        Connected as{' '}
                        <Text style={styles.rowMetaStrong}>
                          {conn.providerEmail ?? 'a hidden email'}
                        </Text>
                      </Text>
                    ) : (
                      <Text style={styles.rowMeta}>Not connected</Text>
                    )}
                  </View>
                  {conn ? (
                    <Button
                      label="Disconnect"
                      variant="outline"
                      size="sm"
                      loading={isBusy}
                      disabled={isBusy}
                      iconLeft={
                        <Unlink color={c.primary} size={14} strokeWidth={1.5} />
                      }
                      onPress={() => handleDisconnect(conn)}
                    />
                  ) : (
                    <Button
                      label="Connect"
                      variant="primary"
                      size="sm"
                      iconLeft={<Link2 color="#ffffff" size={14} strokeWidth={2} />}
                      onPress={() => handleConnect(provider)}
                    />
                  )}
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
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    introBlock: { gap: 2 },
    introTitle: { ...typography.screenTitle, color: c.ink },
    introMeta: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    list: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: c.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
    rowMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
    rowMetaStrong: { color: c.ink, fontWeight: '600' },
    loadingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    loadingText: { ...typography.body, color: c.inkMuted },
    errorText: { ...typography.body, color: c.danger },
  });
}

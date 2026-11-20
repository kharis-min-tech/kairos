import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, ShieldAlert } from 'lucide-react-native';
import {
  Button,
  Card,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import {
  CONSENT_TYPE_LABEL,
  CONSENT_TYPE_DESCRIPTION,
  ConsentType,
  type ConsentStatus,
} from '@kairos/types';
import { api } from '@/lib/api-client';
import { apiBaseUrl } from '@/lib/config';
import { useAuthStore } from '@/store/auth';

/**
 * The mobile consent gate. The counterpart to the web app's
 * `/accept-policies`, and the screen `ConsentGuard` in the root layout sends
 * people to when they have a required policy outstanding.
 *
 * Until this existed, mobile had the enforcement without the remedy. The API's
 * `consentGateMiddleware` 403s every `/api/*` route outside a five-path
 * allowlist while any required consent is pending, which is correct, but
 * mobile had no screen that could clear the condition: the consent surfaces it
 * did have offered an action button for Marketing only, and
 * `settings/consent.tsx` disabled its switch for exactly the required rows it
 * told people to toggle. A version bump therefore locked every mobile member
 * out of the whole app with no way back, and because the gate answers with
 * `c.json(..., 403)` rather than by throwing, nothing appeared in the API logs
 * while it happened.
 *
 * Two things here are load-bearing rather than cosmetic:
 *
 *  - **No back affordance.** This is a gate, not a page. `ConsentGuard`
 *    would bounce the caller straight back anyway, and a back chevron that
 *    silently undoes itself reads as a broken screen.
 *  - **Sign out stays reachable.** Someone who will not accept a new policy
 *    must still be able to leave. `/api/me/consent`, `/api/me/export` and
 *    `/api/me/delete-account` are on the middleware's allowlist for the same
 *    reason: refusing consent is a choice, not a trap.
 */

// Policy bodies live on the web app, and the mobile build points at whichever
// origin its API does, so a staging build opens staging's copy of the text
// rather than production's. Mirrors `privacy-consent.tsx`.
const LEGAL_BASE = `${apiBaseUrl.replace(/\/$/, '')}/legal`;

function docHrefFor(consentType: ConsentType): string | null {
  if (consentType === ConsentType.Terms) return `${LEGAL_BASE}/terms`;
  if (consentType === ConsentType.Privacy) return `${LEGAL_BASE}/privacy`;
  if (consentType === ConsentType.AcceptableUse) return `${LEGAL_BASE}/acceptable-use`;
  if (consentType === ConsentType.AdminConfidentiality)
    return `${LEGAL_BASE}/confidentiality`;
  return null;
}

const QUERY_KEY = ['me', 'consent'] as const;

export default function AcceptPolicies() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  const consent = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.me.consent.list()).data ?? { statuses: [] },
  });

  const [ticked, setTicked] = useState<Set<ConsentType>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pending: ConsentStatus[] = useMemo(
    () => (consent.data?.statuses ?? []).filter((s) => s.required && s.needsAccept),
    [consent.data],
  );

  function toggle(type: ConsentType) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleSignOut() {
    await clearSession();
    qc.clear();
    router.replace('/(auth)/login');
  }

  async function handleContinue() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Sequential rather than concurrent. Each POST writes a row keyed on
      // (member, type, version) and the member sees one failure message, so
      // there is nothing to win by racing them and a partial multi-write is
      // harder to reason about when one call fails.
      for (const status of pending) {
        // eslint-disable-next-line no-await-in-loop
        await api.me.consent.record({
          consentType: status.consentType,
          granted: true,
        });
      }
      // Refetch before leaving: the guard reads the same query, so sending the
      // caller onward against a stale cache would bounce them straight back.
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      router.replace('/(tabs)');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Could not record your acceptance.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const allTicked = pending.length > 0 && pending.every((p) => ticked.has(p.consentType));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introBlock}>
          <View style={styles.introIconRow}>
            <ShieldAlert color={c.primary} size={20} strokeWidth={1.5} />
            <Text style={styles.introTitle}>Before you continue</Text>
          </View>
          <Text style={styles.introMeta}>
            {pending.length === 1
              ? 'We have updated a policy you need to accept.'
              : 'We have updated some policies you need to accept.'}
          </Text>
        </View>

        {consent.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : null}

        {consent.isError ? (
          <Card padding="md">
            <Text style={styles.errorLine}>
              We could not load the policies you need to accept
              {consent.error instanceof Error ? `: ${consent.error.message}` : '.'}
            </Text>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              onPress={() => void consent.refetch()}
            />
          </Card>
        ) : null}

        {pending.map((status) => {
          const href = docHrefFor(status.consentType);
          const isTicked = ticked.has(status.consentType);
          return (
            <Card key={status.consentType} padding="md" style={{ gap: spacing.sm }}>
              <Text style={styles.rowLabel}>
                {CONSENT_TYPE_LABEL[status.consentType]}
              </Text>
              <Text style={styles.rowHint}>
                {CONSENT_TYPE_DESCRIPTION[status.consentType]}
              </Text>
              <Text style={styles.rowMeta}>Version {status.currentVersion}</Text>

              {href ? (
                <Pressable
                  onPress={() => void Linking.openURL(href)}
                  style={styles.docLink}
                  accessibilityRole="link"
                >
                  <Text style={styles.docLinkLabel}>Read the current version</Text>
                  <ExternalLink color={c.primary} size={12} strokeWidth={1.5} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => toggle(status.consentType)}
                style={styles.acceptRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isTicked }}
                accessibilityLabel={`I have read and accept the ${CONSENT_TYPE_LABEL[status.consentType]}`}
                hitSlop={6}
              >
                <View style={[styles.box, isTicked ? styles.boxOn : null]}>
                  {isTicked ? <Check color={c.onPrimary} size={14} strokeWidth={2.5} /> : null}
                </View>
                <Text style={styles.acceptLabel}>I have read and accept this policy</Text>
              </Pressable>
            </Card>
          );
        })}

        {submitError ? <Text style={styles.errorLine}>{submitError}</Text> : null}

        {pending.length > 0 ? (
          <Button
            label="Accept and continue"
            variant="primary"
            disabled={!allTicked}
            loading={submitting}
            onPress={() => void handleContinue()}
          />
        ) : null}

        <Pressable onPress={() => void handleSignOut()} hitSlop={8}>
          <Text style={styles.signOut}>Sign out instead</Text>
        </Pressable>

        <Text style={styles.footnote}>
          You can review what you have accepted, and when, at any time under
          Settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    introBlock: { gap: spacing.xs, marginTop: spacing.md },
    introIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    introTitle: { ...typography.screenTitle, color: c.ink },
    introMeta: { ...typography.meta, color: c.inkMuted, lineHeight: 18 },
    rowLabel: { ...typography.body, color: c.ink, fontWeight: '700' },
    rowHint: { ...typography.meta, color: c.inkMuted, lineHeight: 16 },
    rowMeta: { ...typography.meta, color: c.inkFaded, fontSize: 11 },
    docLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    docLinkLabel: { ...typography.meta, color: c.primary, fontWeight: '600' },
    acceptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: c.primary, borderColor: c.primary },
    acceptLabel: { ...typography.meta, color: c.ink, flex: 1, fontWeight: '600' },
    errorLine: { ...typography.meta, color: c.danger, lineHeight: 16 },
    signOut: {
      ...typography.meta,
      color: c.inkMuted,
      textAlign: 'center',
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    footnote: {
      ...typography.meta,
      color: c.inkFaded,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
  });
}

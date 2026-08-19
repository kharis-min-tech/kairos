import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  MailCheck,
} from 'lucide-react-native';
import {
  AddressAutofillInput,
  Button,
  DatePicker,
  Input,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { Member } from '@kairos/types';
import { api } from '@/lib/api-client';
import { apiBaseUrl, mapboxPublicToken } from '@/lib/config';
import { mapOAuthErrorSlug, type OAuthStartResult } from '@/lib/oauth';
import { OAuthButtonGroup } from '@/components/oauth-button-group';
import { useAuthStore } from '@/store/auth';

const MIN_PASSWORD = 8;

type PickerKind = 'branch' | 'gender' | null;

const GENDERS: ('Male' | 'Female')[] = ['Male', 'Female'];

export default function SignupScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [homeBranchId, setHomeBranchId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [picker, setPicker] = useState<PickerKind>(null);

  const branches = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
  });

  const branchLabel = useMemo(() => {
    const b = branches.data?.find((br) => br.id === homeBranchId);
    return b ? `${b.branchName}${b.regionName ? ` · ${b.regionName}` : ''}` : '';
  }, [branches.data, homeBranchId]);

  function validate() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next['firstName'] = 'Required';
    if (!lastName.trim()) next['lastName'] = 'Required';
    if (!email.trim()) next['email'] = 'Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next['email'] = 'Enter a valid email';
    if (!password) next['password'] = 'Required';
    else if (password.length < MIN_PASSWORD)
      next['password'] = `At least ${MIN_PASSWORD} characters`;
    if (!homeBranchId) next['homeBranchId'] = 'Choose your home branch';
    if (!acceptedPolicies) next['acceptedPolicies'] = 'Required to create an account';
    // Format is enforced by the DatePicker — no client-side check needed.
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // OAuth (Better-Auth Phase 1). Sign-up via SSO is the same handshake as
  // sign-in — the API auto-creates the member on first login. On the
  // unverified-email collision path we route to `oauth-confirm-link`.
  async function handleOAuthResult(result: OAuthStartResult) {
    if (result.kind === 'cancelled') return;
    if (result.kind === 'error') {
      setServerError(mapOAuthErrorSlug(result.slug));
      return;
    }
    if (result.kind === 'confirm_link') {
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
    try {
      const member = await fetchMemberProfile(result.tokens.accessToken);
      await setSession(result.tokens, member);
      router.replace('/(tabs)');
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Signed in but could not load your profile.',
      );
    }
  }

  const signup = useMutation({
    mutationFn: async () => {
      const res = await api.auth.signup({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        homeBranchId,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        emergencyContactRelationship: emergencyRel.trim() || undefined,
        acceptedPolicies,
      });
      if (!res.success) throw new Error(res.message ?? 'Sign up failed');
      return res.data;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => setServerError(e.message ?? 'Something went wrong'),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoTile}>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradientFill}
              />
              <Text style={styles.logoK}>K</Text>
            </View>
          </View>

          <View style={styles.card}>
            {done ? (
              <>
                <View style={styles.successBadge}>
                  <MailCheck color={c.success} size={22} strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>Check your inbox</Text>
                <Text style={styles.body}>
                  We&apos;ve sent a link to{' '}
                  <Text style={styles.bodyStrong}>{email.trim()}</Text> to verify your
                  email. Once verified, an admin will approve your account for
                  sign-in.
                </Text>
                <Button
                  label="Back to sign in"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : (
              <>
                <Text style={styles.title}>Join Kharis Church</Text>
                <Text style={styles.body}>
                  Create your account. An admin will approve access before you
                  can sign in.
                </Text>

                {serverError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{serverError}</Text>
                  </View>
                ) : null}

                <View style={styles.pairRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="First name"
                      value={firstName}
                      onChangeText={(v) => {
                        setFirstName(v);
                        setErrors((p) => ({ ...p, firstName: '' }));
                      }}
                      autoCapitalize="words"
                      error={errors['firstName']}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Last name"
                      value={lastName}
                      onChangeText={(v) => {
                        setLastName(v);
                        setErrors((p) => ({ ...p, lastName: '' }));
                      }}
                      autoCapitalize="words"
                      error={errors['lastName']}
                    />
                  </View>
                </View>

                <Input
                  label="Middle name (optional)"
                  value={middleName}
                  onChangeText={setMiddleName}
                  autoCapitalize="words"
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Input
                  label="Email"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((p) => ({ ...p, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="you@example.com"
                  error={errors['email']}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Input
                  label="Phone (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <View style={{ marginTop: spacing.md, gap: 4 }}>
                  <Text style={styles.fieldLabel}>Home branch</Text>
                  <PickerRow
                    value={branchLabel}
                    placeholder={
                      branches.isLoading ? 'Loading branches…' : 'Choose your home branch'
                    }
                    onPress={() => setPicker('branch')}
                    error={errors['homeBranchId']}
                  />
                </View>

                <View style={styles.pairRow}>
                  <View style={{ flex: 1 }}>
                    <DatePicker
                      label="Date of birth"
                      value={dateOfBirth}
                      onChange={(v) => {
                        setDateOfBirth(v);
                        setErrors((p) => ({ ...p, dateOfBirth: '' }));
                      }}
                      placeholder="Pick a date"
                      maximumDate={new Date()}
                      error={errors['dateOfBirth']}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <PickerRow
                      value={gender}
                      placeholder="—"
                      onPress={() => setPicker('gender')}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => setShowMore((p) => !p)}
                  style={styles.moreToggle}
                  hitSlop={6}
                >
                  <Text style={styles.moreToggleLabel}>
                    {showMore
                      ? 'Hide address & emergency contact'
                      : 'Add address & emergency contact (optional)'}
                  </Text>
                </Pressable>

                {showMore ? (
                  <>
                    <View style={{ marginTop: spacing.md }}>
                      <AddressAutofillInput
                        accessToken={mapboxPublicToken}
                        value={{ line1: address, city, postalCode }}
                        onChange={(v) => {
                          setAddress(v.line1);
                          setCity(v.city);
                          setPostalCode(v.postalCode);
                        }}
                      />
                    </View>
                    <Input
                      label="Emergency contact name"
                      value={emergencyName}
                      onChangeText={setEmergencyName}
                      autoCapitalize="words"
                      containerStyle={{ marginTop: spacing.md }}
                    />
                    <View style={styles.pairRow}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Emergency phone"
                          value={emergencyPhone}
                          onChangeText={setEmergencyPhone}
                          keyboardType="phone-pad"
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Relationship"
                          value={emergencyRel}
                          onChangeText={setEmergencyRel}
                          placeholder="e.g. Spouse"
                        />
                      </View>
                    </View>
                  </>
                ) : null}

                <Input
                  label="Password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((p) => ({ ...p, password: '' }));
                  }}
                  secureTextEntry
                  secureToggle
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  error={errors['password']}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Pressable
                  onPress={() => {
                    setAcceptedPolicies((p) => !p);
                    setErrors((p) => ({ ...p, acceptedPolicies: '' }));
                  }}
                  style={styles.consentRow}
                >
                  <View
                    style={[
                      styles.consentBox,
                      acceptedPolicies && styles.consentBoxChecked,
                    ]}
                  >
                    {acceptedPolicies ? (
                      <Check color="#ffffff" size={12} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <Text style={styles.consentText}>
                    I accept the Terms of Service and Privacy Notice.
                  </Text>
                </Pressable>
                {errors['acceptedPolicies'] ? (
                  <Text style={styles.errorLine}>{errors['acceptedPolicies']}</Text>
                ) : null}

                <Button
                  label="Create account"
                  onPress={() => {
                    setServerError(null);
                    if (validate()) signup.mutate();
                  }}
                  loading={signup.isPending}
                  size="lg"
                  fullWidth
                  iconRight={<ArrowRight color="#ffffff" size={16} strokeWidth={2} />}
                  style={{ marginTop: spacing.lg }}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>Or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <OAuthButtonGroup
                  actionLabel="continue"
                  onResult={handleOAuthResult}
                  disabled={signup.isPending}
                  variant="icons"
                />
                <Text style={styles.ssoCaption}>
                  You&apos;ll pick your branch during onboarding.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Branch picker */}
      <Modal
        visible={picker === 'branch'}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Home branch</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(branches.data ?? []).map((b) => {
                const active = b.id === homeBranchId;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      setHomeBranchId(b.id);
                      setErrors((p) => ({ ...p, homeBranchId: '' }));
                      setPicker(null);
                    }}
                    style={[styles.sheetRow, active && styles.sheetRowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sheetRowLabel,
                          active && styles.sheetRowLabelActive,
                        ]}
                      >
                        {b.branchName}
                      </Text>
                      {b.regionName ? (
                        <Text style={styles.sheetRowMeta}>{b.regionName}</Text>
                      ) : null}
                    </View>
                    {active ? (
                      <Check color={c.primary} size={16} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Gender picker */}
      <Modal
        visible={picker === 'gender'}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Gender</Text>
            {GENDERS.map((g) => {
              const active = g === gender;
              return (
                <Pressable
                  key={g}
                  onPress={() => {
                    setGender(g);
                    setPicker(null);
                  }}
                  style={[styles.sheetRow, active && styles.sheetRowActive]}
                >
                  <Text
                    style={[
                      styles.sheetRowLabel,
                      active && styles.sheetRowLabelActive,
                    ]}
                  >
                    {g}
                  </Text>
                  {active ? (
                    <Check color={c.primary} size={16} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Fetch `/api/members/me` with an explicit bearer token. Used by the OAuth
 * flow after the browser hands back tokens but before the api-client's
 * token cache has been primed. Mirrors the login screen.
 */
async function fetchMemberProfile(accessToken: string): Promise<Member> {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/members/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'Sign-in token was not accepted.'
        : `Could not load your profile (HTTP ${res.status}).`,
    );
  }
  const body = (await res.json()) as { success?: boolean; data?: Member; message?: string };
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Could not load your profile.');
  }
  return body.data;
}

function PickerRow({
  value,
  placeholder,
  onPress,
  error,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={onPress}
        style={[styles.pickerField, error ? styles.pickerFieldError : null]}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
      </Pressable>
      {error ? <Text style={styles.errorLine}>{error}</Text> : null}
    </View>
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
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  brand: { alignItems: 'center', marginTop: spacing.md },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoGradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoK: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  card: {
    backgroundColor: c.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.screenTitle, color: c.ink },
  body: {
    ...typography.body,
    color: c.inkMuted,
    lineHeight: 20,
  },
  bodyStrong: { color: c.ink, fontWeight: '600' },
  successBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: c.danger,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.meta, color: c.danger },
  errorLine: { ...typography.meta, color: c.danger },
  moreToggle: { paddingVertical: spacing.sm, marginTop: spacing.xs },
  moreToggleLabel: { ...typography.body, color: c.primary, fontWeight: '600' },
  ssoCaption: {
    ...typography.meta,
    color: c.inkMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.divider,
  },
  dividerLabel: {
    ...typography.meta,
    color: c.inkFaded,
  },

  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
    marginBottom: spacing.xs,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: c.danger,
    borderWidth: 1.5,
  },
  pickerValue: { ...typography.body, color: c.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: c.inkFaded,
    flex: 1,
  },

  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  consentBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.inkVeryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentBoxChecked: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  consentText: {
    ...typography.body,
    color: c.ink,
    flex: 1,
    lineHeight: 20,
  },

  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.inkGhost,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: c.ink,
    marginBottom: spacing.xs,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  sheetRowActive: {
    backgroundColor: 'rgba(93,63,211,0.08)',
  },
  sheetRowLabel: {
    ...typography.body,
    color: c.ink,
  },
  sheetRowLabelActive: {
    color: c.primary,
    fontWeight: '600',
  },
  sheetRowMeta: {
    ...typography.meta,
    color: c.inkMuted,
  },
});
}


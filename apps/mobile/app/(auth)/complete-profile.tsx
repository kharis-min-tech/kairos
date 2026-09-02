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
import { ArrowRight, Check, ChevronRight } from 'lucide-react-native';
import {
  AddressAutofillInput,
  Button,
  Input,
  gradients,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { mapboxPublicToken } from '@/lib/config';
import { useAuthStore } from '@/store/auth';

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Grandparent',
  'Guardian',
  'Friend',
  'Other',
] as const;

/**
 * Phase 1.5 Better-Auth: SSO onboarding on mobile. The root guard drops the
 * user here whenever `mustCompleteProfile === true`. Collects the two
 * fields the OAuth callback couldn't (phone + home branch) plus T&C when
 * the caller hasn't accepted the current published version. On success
 * we route to /pending-approval and wait for admin approval.
 */
export default function CompleteProfileScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [homeBranchId, setHomeBranchId] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [picker, setPicker] = useState<'branch' | 'relationship' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Optional profile fields — surfaced so users can fill everything at
  // first sign-in rather than being nagged to come back later.
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [middleName, setMiddleName] = useState(
    (user as { middleName?: string | null } | null)?.middleName ?? '',
  );
  const [gender, setGender] = useState<'' | 'Male' | 'Female'>(
    ((user?.gender as 'Male' | 'Female' | null | undefined) ?? '') as '' | 'Male' | 'Female',
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    (user as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? '',
  );
  const [address, setAddress] = useState(
    (user as { address?: string | null } | null)?.address ?? '',
  );
  const [city, setCity] = useState(
    (user as { city?: string | null } | null)?.city ?? '',
  );
  const [postalCode, setPostalCode] = useState(
    (user as { postalCode?: string | null } | null)?.postalCode ?? '',
  );
  const [ecName, setEcName] = useState(
    (user as { emergencyContactName?: string | null } | null)
      ?.emergencyContactName ?? '',
  );
  const [ecPhone, setEcPhone] = useState(
    (user as { emergencyContactPhone?: string | null } | null)
      ?.emergencyContactPhone ?? '',
  );
  const [ecRel, setEcRel] = useState(
    (user as { emergencyContactRelationship?: string | null } | null)
      ?.emergencyContactRelationship ?? '',
  );

  const branches = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
  });

  // Live consent status — only require the T&C tick if the caller doesn't
  // already hold a current-version acceptance. Server double-checks.
  const consent = useQuery({
    queryKey: ['me', 'consent'],
    queryFn: async () => (await api.me.consent.list()).data ?? null,
  });
  const needsPolicyAccept = useMemo(() => {
    const s = consent.data?.statuses ?? [];
    return s.some(
      (row) =>
        (row.consentType === 'terms' || row.consentType === 'privacy') &&
        row.needsAccept,
    );
  }, [consent.data]);

  const branchLabel = useMemo(() => {
    const b = branches.data?.find((br) => br.id === homeBranchId);
    return b ? `${b.branchName}${b.regionName ? ` · ${b.regionName}` : ''}` : '';
  }, [branches.data, homeBranchId]);

  function validate() {
    const next: Record<string, string> = {};
    if (!phone.trim()) next['phone'] = 'Phone is required';
    if (!homeBranchId) next['homeBranchId'] = 'Please pick your home branch';
    if (needsPolicyAccept && !acceptedPolicies)
      next['acceptedPolicies'] = 'Required to continue';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.auth.completeOauthProfile({
        phone: phone.trim(),
        homeBranchId,
        acceptedPolicies: needsPolicyAccept ? true : undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        middleName: middleName.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        emergencyContactName: ecName.trim() || undefined,
        emergencyContactPhone: ecPhone.trim() || undefined,
        emergencyContactRelationship: ecRel.trim() || undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Could not save');
      return res.data!.member;
    },
    onSuccess: async (member) => {
      await updateUser({
        phone: member.phone,
        homeBranchId: member.homeBranchId,
        mustCompleteProfile: member.mustCompleteProfile,
        firstName: member.firstName,
        lastName: member.lastName,
        middleName: (member as { middleName?: string | null }).middleName ?? null,
        gender: member.gender,
        dateOfBirth: (member as { dateOfBirth?: string | null }).dateOfBirth ?? null,
        address: (member as { address?: string | null }).address ?? null,
        city: (member as { city?: string | null }).city ?? null,
        postalCode: (member as { postalCode?: string | null }).postalCode ?? null,
        emergencyContactName: (member as { emergencyContactName?: string | null }).emergencyContactName ?? null,
        emergencyContactPhone: (member as { emergencyContactPhone?: string | null }).emergencyContactPhone ?? null,
        emergencyContactRelationship: (member as { emergencyContactRelationship?: string | null }).emergencyContactRelationship ?? null,
      });
      router.replace('/(auth)/pending-approval' as never);
    },
    onError: (e: Error) => setServerError(e.message ?? 'Something went wrong'),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
            <Text style={styles.title}>Finish setting up</Text>
            <Text style={styles.body}>
              Welcome, {user?.firstName ?? 'friend'}! We got some details from
              your provider. Please fill in a couple of missing pieces before
              we send you on to an admin for approval.
            </Text>

            {serverError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            <Input
              label="Phone"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setErrors((p) => ({ ...p, phone: '' }));
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors['phone']}
              containerStyle={{ marginTop: spacing.md }}
            />

            <View style={{ marginTop: spacing.md, gap: 4 }}>
              <Text style={styles.fieldLabel}>Home branch</Text>
              <Pressable
                onPress={() => setPicker('branch')}
                style={[
                  styles.pickerField,
                  errors['homeBranchId'] ? styles.pickerFieldError : null,
                ]}
              >
                <Text
                  style={branchLabel ? styles.pickerValue : styles.pickerPlaceholder}
                >
                  {branchLabel ||
                    (branches.isLoading ? 'Loading branches…' : 'Please pick…')}
                </Text>
                <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
              </Pressable>
              {errors['homeBranchId'] ? (
                <Text style={styles.errorLine}>{errors['homeBranchId']}</Text>
              ) : null}
            </View>

            {needsPolicyAccept ? (
              <>
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
                  <Text style={styles.errorLine}>
                    {errors['acceptedPolicies']}
                  </Text>
                ) : null}
              </>
            ) : null}

            {/* ── About you (optional) ────────────────── */}
            <View style={styles.optionalSection}>
              <View style={styles.optionalHeader}>
                <Text style={styles.optionalTitle}>About you</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <Input
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                containerStyle={{ marginTop: spacing.sm }}
              />
              <Input
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                containerStyle={{ marginTop: spacing.sm }}
              />
              <Input
                label="Middle name"
                value={middleName}
                onChangeText={setMiddleName}
                autoCapitalize="words"
                containerStyle={{ marginTop: spacing.sm }}
              />

              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {(['Male', 'Female'] as const).map((g) => {
                    const active = gender === g;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => setGender(active ? '' : g)}
                        style={[
                          styles.genderChip,
                          active && styles.genderChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderChipLabel,
                            active && styles.genderChipLabelActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Input
                label="Date of birth (YYYY-MM-DD)"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="1990-01-15"
                containerStyle={{ marginTop: spacing.sm }}
              />
            </View>

            {/* ── Address (optional) ────────────────── */}
            <View style={styles.optionalSection}>
              <View style={styles.optionalHeader}>
                <Text style={styles.optionalTitle}>Address</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <View style={{ marginTop: spacing.sm }}>
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
            </View>

            {/* ── Emergency contact (optional) ────────────────── */}
            <View style={styles.optionalSection}>
              <View style={styles.optionalHeader}>
                <Text style={styles.optionalTitle}>Emergency contact</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <Input
                label="Name"
                value={ecName}
                onChangeText={setEcName}
                autoCapitalize="words"
                containerStyle={{ marginTop: spacing.sm }}
              />
              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                <Text style={styles.fieldLabel}>Relationship</Text>
                <Pressable
                  onPress={() => setPicker('relationship')}
                  style={styles.pickerField}
                >
                  <Text
                    style={ecRel ? styles.pickerValue : styles.pickerPlaceholder}
                  >
                    {ecRel || 'Select relationship…'}
                  </Text>
                  <ChevronRight color={c.inkFaded} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              <Input
                label="Phone"
                value={ecPhone}
                onChangeText={setEcPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={{ marginTop: spacing.sm }}
              />
            </View>

            <Button
              label="Save & continue"
              onPress={() => {
                setServerError(null);
                if (validate()) submit.mutate();
              }}
              loading={submit.isPending}
              size="lg"
              fullWidth
              iconRight={<ArrowRight color="#ffffff" size={16} strokeWidth={2} />}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

      <Modal
        visible={picker === 'relationship'}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Relationship</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {RELATIONSHIP_OPTIONS.map((r) => {
                const active = r === ecRel;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setEcRel(r);
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
                        {r}
                      </Text>
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
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    brand: { alignItems: 'center', marginTop: spacing.md },
    logoTile: {
      width: 56,
      height: 56,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoGradientFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    logoK: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: { ...typography.screenTitle, color: c.ink },
    body: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    fieldLabel: {
      ...typography.meta,
      color: c.inkMuted,
      fontWeight: '600',
    },
    pickerField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radii.md,
      backgroundColor: c.card,
    },
    pickerFieldError: { borderColor: c.danger },
    pickerValue: { ...typography.body, color: c.ink },
    pickerPlaceholder: { ...typography.body, color: c.inkFaded },
    errorLine: {
      ...typography.meta,
      color: c.danger,
      marginTop: 4,
    },
    errorBanner: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: 'rgba(239,68,68,0.10)',
    },
    errorText: { ...typography.meta, color: c.danger },
    optionalSection: {
      marginTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: spacing.md,
    },
    optionalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionalTitle: {
      ...typography.body,
      color: c.ink,
      fontWeight: '600',
    },
    optionalBadge: {
      ...typography.meta,
      color: c.inkFaded,
      textTransform: 'uppercase',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    genderRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    genderChip: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radii.md,
      backgroundColor: c.card,
    },
    genderChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(93,63,211,0.08)',
    },
    genderChipLabel: {
      ...typography.body,
      color: c.ink,
    },
    genderChipLabelActive: {
      color: c.primary,
      fontWeight: '600',
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    consentBox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
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
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.divider,
      marginBottom: spacing.sm,
    },
    sheetTitle: {
      ...typography.cardTitle,
      color: c.ink,
      marginBottom: spacing.sm,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    sheetRowActive: { backgroundColor: 'rgba(93,63,211,0.06)' },
    sheetRowLabel: { ...typography.body, color: c.ink },
    sheetRowLabelActive: { color: c.primary, fontWeight: '600' },
    sheetRowMeta: { ...typography.meta, color: c.inkMuted, marginTop: 2 },
  });
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/auth-store';
import { useMyProfile, useUpdateMember, useSwitchActiveBranch } from '@/hooks/use-members';
import { useBranches } from '@/hooks/use-branches';
import { useMyConsentStatuses } from '@/hooks/use-consent';
import { useCompleteOauthProfile } from '@/hooks/use-auth';
import { DateSelect } from '@/components/date-select';
import { ImageUpload } from '@/components/image-upload';
import { AddressAutofillGroup, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, CustomSelect } from '@kairos/ui';
import type { UpdateMemberRequest } from '@kairos/types';
import {
  useFriendlyRoleLines,
  WhereIBelongCard,
  MyCommunityCard,
  MyLeadershipCard,
} from './_components/profile-sections';
import { useTranslation } from 'react-i18next';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}

export default function ProfilePage() {  const { t } = useTranslation(['settings', 'common']);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, setTokens } = useAuthStore();
  const { data: member, isLoading } = useMyProfile();
  const updateMember = useUpdateMember();
  const switchBranch = useSwitchActiveBranch();
  const completeOnboarding = useCompleteOauthProfile();
  const { data: consentData } = useMyConsentStatuses();

  // Phase 1.5 SSO onboarding — the dashboard-layout guard drops the user
  // here with ?onboarding=1 whenever `mustCompleteProfile === true`. We
  // force-open the edit form, swap the CTA label, force a fresh branch
  // pick, and enforce phone + T&C at submit.
  const isOnboarding =
    searchParams.get('onboarding') === '1' ||
    (member as { mustCompleteProfile?: boolean } | undefined)?.mustCompleteProfile === true;

  const [isEditing, setIsEditing] = useState(isOnboarding);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [onboardingBranchId, setOnboardingBranchId] = useState<string>('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  useEffect(() => {
    if (isOnboarding) setIsEditing(true);
  }, [isOnboarding]);

  // Only require the T&C checkbox when the caller doesn't already hold a
  // valid consent record at the current published version. Mirrors the
  // server's own idempotent check.
  const needsPolicyAccept = (consentData?.statuses ?? []).some(
    (s) => (s.consentType === 'terms' || s.consentType === 'privacy') && s.needsAccept,
  );

  const profile = member ?? user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateMemberRequest>({
    defaultValues: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      middleName: (profile as { middleName?: string | null })?.middleName ?? '',
      phone: profile?.phone ?? '',
      gender: profile?.gender as 'Male' | 'Female' | undefined,
      dateOfBirth: (profile as { dateOfBirth?: string | null })?.dateOfBirth ?? '',
      address: (profile as { address?: string | null })?.address ?? '',
      city: (profile as { city?: string | null })?.city ?? '',
      postalCode: (profile as { postalCode?: string | null })?.postalCode ?? '',
      secondaryAddress: (profile as { secondaryAddress?: string | null })?.secondaryAddress ?? '',
      secondaryCity: (profile as { secondaryCity?: string | null })?.secondaryCity ?? '',
      secondaryPostalCode: (profile as { secondaryPostalCode?: string | null })?.secondaryPostalCode ?? '',
      emergencyContactName: (profile as { emergencyContactName?: string | null })?.emergencyContactName ?? '',
      emergencyContactRelationship: (profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship ?? '',
      emergencyContactPhone: (profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone ?? '',
    },
  });

  const dobValue = watch('dateOfBirth') ?? '';

  const fullProfile = profile as {
    id?: string; firstName?: string; lastName?: string; middleName?: string | null;
    email?: string; phone?: string | null; gender?: string | null; dateOfBirth?: string | null;
    address?: string | null; city?: string | null; postalCode?: string | null;
    secondaryBranchId?: string | null; isAtSecondaryBranch?: boolean;
    secondaryAddress?: string | null; secondaryCity?: string | null; secondaryPostalCode?: string | null;
    emergencyContactName?: string | null; emergencyContactRelationship?: string | null; emergencyContactPhone?: string | null;
    systemRole?: string; photoUrl?: string | null;
    homeBranchId?: string | null;
  };

  // Hooks for the friendly role / branch / community sections — MUST be called
  // unconditionally, BEFORE any early return below, to satisfy rules-of-hooks.
  const memberId = fullProfile?.id ?? null;
  const profileSystemRole = profile?.systemRole ?? null;
  const homeBranchId = fullProfile?.homeBranchId ?? null;
  const roleLines = useFriendlyRoleLines({
    systemRole: profileSystemRole,
    memberId,
    homeBranchId,
  });
  const { data: branchList } = useBranches();

  function openEditMode() {
    reset({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      middleName: (profile as { middleName?: string | null })?.middleName ?? '',
      phone: profile?.phone ?? '',
      gender: profile?.gender as 'Male' | 'Female' | undefined,
      dateOfBirth: (profile as { dateOfBirth?: string | null })?.dateOfBirth ?? '',
      address: (profile as { address?: string | null })?.address ?? '',
      city: (profile as { city?: string | null })?.city ?? '',
      postalCode: (profile as { postalCode?: string | null })?.postalCode ?? '',
      secondaryAddress: (profile as { secondaryAddress?: string | null })?.secondaryAddress ?? '',
      secondaryCity: (profile as { secondaryCity?: string | null })?.secondaryCity ?? '',
      secondaryPostalCode: (profile as { secondaryPostalCode?: string | null })?.secondaryPostalCode ?? '',
      emergencyContactName: (profile as { emergencyContactName?: string | null })?.emergencyContactName ?? '',
      emergencyContactRelationship: (profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship ?? '',
      emergencyContactPhone: (profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone ?? '',
    });
    setPhotoPreview(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setPhotoPreview(null);
    setSaveError(null);
    setSwitchError(null);
    setIsEditing(false);
  }

  function handlePhotoUploaded(deliveryUrl: string) {
    setPhotoPreview(deliveryUrl);
    setValue('photoUrl', deliveryUrl);
  }

  async function onSwitchBranch() {
    const memberId = fullProfile?.id;
    if (!memberId) return;
    setSwitchError(null);
    try {
      const result = await switchBranch.mutateAsync(memberId);
      setTokens(result.tokens);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Failed to switch branch');
    }
  }

  async function onSubmit(data: UpdateMemberRequest) {
    const memberId = profile?.id;
    if (!memberId) return;
    setSaveError(null);

    // Onboarding submit — route through the dedicated endpoint so the
    // server can validate the mandatories, insert consent records, and
    // clear mustCompleteProfile atomically.
    if (isOnboarding) {
      const phone = (data.phone ?? '').trim();
      if (!phone) {
        setSaveError('Phone is required to continue.');
        return;
      }
      if (!onboardingBranchId) {
        setSaveError('Please pick your home branch.');
        return;
      }
      if (needsPolicyAccept && !acceptedPolicies) {
        setSaveError('Please accept the Terms & Conditions and Privacy Notice to continue.');
        return;
      }
      try {
        await completeOnboarding.mutateAsync({
          phone,
          homeBranchId: onboardingBranchId,
          acceptedPolicies: needsPolicyAccept ? true : undefined,
        });
        router.replace('/pending-approval');
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : 'Failed to save. Please try again.',
        );
      }
      return;
    }

    const cleaned: UpdateMemberRequest = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== '' && v !== null && v !== undefined) {
        (cleaned as Record<string, unknown>)[k] = v;
      }
    }

    try {
      const updated = await updateMember.mutateAsync({ id: memberId, data: cleaned });
      setUser(updated as never);
      setIsEditing(false);
      setPhotoPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes. Please try again.';
      setSaveError(message);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <Card className="animate-pulse">
          <CardContent className="space-y-4 pt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarUrl = photoPreview ?? (profile as { photoUrl?: string | null })?.photoUrl;
  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-start justify-between pb-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={t('settings:profile')}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5D3FD3]/15 text-2xl font-bold text-[#5D3FD3] dark:text-[#a78bfa]">
                {initials}
              </div>
            )}
            {isEditing && (
              <ImageUpload
                variant="avatar"
                purpose="profile-photo"
                onUploaded={handlePhotoUploaded}
                onError={(msg) => setSaveError(msg)}
              />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {profile?.firstName} {profile?.lastName}
            </h1>
            <div className="mt-0.5 space-y-0.5">
              {roleLines.map((line, i) => (
                <p key={i} className="text-sm text-muted-foreground">{line}</p>
              ))}
            </div>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Link href="/profile/settings">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >{t('settings:settings')}</Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openEditMode}
              >{t('settings:editProfile')}</Button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isOnboarding && (
            <div className="rounded-lg border-l-4 border-[#5D3FD3] bg-[#5D3FD3]/5 p-4">
              <p className="text-sm font-semibold text-[#5D3FD3]">{t('settings:welcomeLetSFinishSettingUp')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('settings:weGotSomeDetailsFromYour')}</p>
            </div>
          )}

          {isOnboarding && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('settings:homeBranch')}<span className="text-destructive">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label htmlFor="homeBranchId">{t('settings:whichBranchDoYouAttend')}</Label>
                  <CustomSelect
                    id="homeBranchId"
                    value={onboardingBranchId}
                    onValueChange={(v) => setOnboardingBranchId(v)}
                    placeholder={t('settings:pleasePick')}
                    options={(branchList ?? []).map((b) => ({
                      value: b.id,
                      label: b.branchName,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings:yourProviderDidnTTellUs')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:personalInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t('settings:firstName')}</Label>
                  <Input id="firstName" {...register('firstName', { required: 'Required' })} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t('settings:lastName')}</Label>
                  <Input id="lastName" {...register('lastName', { required: 'Required' })} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="middleName">{t('settings:middleName')}</Label>
                  <Input id="middleName" {...register('middleName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone {isOnboarding && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="phone"
                    {...register('phone', isOnboarding ? { required: 'Phone is required' } : {})}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('settings:gender')}</Label>
                  <CustomSelect
                    value={watch('gender') ?? ''}
                    onValueChange={(v) => setValue('gender', v === '' ? undefined : (v as 'Male' | 'Female'))}
                    placeholder={t('settings:selectGender')}
                    options={[{ value: 'Male', label: t('settings:male') }, { value: 'Female', label: t('settings:female') }]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('settings:dateOfBirth')}</Label>
                  <DateSelect
                    value={dobValue}
                    onChange={(val) => setValue('dateOfBirth', val)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:address')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AddressAutofillGroup
                accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                labels={{ line1: 'Street Address' }}
                value={{
                  line1: watch('address') ?? '',
                  city: watch('city') ?? '',
                  postalCode: watch('postalCode') ?? '',
                }}
                onChange={(v) => {
                  setValue('address', v.line1);
                  setValue('city', v.city);
                  setValue('postalCode', v.postalCode);
                }}
              />
            </CardContent>
          </Card>

          {fullProfile?.secondaryBranchId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('settings:secondaryAddress')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AddressAutofillGroup
                  accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  labels={{ line1: 'Street Address' }}
                  value={{
                    line1: watch('secondaryAddress') ?? '',
                    city: watch('secondaryCity') ?? '',
                    postalCode: watch('secondaryPostalCode') ?? '',
                  }}
                  onChange={(v) => {
                    setValue('secondaryAddress', v.line1);
                    setValue('secondaryCity', v.city);
                    setValue('secondaryPostalCode', v.postalCode);
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:emergencyContact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactName">{t('settings:contactName')}</Label>
                  <Input id="emergencyContactName" {...register('emergencyContactName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactRelationship">{t('settings:relationship')}</Label>
                  <CustomSelect
                    id="emergencyContactRelationship"
                    value={watch('emergencyContactRelationship') ?? ''}
                    onValueChange={(v) => setValue('emergencyContactRelationship', v)}
                    placeholder={t('settings:selectRelationship')}
                    options={['Spouse','Partner','Parent','Child','Sibling','Grandparent','Guardian','Friend','Other'].map((r) => ({ value: r, label: r }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactPhone">{t('settings:contactPhone')}</Label>
                  <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {isOnboarding && needsPolicyAccept && (
            <Card>
              <CardContent className="pt-6">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies}
                    onChange={(e) => setAcceptedPolicies(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-muted-foreground/30 accent-[#5D3FD3]"
                  />
                  <span>
                    I accept the{' '}
                    <Link
                      href="/legal/terms"
                      target="_blank"
                      className="font-semibold text-[#5D3FD3] underline underline-offset-2 hover:opacity-80"
                    >
                      Terms &amp; Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/legal/privacy"
                      target="_blank"
                      className="font-semibold text-[#5D3FD3] underline underline-offset-2 hover:opacity-80"
                    >{t('settings:privacyNotice')}</Link>
                    .
                  </span>
                </label>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            {saveError && (
              <p className="w-full text-sm text-destructive">{saveError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="success"
              disabled={isSubmitting || completeOnboarding.isPending}
            >
              {isOnboarding
                ? completeOnboarding.isPending
                  ? 'Saving…'
                  : 'Save & continue'
                : isSubmitting
                  ? 'Saving…'
                  : 'Save Changes'}
            </Button>
            {!isOnboarding && (
              <Button type="button" variant="outline" onClick={cancelEdit}>{t('settings:cancel')}</Button>
            )}
          </div>
        </form>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:personalInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label={t('settings:firstName')} value={profile?.firstName} />
                <Field label={t('settings:lastName')} value={profile?.lastName} />
                <Field label={t('settings:middleName')} value={(profile as { middleName?: string | null })?.middleName} />
                <Field label={t('settings:email')} value={profile?.email} />
                <Field label={t('settings:phone')} value={profile?.phone} />
                <Field label={t('settings:gender')} value={profile?.gender} />
                <Field label={t('settings:dateOfBirth')} value={(profile as { dateOfBirth?: string | null })?.dateOfBirth} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:address')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label={t('settings:streetAddress')} value={(profile as { address?: string | null })?.address} />
                <Field label={t('settings:city')} value={(profile as { city?: string | null })?.city} />
                <Field label={t('settings:postalCode')} value={(profile as { postalCode?: string | null })?.postalCode} />
              </dl>
            </CardContent>
          </Card>

          <WhereIBelongCard
            homeBranchId={homeBranchId}
            secondaryBranchId={fullProfile?.secondaryBranchId ?? null}
            isAtSecondaryBranch={fullProfile?.isAtSecondaryBranch}
            onSwitchBranch={fullProfile?.secondaryBranchId ? onSwitchBranch : undefined}
            switchPending={switchBranch.isPending}
            switchError={switchError}
          />

          <MyCommunityCard memberId={memberId} />

          <MyLeadershipCard
            memberId={memberId}
            showAdminRole={profileSystemRole === 'admin'}
          />

          {fullProfile?.secondaryBranchId && (fullProfile.secondaryAddress || fullProfile.secondaryCity || fullProfile.secondaryPostalCode) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('settings:secondaryAddress')}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('settings:streetAddress')} value={fullProfile.secondaryAddress} />
                  <Field label={t('settings:city')} value={fullProfile.secondaryCity} />
                  <Field label={t('settings:postalCode')} value={fullProfile.secondaryPostalCode} />
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('settings:emergencyContact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label={t('settings:contactName')} value={(profile as { emergencyContactName?: string | null })?.emergencyContactName} />
                <Field label={t('settings:relationship')} value={(profile as { emergencyContactRelationship?: string | null })?.emergencyContactRelationship} />
                <Field label={t('settings:contactPhone')} value={(profile as { emergencyContactPhone?: string | null })?.emergencyContactPhone} />
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

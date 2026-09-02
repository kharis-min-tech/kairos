'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyConsentStatuses } from '@/hooks/use-consent';
import { useCompleteOauthProfile } from '@/hooks/use-auth';
import { AddressAutofillGroup, Button, CustomSelect, Input, Label } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { KharisCardHeader } from '../kharis-logo';

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
 * Phase 1.5 Better-Auth: SSO onboarding on web. Lives in the (auth) chrome
 * (not the dashboard) so the user isn't misled by a clickable sidebar that
 * just bounces them back. Transitions to /pending-approval on submit stay
 * inside the same visual container.
 *
 * Field set: phone + home branch + T&C are gates. Everything else is
 * surfaced as OPTIONAL — users are far more likely to complete their profile
 * at first sign-in than to come back later from the profile edit page, so
 * we take whatever they give us and save it.
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const completeOnboarding = useCompleteOauthProfile();

  // Personal (pre-fill from what SSO gave us).
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [middleName, setMiddleName] = useState(
    (user as { middleName?: string | null } | null)?.middleName ?? '',
  );
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [gender, setGender] = useState<'' | 'Male' | 'Female'>(
    ((user?.gender as 'Male' | 'Female' | null | undefined) ?? '') as '' | 'Male' | 'Female',
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    (user as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? '',
  );

  // Home branch — required, must come from the public list (defensive).
  const [homeBranchId, setHomeBranchId] = useState('');

  // Address — optional.
  const [address, setAddress] = useState(
    (user as { address?: string | null } | null)?.address ?? '',
  );
  const [city, setCity] = useState(
    (user as { city?: string | null } | null)?.city ?? '',
  );
  const [postalCode, setPostalCode] = useState(
    (user as { postalCode?: string | null } | null)?.postalCode ?? '',
  );

  // Emergency contact — optional.
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

  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Public branches — unauthenticated endpoint, returns every active branch
  // regardless of the caller's grants. Auth-scoped `useBranches()` would
  // filter to just the seeded default.
  const branches = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
  });

  // Only require the T&C tick if the caller doesn't already hold a
  // current-version acceptance. The server double-checks.
  const { data: consentData } = useMyConsentStatuses();
  const needsPolicyAccept = (consentData?.statuses ?? []).some(
    (s) =>
      (s.consentType === 'terms' || s.consentType === 'privacy') && s.needsAccept,
  );

  // Defensive: if the user somehow lands here without needing onboarding,
  // send them where they actually belong.
  const mustCompleteProfile =
    (user as { mustCompleteProfile?: boolean } | null)?.mustCompleteProfile ===
    true;
  useEffect(() => {
    if (!user) return;
    if (!mustCompleteProfile) {
      if (user.approvalStatus !== 'approved') {
        router.replace('/pending-approval');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, mustCompleteProfile, router]);

  const submit = useMutation({
    mutationFn: async () => {
      const trimmedPhone = phone.trim();
      let ok = true;
      if (!trimmedPhone) {
        setPhoneError('Phone is required');
        ok = false;
      } else {
        setPhoneError(null);
      }
      if (!homeBranchId) {
        setBranchError('Please pick your home branch');
        ok = false;
      } else {
        setBranchError(null);
      }
      if (needsPolicyAccept && !acceptedPolicies) {
        setPolicyError(
          'Please accept the Terms & Conditions and Privacy Notice',
        );
        ok = false;
      } else {
        setPolicyError(null);
      }
      if (!ok) throw new Error('validation');

      await completeOnboarding.mutateAsync({
        phone: trimmedPhone,
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
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'consent'] });
      router.replace('/pending-approval');
    },
    onError: (err: Error) => {
      if (err.message === 'validation') return;
      setServerError(err.message ?? 'Something went wrong. Please try again.');
    },
  });

  function handleSignOut() {
    logout();
    queryClient.clear();
    router.replace('/login');
  }

  const busy = submit.isPending || completeOnboarding.isPending;

  return (
    <>
      <KharisCardHeader
        heading="Finish setting up"
        subtitle={`Welcome${
          user?.firstName ? `, ${user.firstName}` : ''
        }! Please fill in the required fields. The rest are optional but useful for admins to know who you are.`}
      />

      <div className="rounded-2xl bg-card p-6 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#5D3FD3]/20 bg-[#5D3FD3]/5 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5D3FD3]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-[#5D3FD3]">
            You&apos;ll be able to access the app once you complete this step
            and an admin approves your account.
          </p>
        </div>

        {serverError ? (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setServerError(null);
            submit.mutate();
          }}
          className="space-y-6"
        >
          {/* ── Required section ───────────────────────────── */}
          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="homeBranchId">
                Home branch <span className="text-destructive">*</span>
              </Label>
              <CustomSelect
                id="homeBranchId"
                value={homeBranchId}
                onValueChange={(v) => {
                  setHomeBranchId(v);
                  setBranchError(null);
                }}
                placeholder={
                  branches.isLoading ? 'Loading branches…' : 'Please pick…'
                }
                options={(branches.data ?? []).map((b) => ({
                  value: b.id,
                  label: b.regionName
                    ? `${b.branchName} · ${b.regionName}`
                    : b.branchName,
                }))}
              />
              {branchError ? (
                <p className="text-xs text-destructive">{branchError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your provider didn&apos;t tell us this, so please choose the
                  branch you attend.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(null);
                }}
                placeholder="+44 7…"
              />
              {phoneError ? (
                <p className="text-xs text-destructive">{phoneError}</p>
              ) : null}
            </div>
          </section>

          {/* ── Personal (optional) ─────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border/60 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                About you
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="middleName">Middle name</Label>
                <Input
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  autoComplete="additional-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <CustomSelect
                  value={gender}
                  onValueChange={(v) =>
                    setGender((v || '') as '' | 'Male' | 'Female')
                  }
                  placeholder="Select gender"
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <DateSelect value={dateOfBirth} onChange={setDateOfBirth} />
              </div>
            </div>
          </section>

          {/* ── Address (optional) ──────────────────────────── */}
          <section className="space-y-4 rounded-lg border border-border/60 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">Address</h2>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            </div>

            <AddressAutofillGroup
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              value={{ line1: address, city, postalCode }}
              onChange={(v) => {
                setAddress(v.line1);
                setCity(v.city);
                setPostalCode(v.postalCode);
              }}
            />
          </section>

          {/* ── Emergency contact (optional) ────────────────── */}
          <section className="space-y-4 rounded-lg border border-border/60 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Emergency contact
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ecName">Name</Label>
                <Input
                  id="ecName"
                  value={ecName}
                  onChange={(e) => setEcName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecRel">Relationship</Label>
                <CustomSelect
                  id="ecRel"
                  value={ecRel}
                  onValueChange={setEcRel}
                  placeholder="Select relationship…"
                  options={RELATIONSHIP_OPTIONS.map((r) => ({
                    value: r,
                    label: r,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecPhone">Phone</Label>
                <Input
                  id="ecPhone"
                  type="tel"
                  inputMode="tel"
                  value={ecPhone}
                  onChange={(e) => setEcPhone(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ── T&C ─────────────────────────────────────────── */}
          {needsPolicyAccept ? (
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 rounded-lg border border-muted-foreground/15 p-3">
                <input
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(e) => {
                    setAcceptedPolicies(e.target.checked);
                    setPolicyError(null);
                  }}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#5D3FD3]"
                />
                <span className="text-sm text-muted-foreground">
                  I accept the{' '}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#5D3FD3] hover:opacity-80"
                  >
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#5D3FD3] hover:opacity-80"
                  >
                    Privacy Notice
                  </a>
                  . <span className="text-destructive">*</span>
                </span>
              </label>
              {policyError ? (
                <p className="text-xs text-destructive">{policyError}</p>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save & continue'}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

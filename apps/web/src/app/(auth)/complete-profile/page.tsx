'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyConsentStatuses } from '@/hooks/use-consent';
import { useCompleteOauthProfile } from '@/hooks/use-auth';
import { Button, CustomSelect, Input, Label } from '@kairos/ui';
import { KharisCardHeader } from '../kharis-logo';

/**
 * Phase 1.5 Better-Auth: SSO onboarding on web. Lives in the (auth) chrome
 * (not the dashboard) so the user isn't misled by a clickable sidebar that
 * just bounces them back. Transitions to /pending-approval on submit stay
 * inside the same visual container.
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const completeOnboarding = useCompleteOauthProfile();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [homeBranchId, setHomeBranchId] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Public branches — unauthenticated endpoint, returns every active branch
  // regardless of the caller's grants. Auth-scoped `useBranches()` would
  // filter to just the seeded default, which is exactly the bug the user
  // reported.
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
  // send them where they actually belong. Prevents a bookmark to
  // /complete-profile from showing a stale form.
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
      const trimmed = phone.trim();
      let ok = true;
      if (!trimmed) {
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
        phone: trimmed,
        homeBranchId,
        acceptedPolicies: needsPolicyAccept ? true : undefined,
      });
    },
    onSuccess: async () => {
      // The mutation already pushed the returned member into the auth store,
      // which flips mustCompleteProfile → false. Invalidate consent so the
      // next screen sees the fresh acceptance.
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

  return (
    <>
      <KharisCardHeader
        heading="Finish setting up"
        subtitle={`Welcome${
          user?.firstName ? `, ${user.firstName}` : ''
        }! We got some details from your provider — please fill in the missing pieces before an admin can review your account.`}
      />

      <div className="rounded-2xl bg-card p-6 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] sm:p-8">
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
          className="space-y-4"
        >
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
                Your provider didn&apos;t tell us this — please choose the
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
                  .
                </span>
              </label>
              {policyError ? (
                <p className="text-xs text-destructive">{policyError}</p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submit.isPending || completeOnboarding.isPending}
          >
            {submit.isPending || completeOnboarding.isPending
              ? 'Saving…'
              : 'Save & continue'}
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

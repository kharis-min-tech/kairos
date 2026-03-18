'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useVerifyEmail } from '@/hooks/use-auth';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const verifyMutation = useVerifyEmail();
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  async function handleVerify() {
    if (!memberId) return;
    setError(null);
    try {
      await verifyMutation.mutateAsync(memberId);
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription>
            Your email has been verified. Your account is now pending admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/pending-approval')}>
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          Click the button below to verify your email address.
          In production, you&apos;ll receive a verification link via email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!memberId && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            No verification token found. Please check your email for the verification link.
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleVerify}
          disabled={!memberId || verifyMutation.isPending}
        >
          {verifyMutation.isPending ? 'Verifying...' : 'Verify Email'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

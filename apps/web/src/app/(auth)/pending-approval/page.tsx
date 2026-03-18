import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import Link from 'next/link';

export default function PendingApprovalPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Pending Approval</CardTitle>
        <CardDescription>
          Your email has been verified. A church administrator will review and approve your account shortly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-primary/10 p-4 text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ll receive a notification once your account is approved.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Already approved?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

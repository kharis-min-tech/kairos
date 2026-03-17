import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Access Denied</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        You don&apos;t have permission to access this page. Contact your church
        administrator if you believe this is an error.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

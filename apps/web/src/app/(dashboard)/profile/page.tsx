'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useMyProfile } from '@/hooks/use-members';
import { Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: member, isLoading } = useMyProfile();

  const profile = member ?? user;

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" value={profile?.firstName} />
            <Field label="Last Name" value={profile?.lastName} />
            <Field label="Email" value={profile?.email} />
            <Field label="Phone" value={profile?.phone} />
            <Field label="Gender" value={profile?.gender} />
            <Field label="Role" value={profile?.systemRole} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

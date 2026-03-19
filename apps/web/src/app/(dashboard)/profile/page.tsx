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

  const initials = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <div className="space-y-6">
      {/* Purple gradient header with avatar */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-8 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="mt-0.5 text-sm capitalize text-purple-200">{profile?.systemRole}</p>
          </div>
        </div>
      </div>

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

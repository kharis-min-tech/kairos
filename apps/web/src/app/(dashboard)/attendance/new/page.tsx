'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useCreateService } from '@/hooks/use-attendance';
import { useAuthStore } from '@/lib/auth-store';
import { CreateServiceForm } from '../_components/create-service-form';
import type { CreateServiceRequest } from '@kairos/types';

const RECORDING_ROLES = ['admin', 'pastor', 'leader'];

export default function NewServicePage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const user = useAuthStore((s) => s.user);
  const createService = useCreateService();
  const [error, setError] = useState<string | null>(null);

  // Second-level guard: only recording roles may create a service.
  useEffect(() => {
    if (activeRole && !RECORDING_ROLES.includes(activeRole)) {
      router.replace('/dashboard');
    }
  }, [activeRole, router]);

  // admin/pastor may target any branch; leaders are pinned to their own.
  const canPickBranch = user?.systemRole === 'admin' || user?.systemRole === 'pastor';

  async function handleSubmit(data: CreateServiceRequest) {
    setError(null);
    try {
      const created = await createService.mutateAsync(data);
      router.push(`/attendance/${created.id}`);
      return created;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create the service.';
      setError(message);
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to services
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Record a service</h1>
        <p className="text-sm text-muted-foreground">
          Set up the service details, then check in attendees.
        </p>
      </div>

      <CreateServiceForm onSubmit={handleSubmit} submitError={error} canPickBranch={canPickBranch} />
    </div>
  );
}

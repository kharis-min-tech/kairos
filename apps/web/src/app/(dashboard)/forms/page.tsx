'use client';

import Link from 'next/link';
import { Card, CardContent } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import {
  Flame,
  Droplets,
  MessageSquareQuote,
  Baby,
  HandHeart,
  UserPlus,
  ClipboardList,
  Archive,
  ChevronRight,
} from 'lucide-react';
import { FORM_TYPES, FORM_META } from './_lib/form-meta';
import type { FormType } from '@kairos/types';

const FORM_ICONS: Record<FormType, React.ReactNode> = {
  first_time_visitor: <UserPlus className="h-6 w-6" />,
  altar_call: <Flame className="h-6 w-6" />,
  baptism: <Droplets className="h-6 w-6" />,
  testimony: <MessageSquareQuote className="h-6 w-6" />,
  baby_naming: <Baby className="h-6 w-6" />,
  baby_dedication: <HandHeart className="h-6 w-6" />,
};

const LEADER_ROLES = ['leader', 'pastor', 'admin'];

export default function FormsLandingPage() {
  const activeRole = useAuthStore((s) => s.activeRole);
  const isLeaderPlus = !!activeRole && LEADER_ROLES.includes(activeRole);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Forms &amp; Data Capture</h1>
        <p className="mt-1 text-muted-foreground">
          Capture altar-call responses, baptism and dedication requests, and testimonies.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORM_TYPES.map((type) => {
          const meta = FORM_META[type];
          return (
            <Link key={type} href={`/forms/${type}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-ambient">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                    {FORM_ICONS[type]}
                  </span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">{meta.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#5D3FD3] group-hover:gap-2 transition-all">
                    Open form <ChevronRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {isLeaderPlus ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Administration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/forms/submissions" className="group">
              <Card className="transition-shadow hover:shadow-ambient">
                <CardContent className="flex items-center gap-4 py-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Submissions</h3>
                    <p className="text-sm text-muted-foreground">Review, triage and export form submissions.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/forms/prospects" className="group">
              <Card className="transition-shadow hover:shadow-ambient">
                <CardContent className="flex items-center gap-4 py-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-[#5D3FD3]">
                    <Archive className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Dormant prospects</h3>
                    <p className="text-sm text-muted-foreground">Bulk-archive stale form-created contact shells.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
